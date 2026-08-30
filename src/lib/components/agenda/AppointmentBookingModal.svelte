<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPatients } from '$lib/api/patients';
	import { listOrganizationServices } from '$lib/api/organization';
	import { listStaff } from '$lib/api/staff';
	import { bookAppointment, getAvailability, listAppointmentTypes } from '$lib/api/appointments';
	import {
		AGENDA_TIMEZONE,
		buildBookPayload,
		canListStaffForAgenda,
		dayRange,
		newIdempotencyKey,
		slotKey,
		startOfZonedDay,
		toRfc3339,
		zonedLocalToUtc
	} from '$lib/components/agenda/state';
	import AvailabilityPicker from './AvailabilityPicker.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import FormSection from '$lib/components/ui/FormSection.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import type { Patient } from '$lib/types/patient';
	import type { OrganizationService } from '$lib/types/organization';
	import type { Appointment, AppointmentType, AvailabilitySlot } from '$lib/types/scheduling';
	import { eligibleServices } from '$lib/components/organization/state';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';
	import axios from 'axios';

	interface Props {
		open?: boolean;
		permissions?: string[];
		onclose?: () => void;
		onsuccess?: (appt: Appointment) => void;
	}

	let { open = $bindable(false), permissions = [], onclose, onsuccess }: Props = $props();

	let step = $state(1);
	let error = $state('');
	let conflict = $state(false);
	let submitting = $state(false);

	let patientQuery = $state('');
	let patientResults = $state<Patient[]>([]);
	let patientSearching = $state(false);
	let selectedPatient = $state<Patient | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	let services = $state<OrganizationService[]>([]);
	let serviceId = $state('');
	let types = $state<AppointmentType[]>([]);
	let typeId = $state('');
	let practitionerMode = $state<'any' | 'specific'>('any');
	let practitionerId = $state('');
	let staffOptions = $state<Array<{ userId: number; label: string }>>([]);
	let dateLocal = $state('');
	let reason = $state('');
	let slots = $state<AvailabilitySlot[]>([]);
	let slotsLoading = $state(false);
	let selectedSlot = $state<AvailabilitySlot | null>(null);
	let practitionerNames = $state<Record<number, string>>({});
	let idempotencyKey = $state('');
	let availSeq = 0;

	const consultationServices = $derived(eligibleServices(services, 'consultation'));
	const selectedType = $derived(types.find((t) => String(t.id) === typeId) ?? null);
	const canStaff = $derived(canListStaffForAgenda(permissions));

	$effect(() => {
		if (!open) return;
		void bootstrap();
	});

	async function bootstrap() {
		error = '';
		conflict = false;
		step = 1;
		selectedPatient = null;
		patientQuery = '';
		patientResults = [];
		serviceId = '';
		typeId = '';
		practitionerMode = 'any';
		practitionerId = '';
		reason = '';
		slots = [];
		selectedSlot = null;
		idempotencyKey = newIdempotencyKey();
		const today = startOfZonedDay(new Date());
		const p = new Intl.DateTimeFormat('en-CA', {
			timeZone: AGENDA_TIMEZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(today);
		dateLocal = p;
		try {
			services = await listOrganizationServices(true);
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible de charger les services.');
		}
	}

	function onPatientInput(value: string) {
		patientQuery = value;
		if (searchTimer) clearTimeout(searchTimer);
		if (!value.trim()) {
			patientResults = [];
			return;
		}
		searchTimer = setTimeout(() => void searchPatients(value), 300);
	}

	async function searchPatients(q: string) {
		patientSearching = true;
		try {
			const res = await getPatients(1, 20, q);
			patientResults = res.data;
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Recherche patient impossible.');
		} finally {
			patientSearching = false;
		}
	}

	async function onServiceChange() {
		typeId = '';
		types = [];
		practitionerId = '';
		staffOptions = [];
		selectedSlot = null;
		slots = [];
		if (!serviceId) return;
		try {
			const res = await listAppointmentTypes({
				serviceId: Number(serviceId),
				active: true
			});
			types = res.items.filter((t) => t.active);
			if (canStaff) {
				const page = await listStaff({
					serviceId: Number(serviceId),
					active: 'true',
					limit: 100
				});
				staffOptions = (page.items ?? []).map((s) => ({
					userId: s.userId,
					label: s.name || `Utilisateur #${s.userId}`
				}));
				const names: Record<number, string> = { ...practitionerNames };
				for (const s of staffOptions) names[s.userId] = s.label;
				practitionerNames = names;
			}
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible de charger les types / praticiens.');
		}
	}

	async function loadAvailability() {
		if (!serviceId || !typeId || !dateLocal) return;
		const seq = ++availSeq;
		slotsLoading = true;
		error = '';
		conflict = false;
		selectedSlot = null;
		try {
			const [y, m, d] = dateLocal.split('-').map(Number);
			const dayStart = zonedLocalToUtc(y, m, d, 0, 0, 0, AGENDA_TIMEZONE);
			const { from, to } = dayRange(dayStart, AGENDA_TIMEZONE);
			const res = await getAvailability({
				serviceId: Number(serviceId),
				from: toRfc3339(from),
				to: toRfc3339(to),
				appointmentTypeId: Number(typeId),
				practitionerId:
					practitionerMode === 'specific' && practitionerId ? Number(practitionerId) : undefined
			});
			if (seq !== availSeq) return;
			slots = res.slots ?? [];
		} catch (e) {
			if (seq !== availSeq) return;
			slots = [];
			error = resolveUserErrorMessage(e, 'Impossible de charger les disponibilités.');
		} finally {
			if (seq === availSeq) slotsLoading = false;
		}
	}

	function goAvailability() {
		step = 2;
		void loadAvailability();
	}

	async function submit() {
		if (!selectedPatient || !selectedSlot || !serviceId || !typeId) return;
		submitting = true;
		error = '';
		conflict = false;
		try {
			const payload = buildBookPayload({
				patientId: selectedPatient.id,
				serviceId: Number(serviceId),
				appointmentTypeId: Number(typeId),
				durationMinutes: selectedType?.defaultDurationMinutes,
				practitionerId: selectedSlot.practitionerId,
				startAt: selectedSlot.startAt,
				reason,
				idempotencyKey
			});
			const created = await bookAppointment(payload, { idempotencyKey });
			onsuccess?.(created);
			open = false;
			onclose?.();
		} catch (e) {
			const status = axios.isAxiosError(e) ? e.response?.status : undefined;
			if (status === 409) {
				conflict = true;
				error =
					resolveUserErrorMessage(e, 'Créneau indisponible') ||
					'Créneau indisponible — choisissez un autre créneau.';
				selectedSlot = null;
				idempotencyKey = newIdempotencyKey();
				await loadAvailability();
			} else {
				error = resolveUserErrorMessage(e, 'Réservation impossible.');
			}
		} finally {
			submitting = false;
		}
	}
</script>

<Modal
	bind:open
	title="Nouveau rendez-vous"
	description="Réservation transactionnelle (disponibilité backend)."
	size="lg"
	{onclose}
>
	<div class="space-y-4" data-testid="agenda-booking-modal">
		{#if error}
			<Alert
				tone={conflict ? 'warning' : 'danger'}
				title={conflict ? 'Conflit de créneau' : 'Erreur'}>{error}</Alert
			>
		{/if}

		{#if step === 1}
			<FormSection title="Patient & critères" columns={1}>
				<FormField label="Patient" required>
					<Input
						value={patientQuery}
						placeholder="Nom, prénom, téléphone, dossier…"
						data-testid="agenda-patient-search"
						oninput={(e) => onPatientInput((e.currentTarget as HTMLInputElement).value)}
					/>
					{#if patientSearching}
						<p class="mt-1 text-xs text-slate-500">Recherche…</p>
					{/if}
					{#if selectedPatient}
						<p
							class="mt-2 text-sm font-medium text-slate-800"
							data-testid="agenda-selected-patient"
						>
							{selectedPatient.prenoms}
							{selectedPatient.nom}
							<span class="text-slate-500">({selectedPatient.codePatient})</span>
						</p>
					{:else if patientResults.length}
						<ul class="mt-2 max-h-40 overflow-auto rounded-xl border border-border">
							{#each patientResults as p (p.id)}
								<li>
									<button
										type="button"
										class="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
										data-testid="agenda-patient-option"
										onclick={() => {
											selectedPatient = p;
											patientQuery = `${p.prenoms} ${p.nom}`;
											patientResults = [];
										}}
									>
										{p.prenoms}
										{p.nom}
										<span class="text-slate-500">· {p.codePatient}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<p class="mt-1 text-xs text-slate-500">
						Nouveau patient ?
						<a class="text-primary underline" href={resolve('/patients')}>Créer un dossier</a>
					</p>
				</FormField>

				<FormField label="Service" required>
					<Select
						bind:value={serviceId}
						data-testid="agenda-book-service"
						onchange={() => void onServiceChange()}
					>
						<option value="">Sélectionner…</option>
						{#each consultationServices as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</Select>
				</FormField>

				<FormField label="Type de rendez-vous" required>
					<Select bind:value={typeId} data-testid="agenda-book-type" disabled={!types.length}>
						<option value="">Sélectionner…</option>
						{#each types as t (t.id)}
							<option value={String(t.id)}>{t.name} ({t.defaultDurationMinutes} min)</option>
						{/each}
					</Select>
				</FormField>

				<FormField label="Praticien">
					<div class="flex flex-wrap gap-3 text-sm">
						<label class="inline-flex items-center gap-2">
							<input
								type="radio"
								name="prac-mode"
								checked={practitionerMode === 'any'}
								onchange={() => (practitionerMode = 'any')}
								data-testid="agenda-prac-any"
							/>
							Premier disponible
						</label>
						<label class="inline-flex items-center gap-2">
							<input
								type="radio"
								name="prac-mode"
								checked={practitionerMode === 'specific'}
								onchange={() => (practitionerMode = 'specific')}
								data-testid="agenda-prac-specific"
							/>
							Praticien précis
						</label>
					</div>
					{#if practitionerMode === 'specific'}
						{#if canStaff && staffOptions.length}
							<Select
								class="mt-2"
								bind:value={practitionerId}
								data-testid="agenda-book-practitioner"
							>
								<option value="">Choisir…</option>
								{#each staffOptions as s (s.userId)}
									<option value={String(s.userId)}>{s.label}</option>
								{/each}
							</Select>
						{:else}
							<Input
								class="mt-2"
								bind:value={practitionerId}
								placeholder="ID utilisateur praticien"
								data-testid="agenda-book-practitioner"
							/>
						{/if}
					{/if}
				</FormField>

				<FormField label="Date" required>
					<Input type="date" bind:value={dateLocal} data-testid="agenda-book-date" />
				</FormField>

				<FormField label="Motif">
					<Textarea bind:value={reason} rows={2} data-testid="agenda-book-reason" />
				</FormField>
			</FormSection>
		{:else}
			<FormSection title="Disponibilités" columns={1}>
				{#if slotsLoading && !slots.length}
					<LoadingState label="Interrogation du moteur de disponibilité…" />
				{:else}
					<AvailabilityPicker
						{slots}
						loading={slotsLoading}
						selectedKey={selectedSlot ? slotKey(selectedSlot) : ''}
						{practitionerNames}
						onselect={(s) => (selectedSlot = s)}
						onretry={() => void loadAvailability()}
					/>
				{/if}
			</FormSection>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex w-full flex-wrap justify-between gap-2">
			<Button
				variant="ghost"
				onclick={() => {
					open = false;
					onclose?.();
				}}>Fermer</Button
			>
			<div class="flex gap-2">
				{#if step === 2}
					<Button variant="secondary" onclick={() => (step = 1)} disabled={submitting}
						>Retour</Button
					>
					<Button
						onclick={() => void submit()}
						loading={submitting}
						disabled={!selectedSlot || submitting}
						data-testid="agenda-book-submit">Confirmer la réservation</Button
					>
				{:else}
					<Button
						onclick={goAvailability}
						disabled={!selectedPatient ||
							!serviceId ||
							!typeId ||
							!dateLocal ||
							(practitionerMode === 'specific' && !practitionerId)}
						data-testid="agenda-book-next">Voir les disponibilités</Button
					>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>
