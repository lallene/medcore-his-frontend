/**
 * LOT 23G.2 — deterministic scheduling E2E fixtures.
 * Creates dedicated QA patients per scenario and cleans only owned rows.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
export const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
export const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
export const receptionEmail = 'demo.accueil@medcore.local';
export const doctorEmail = 'demo.generaliste@medcore.local';
export const cashierEmail = 'demo.caissiere@medcore.local';

export const AGENDA_TZ = 'Europe/Paris';

export type QaPatient = { id: number; nom: string; codePatient: string; prenoms?: string };

export type Slot = {
	startAt: string;
	endAt: string;
	practitionerId: number;
	durationMinutes: number;
};

export async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	return (body.data?.token ?? body.token) as string;
}

export function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

/** Unique CLEAR patient owned by this scenario (API-created; searchable by nom). */
export async function createQaPatient(
	request: APIRequestContext,
	token: string,
	tag: string
): Promise<QaPatient> {
	const nom = `QAAGENDA-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Fixture',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	expect([200, 201].includes(response.status()), await response.text()).toBeTruthy();
	const body = await response.json();
	const data = body.data ?? body;
	expect(data?.id, `create patient ${tag}`).toBeTruthy();
	return {
		id: data.id as number,
		nom: data.nom as string,
		codePatient: data.codePatient as string,
		prenoms: data.prenoms as string
	};
}

export async function patientByCode(request: APIRequestContext, token: string, code: string) {
	const response = await request.get(`${api}/api/patients?search=${encodeURIComponent(code)}`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const items = body.data ?? body.items ?? [];
	const row = (Array.isArray(items) ? items : []).find(
		(p: { codePatient?: string }) => p.codePatient === code
	);
	expect(row?.id, `patient ${code}`).toBeTruthy();
	expect(row?.nom, `patient ${code} nom`).toBeTruthy();
	return row as QaPatient;
}

export async function assertFinance(
	request: APIRequestContext,
	token: string,
	patientId: number,
	expected: RegExp | string
) {
	const response = await request.get(`${api}/api/queue/finance/${patientId}`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const status = String((await response.json()).financeStatus ?? '');
	if (typeof expected === 'string') {
		expect(status).toBe(expected);
	} else {
		expect(status).toMatch(expected);
	}
	return status;
}

/** Cancel ACTIVE queue tickets for patient (owned cleanup). */
export async function clearActiveTickets(
	request: APIRequestContext,
	token: string,
	patientId: number
) {
	const response = await request.get(`${api}/api/queue/tickets?patientId=${patientId}&limit=100`, {
		headers: bearer(token)
	});
	if (!response.ok()) return;
	const body = await response.json();
	const items = body.items ?? body.data ?? [];
	for (const ticket of Array.isArray(items) ? items : []) {
		if (String(ticket.status ?? '') !== 'ACTIVE') continue;
		await request.post(`${api}/api/queue/tickets/${ticket.id}/cancel`, {
			headers: bearer(token),
			data: {}
		});
	}
}

/**
 * List appointments intersecting [from, to) then keep rows for patientId.
 * NOTE: GET /api/appointments does not accept patientId (LOT 23F.1 filter set) —
 * client-side filter is required so cleanup never cancels unrelated rows.
 */
export async function listAppointmentsForPatient(
	request: APIRequestContext,
	token: string,
	patientId: number,
	from?: string,
	to?: string
) {
	const windowFrom = from ?? new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
	const windowTo = to ?? new Date(Date.now() + 21 * 24 * 60 * 60_000).toISOString();
	const owned: Array<{
		id: number;
		patientId?: number;
		status?: string;
		scheduledAt?: string;
		queueTicketId?: number | null;
	}> = [];
	for (let page = 1; page <= 20; page++) {
		const response = await request.get(
			`${api}/api/appointments?from=${encodeURIComponent(windowFrom)}&to=${encodeURIComponent(windowTo)}&page=${page}&limit=100`,
			{ headers: bearer(token) }
		);
		if (!response.ok()) break;
		const body = await response.json();
		const items = (body.items ?? body.data ?? []) as Array<{
			id: number;
			patientId?: number;
			status?: string;
			scheduledAt?: string;
			queueTicketId?: number | null;
		}>;
		if (!Array.isArray(items) || items.length === 0) break;
		for (const appt of items) {
			if (Number(appt.patientId) === Number(patientId)) owned.push(appt);
		}
		const total = Number(body.total ?? 0);
		if (page * 100 >= total || items.length < 100) break;
	}
	return owned;
}

/** Cancel a known owned appointment id (SCHEDULED/CONFIRMED only). */
export async function cancelOwnedAppointment(
	request: APIRequestContext,
	token: string,
	appointmentId: number
) {
	const response = await request.get(`${api}/api/appointments/${appointmentId}`, {
		headers: bearer(token)
	});
	if (!response.ok()) return;
	const appt = await response.json();
	if (appt.queueTicketId) {
		await request.post(`${api}/api/queue/tickets/${appt.queueTicketId}/cancel`, {
			headers: bearer(token),
			data: {}
		});
	}
	if (!['SCHEDULED', 'CONFIRMED'].includes(String(appt.status ?? ''))) return;
	await request.post(`${api}/api/appointments/${appointmentId}/cancel`, {
		headers: bearer(token),
		data: {}
	});
}

/**
 * Cancel SCHEDULED/CONFIRMED appointments owned by patientId only.
 * Tickets linked to those appointments must be cleared first (FK / lifecycle).
 */
export async function clearPatientSchedule(
	request: APIRequestContext,
	token: string,
	patientId: number,
	from?: string,
	to?: string
) {
	await clearActiveTickets(request, token, patientId);
	const owned = await listAppointmentsForPatient(request, token, patientId, from, to);
	for (const appt of owned) {
		if (appt.queueTicketId) {
			await request.post(`${api}/api/queue/tickets/${appt.queueTicketId}/cancel`, {
				headers: bearer(token),
				data: {}
			});
		}
		if (!['SCHEDULED', 'CONFIRMED'].includes(String(appt.status ?? ''))) continue;
		await request.post(`${api}/api/appointments/${appt.id}/cancel`, {
			headers: bearer(token),
			data: {}
		});
	}
}

/** Prove patient has no blocking SCHEDULED/CONFIRMED appointments and no ACTIVE ticket. */
export async function provePatientClean(
	request: APIRequestContext,
	token: string,
	patientId: number
) {
	await clearPatientSchedule(request, token, patientId);
	const tickets = await request.get(`${api}/api/queue/tickets?patientId=${patientId}&limit=50`, {
		headers: bearer(token)
	});
	if (tickets.ok()) {
		const items = ((await tickets.json()).items ?? []) as Array<{
			status?: string;
			patientId?: number;
		}>;
		const active = items.filter(
			(t) => String(t.status) === 'ACTIVE' && Number(t.patientId) === Number(patientId)
		);
		expect(active.length, `patient ${patientId} active tickets`).toBe(0);
	}
	const owned = await listAppointmentsForPatient(request, token, patientId);
	const blocking = owned.filter((a) => ['SCHEDULED', 'CONFIRMED'].includes(String(a.status)));
	expect(blocking.length, `patient ${patientId} blocking appointments`).toBe(0);
}

export async function serviceId(request: APIRequestContext, token: string, code = 'URG') {
	const response = await request.get(`${api}/api/organization/services`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const items = Array.isArray(body) ? body : (body.data ?? []);
	const preferred = items.find((s: { code?: string }) => s.code === code);
	const clinical = items.find(
		(s: { supportsConsultation?: boolean; active?: boolean }) =>
			s.supportsConsultation && s.active !== false
	);
	const row = preferred ?? clinical ?? items[0];
	expect(row?.id, 'service').toBeTruthy();
	return row.id as number;
}

export async function activeType(
	request: APIRequestContext,
	token: string,
	svc: number
): Promise<{ id: number; defaultDurationMinutes: number }> {
	const response = await request.get(`${api}/api/appointment-types?serviceId=${svc}&active=true`, {
		headers: bearer(token)
	});
	if (response.status() === 404) {
		throw new Error(
			'GET /api/appointment-types returned 404 — QA_API_URL must point at backend ≥ LOT 23F.1 (49fcac8)'
		);
	}
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const item = (body.items ?? [])[0];
	expect(item?.id, 'appointment type').toBeTruthy();
	return item;
}

export async function listSlots(
	request: APIRequestContext,
	token: string,
	opts: {
		serviceId: number;
		appointmentTypeId: number;
		practitionerId?: number;
		from?: string;
		to?: string;
	}
): Promise<Slot[]> {
	const from = opts.from ?? new Date(Date.now() + 30 * 60_000).toISOString();
	const to = opts.to ?? new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();
	const params = new URLSearchParams({
		serviceId: String(opts.serviceId),
		from,
		to,
		appointmentTypeId: String(opts.appointmentTypeId)
	});
	if (opts.practitionerId) params.set('practitionerId', String(opts.practitionerId));
	const response = await request.get(`${api}/api/availability?${params}`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	return ((await response.json()).slots ?? []) as Slot[];
}

export async function firstSlot(
	request: APIRequestContext,
	token: string,
	opts: Parameters<typeof listSlots>[2]
) {
	const slots = await listSlots(request, token, opts);
	expect(slots[0]?.startAt, 'availability slot').toBeTruthy();
	return slots[0];
}

export async function bookOnFreeSlot(
	request: APIRequestContext,
	token: string,
	opts: {
		patientId: number;
		serviceId: number;
		appointmentTypeId: number;
		from?: string;
		to?: string;
		practitionerId?: number;
		reason: string;
	}
) {
	const slots = await listSlots(request, token, {
		serviceId: opts.serviceId,
		appointmentTypeId: opts.appointmentTypeId,
		practitionerId: opts.practitionerId,
		from: opts.from,
		to: opts.to
	});
	if (!slots.length) throw new Error('availability slots empty');
	let lastText = '';
	for (const slot of slots.slice(0, 60)) {
		const book = await request.post(`${api}/api/appointments`, {
			headers: { ...bearer(token), 'Idempotency-Key': crypto.randomUUID() },
			data: {
				patientId: opts.patientId,
				serviceId: opts.serviceId,
				practitionerId: slot.practitionerId,
				appointmentTypeId: opts.appointmentTypeId,
				startAt: slot.startAt,
				reason: opts.reason,
				idempotencyKey: crypto.randomUUID()
			}
		});
		lastText = await book.text();
		if ([200, 201].includes(book.status())) {
			const parsed = JSON.parse(lastText) as { data?: Record<string, unknown>; id?: number };
			const body = (parsed.id != null ? parsed : (parsed.data ?? parsed)) as {
				id: number;
				scheduledAt: string;
				scheduledEndAt?: string;
				status?: string;
			};
			return { status: book.status(), body, slot };
		}
	}
	throw new Error(`bookOnFreeSlot failed after retries: ${lastText}`);
}

/** Book a past SCHEDULED appointment eligible for no-show (retries across offsets/practitioners). */
export async function bookPastAppointment(
	request: APIRequestContext,
	token: string,
	opts: {
		patientId: number;
		serviceId: number;
		appointmentTypeId: number;
		reason: string;
	}
) {
	const near = await listSlots(request, token, {
		serviceId: opts.serviceId,
		appointmentTypeId: opts.appointmentTypeId,
		from: new Date().toISOString(),
		to: new Date(Date.now() + 8 * 60 * 60_000).toISOString()
	}).catch(() => [] as Slot[]);
	const far = await listSlots(request, token, {
		serviceId: opts.serviceId,
		appointmentTypeId: opts.appointmentTypeId,
		from: new Date(Date.now() + 8 * 60 * 60_000).toISOString(),
		to: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString()
	}).catch(() => [] as Slot[]);
	const practitioners = [...new Set([...near, ...far].map((s) => s.practitionerId))];
	if (!practitioners.length) {
		// Last resort: known demo practitioners often used by URG schedules
		practitioners.push(2, 3, 4, 5);
	}
	expect(practitioners.length, 'practitioner for past book').toBeGreaterThan(0);
	let lastText = '';
	for (const prac of practitioners) {
		for (const mins of [90, 120, 150, 180, 210, 240, 300, 360, 420, 480]) {
			const startAt = new Date(Date.now() - mins * 60_000);
			startAt.setUTCSeconds(0, 0);
			const book = await request.post(`${api}/api/appointments`, {
				headers: { ...bearer(token), 'Idempotency-Key': crypto.randomUUID() },
				data: {
					patientId: opts.patientId,
					serviceId: opts.serviceId,
					practitionerId: prac,
					appointmentTypeId: opts.appointmentTypeId,
					startAt: startAt.toISOString(),
					reason: opts.reason,
					idempotencyKey: crypto.randomUUID()
				}
			});
			lastText = await book.text();
			if ([200, 201].includes(book.status())) {
				const parsed = JSON.parse(lastText) as { id?: number; data?: { id?: number } };
				const body = (parsed.id != null ? parsed : parsed.data) as {
					id: number;
					scheduledAt: string;
					status?: string;
				};
				return body;
			}
		}
	}
	throw new Error(`bookPastAppointment failed: ${lastText}`);
}

export function parisDate(iso: string) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: AGENDA_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(iso));
}

export function parisDayDelta(fromIso: string, toIso: string) {
	const a = parisDate(fromIso);
	const b = parisDate(toIso);
	return Math.round(
		(Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / (24 * 60 * 60_000)
	);
}

export async function clickFooter(page: Page, testId: string) {
	const btn = page.getByTestId(testId);
	await btn.scrollIntoViewIfNeeded();
	await btn.click({ force: true });
}

export async function pickPatient(page: Page, patient: QaPatient) {
	await page.getByTestId('agenda-patient-search').fill(patient.codePatient);
	const option = page.getByTestId('agenda-patient-option').first();
	if (!(await option.isVisible({ timeout: 8_000 }).catch(() => false))) {
		await page.getByTestId('agenda-patient-search').fill(patient.nom);
	}
	await expect(page.getByTestId('agenda-patient-option').first()).toBeVisible({ timeout: 15_000 });
	await page.getByTestId('agenda-patient-option').first().click();
	await expect(page.getByTestId('agenda-selected-patient')).toBeVisible();
}

export async function openAppointmentOnAgenda(page: Page, id: number, scheduledAt: string) {
	const waitAgendaLoad = async () => {
		await page
			.waitForResponse(
				(r) => r.url().includes('/api/appointments') && r.request().method() === 'GET' && r.ok(),
				{ timeout: 20_000 }
			)
			.catch(() => undefined);
		await expect(page.getByTestId('agenda-day-view')).toBeVisible({ timeout: 20_000 });
	};
	const tryCard = async () => {
		const card = page.locator(`[data-appointment-id="${id}"]`).first();
		if (await card.count()) {
			await card.click();
			await expect(page.getByTestId('agenda-appointment-details')).toBeVisible({
				timeout: 15_000
			});
			return true;
		}
		return false;
	};

	await page.getByTestId('agenda-filter-status').selectOption('');
	await page.getByTestId('agenda-today').click();
	await waitAgendaLoad();

	const days = parisDayDelta(new Date().toISOString(), scheduledAt);
	if (days > 0) {
		for (let i = 0; i < days; i++) {
			await page.getByTestId('agenda-next').click();
			await waitAgendaLoad();
		}
	} else if (days < 0) {
		for (let i = 0; i < -days; i++) {
			await page.getByTestId('agenda-prev').click();
			await waitAgendaLoad();
		}
	}
	if (await tryCard()) return;

	// Small drift buffer (±1 day) if TZ edge cases shift the card
	for (const dir of ['next', 'prev'] as const) {
		await page.getByTestId(`agenda-${dir}`).click();
		await waitAgendaLoad();
		if (await tryCard()) return;
		await page.getByTestId(dir === 'next' ? 'agenda-prev' : 'agenda-next').click();
		await waitAgendaLoad();
	}

	throw new Error(
		`appointment ${id} not found on agenda day views (scheduledAt=${scheduledAt} paris=${parisDate(scheduledAt)} delta=${days})`
	);
}
