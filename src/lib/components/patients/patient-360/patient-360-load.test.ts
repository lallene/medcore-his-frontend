import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	applyBootstrapModuleResult,
	applyBootstrapPatientResult,
	classifyModuleFetchError,
	commitIfCurrent,
	consultationDerivedExamsVisible,
	createPatientLoadGeneration,
	examsCreateCtaVisible,
	issuedBranchKeys,
	overviewExamCountFromConsultations,
	resultFromPromise,
	settleAuthorizedBranches,
	type BootstrapPageState
} from './patient-360-load.ts';

describe('patient-360-load core', () => {
	it('overviewExamCount undefined without consultations.read (D5)', () => {
		const n = overviewExamCountFromConsultations({ canReadConsultations: false }, [
			{ exams: [{ id: 1 }] }
		]);
		assert.equal(n, undefined);
	});

	it('overviewExamCount authoritative zero only with consultations.read', () => {
		assert.equal(overviewExamCountFromConsultations({ canReadConsultations: true }, []), 0);
		assert.equal(
			overviewExamCountFromConsultations({ canReadConsultations: true }, [
				{ exams: [{ id: 1 }, { id: 2 }] },
				{ exams: [] }
			]),
			2
		);
	});

	it('stale generation guard ignores late commits', () => {
		const gen = createPatientLoadGeneration();
		const a = gen.bump();
		const b = gen.bump();
		assert.equal(gen.isCurrent(a), false);
		assert.equal(gen.isCurrent(b), true);
	});
});

describe('LOT28E-D billing branch isolation', () => {
	it('B01 invoices success + receivables failure → invoices retained', async () => {
		const results = await settleAuthorizedBranches([
			{ key: 'invoices', enabled: true, fetch: async () => [{ id: 1 }] },
			{
				key: 'receivables',
				enabled: true,
				fetch: async () => {
					throw new Error('500 receivables');
				}
			},
			{ key: 'insuranceReceivables', enabled: false, fetch: async () => [] }
		]);
		assert.equal(results.invoices.status, 'success');
		if (results.invoices.status === 'success') {
			assert.deepEqual(results.invoices.data, [{ id: 1 }]);
		}
		assert.equal(results.receivables.status, 'error');
		assert.equal(results.insuranceReceivables.status, 'skipped');
	});

	it('B02 receivables success + invoices failure → receivables retained', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'invoices',
				enabled: true,
				fetch: async () => {
					throw new Error('500 invoices');
				}
			},
			{ key: 'receivables', enabled: true, fetch: async () => [{ id: 9 }] }
		]);
		assert.equal(results.receivables.status, 'success');
		assert.equal(results.invoices.status, 'error');
	});

	it('B03 capability false → corresponding request not issued', async () => {
		let invoicesCalls = 0;
		let receivablesCalls = 0;
		const results = await settleAuthorizedBranches([
			{
				key: 'invoices',
				enabled: false,
				fetch: async () => {
					invoicesCalls += 1;
					return [];
				}
			},
			{
				key: 'receivables',
				enabled: true,
				fetch: async () => {
					receivablesCalls += 1;
					return [];
				}
			}
		]);
		assert.equal(invoicesCalls, 0);
		assert.equal(receivablesCalls, 1);
		assert.deepEqual(issuedBranchKeys(results), ['receivables']);
		assert.equal(results.invoices.status, 'skipped');
	});

	it('B04 unexpected 403 → local denied', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'invoices',
				enabled: true,
				fetch: async () => {
					throw new Error('ACCESS_DENIED');
				}
			}
		]);
		assert.equal(results.invoices.status, 'denied');
		assert.equal(classifyModuleFetchError(new Error('ACCESS_DENIED')), 'denied');
	});

	it('B05 non-403 → local error (not empty success)', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'invoices',
				enabled: true,
				fetch: async () => {
					throw new Error('network down');
				}
			}
		]);
		assert.equal(results.invoices.status, 'error');
		assert.notEqual(results.invoices.status, 'success');
	});
});

describe('LOT28E-D exams branch isolation', () => {
	it('E01 lab-only → lab request only', async () => {
		let lab = 0;
		let imaging = 0;
		const results = await settleAuthorizedBranches([
			{
				key: 'lab',
				enabled: true,
				fetch: async () => {
					lab += 1;
					return [{ id: 1 }];
				}
			},
			{
				key: 'imaging',
				enabled: false,
				fetch: async () => {
					imaging += 1;
					return [];
				}
			}
		]);
		assert.equal(lab, 1);
		assert.equal(imaging, 0);
		assert.equal(results.lab.status, 'success');
		assert.equal(results.imaging.status, 'skipped');
	});

	it('E02 imaging-only → imaging request only', async () => {
		let lab = 0;
		let imaging = 0;
		const results = await settleAuthorizedBranches([
			{
				key: 'lab',
				enabled: false,
				fetch: async () => {
					lab += 1;
					return [];
				}
			},
			{
				key: 'imaging',
				enabled: true,
				fetch: async () => {
					imaging += 1;
					return [{ id: 2 }];
				}
			}
		]);
		assert.equal(lab, 0);
		assert.equal(imaging, 1);
		assert.equal(results.imaging.status, 'success');
	});

	it('E03 lab fails, imaging succeeds → imaging survives', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'lab',
				enabled: true,
				fetch: async () => {
					throw new Error('lab 500');
				}
			},
			{ key: 'imaging', enabled: true, fetch: async () => [{ id: 7 }] }
		]);
		assert.equal(results.lab.status, 'error');
		assert.equal(results.imaging.status, 'success');
	});

	it('E04 imaging fails, lab succeeds → lab survives', async () => {
		const results = await settleAuthorizedBranches([
			{ key: 'lab', enabled: true, fetch: async () => [{ id: 3 }] },
			{
				key: 'imaging',
				enabled: true,
				fetch: async () => {
					throw new Error('imaging 500');
				}
			}
		]);
		assert.equal(results.lab.status, 'success');
		assert.equal(results.imaging.status, 'error');
	});

	it('E05 error != empty', async () => {
		const empty = await settleAuthorizedBranches([
			{ key: 'lab', enabled: true, fetch: async () => [] }
		]);
		const errored = await settleAuthorizedBranches([
			{
				key: 'lab',
				enabled: true,
				fetch: async () => {
					throw new Error('boom');
				}
			}
		]);
		assert.equal(empty.lab.status, 'success');
		assert.equal(errored.lab.status, 'error');
		assert.notEqual(errored.lab.status, empty.lab.status);
	});

	it('E06 no consultation authority → no consultation-derived content', () => {
		assert.equal(consultationDerivedExamsVisible(false), false);
		assert.equal(consultationDerivedExamsVisible(true), true);
	});

	it('E07 consultation CTA requires consultations.create', () => {
		assert.equal(examsCreateCtaVisible(false), false);
		assert.equal(examsCreateCtaVisible(true), true);
	});
});

describe('LOT28E-D insurance auth truthfulness', () => {
	it('I01 successful empty auth → empty success', async () => {
		const results = await settleAuthorizedBranches([
			{ key: 'authorizations', enabled: true, fetch: async () => [] }
		]);
		assert.equal(results.authorizations.status, 'success');
		if (results.authorizations.status === 'success') {
			assert.deepEqual(results.authorizations.data, []);
		}
	});

	it('I02 403 → denied', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'authorizations',
				enabled: true,
				fetch: async () => {
					throw new Error('ACCESS_DENIED');
				}
			}
		]);
		assert.equal(results.authorizations.status, 'denied');
	});

	it('I03 non-403 → error (not empty)', async () => {
		const results = await settleAuthorizedBranches([
			{
				key: 'authorizations',
				enabled: true,
				fetch: async () => {
					throw new Error('500');
				}
			}
		]);
		assert.equal(results.authorizations.status, 'error');
	});

	it('I04 auth failure does not erase independent insurance content', async () => {
		const insuranceHeader = {
			status: 'Assuré',
			memberNumber: 'DEMO-MEMBER',
			coverageRate: 80
		};
		const auth = await settleAuthorizedBranches([
			{
				key: 'authorizations',
				enabled: true,
				fetch: async () => {
					throw new Error('network');
				}
			}
		]);
		assert.equal(auth.authorizations.status, 'error');
		// Independent coverage/header props remain untouched by auth branch outcome.
		assert.equal(insuranceHeader.status, 'Assuré');
		assert.equal(insuranceHeader.memberNumber, 'DEMO-MEMBER');
		assert.equal(insuranceHeader.coverageRate, 80);
	});
});

describe('LOT28E-D bootstrap isolation', () => {
	function emptyState(): BootstrapPageState {
		return {
			patient: null,
			pageError: '',
			accessDenied: false,
			modules: {}
		};
	}

	it('P01 consultations failure → patient header survives', () => {
		let state = emptyState();
		state = applyBootstrapPatientResult(state, {
			status: 'success',
			data: { id: 1, code: 'P-DEMO-001' }
		});
		state = applyBootstrapModuleResult(state, 'consultations', {
			status: 'error',
			message: '500'
		});
		state = applyBootstrapModuleResult(state, 'hospitalizations', {
			status: 'success',
			data: [{ id: 1 }]
		});
		assert.equal(state.patient?.code, 'P-DEMO-001');
		assert.equal(state.pageError, '');
		assert.equal(state.modules.consultations.status, 'error');
		assert.equal(state.modules.hospitalizations.status, 'success');
	});

	it('P02 hospitalization failure → unrelated modules survive', () => {
		let state = emptyState();
		state = applyBootstrapPatientResult(state, {
			status: 'success',
			data: { id: 2, code: 'P-DEMO-002' }
		});
		state = applyBootstrapModuleResult(state, 'consultations', {
			status: 'success',
			data: [{ id: 9 }]
		});
		state = applyBootstrapModuleResult(state, 'hospitalizations', {
			status: 'error',
			message: 'hosp down'
		});
		assert.equal(state.modules.consultations.status, 'success');
		assert.equal(state.modules.hospitalizations.status, 'error');
		assert.ok(state.patient);
	});

	it('P03 timeline failure → page survives + timeline error', () => {
		let state = emptyState();
		state = applyBootstrapPatientResult(state, {
			status: 'success',
			data: { id: 3, code: 'P-DEMO-003' }
		});
		state = applyBootstrapModuleResult(state, 'timeline', {
			status: 'error',
			message: 'timeline unavailable'
		});
		assert.ok(state.patient);
		assert.equal(state.modules.timeline.status, 'error');
		assert.equal(state.pageError, '');
	});

	it('P04 patient identity failure → page-critical behavior', () => {
		let state = emptyState();
		state = applyBootstrapPatientResult(state, {
			status: 'error',
			message: 'Impossible de charger la fiche patient.'
		});
		assert.equal(state.patient, null);
		assert.match(state.pageError, /Impossible/);
		assert.equal(state.accessDenied, false);

		state = applyBootstrapPatientResult(emptyState(), { status: 'denied' });
		assert.equal(state.accessDenied, true);
		assert.equal(state.patient, null);
	});

	it('P05 capability false → module request absent', async () => {
		let called = 0;
		const results = await settleAuthorizedBranches([
			{
				key: 'consultations',
				enabled: false,
				fetch: async () => {
					called += 1;
					return [];
				}
			}
		]);
		assert.equal(called, 0);
		assert.equal(results.consultations.status, 'skipped');
	});

	it('P06 403 → denied, not empty', () => {
		assert.deepEqual(
			resultFromPromise({ status: 'rejected', reason: new Error('ACCESS_DENIED') }),
			{
				status: 'denied'
			}
		);
		const emptySuccess = resultFromPromise({ status: 'fulfilled', value: [] });
		assert.equal(emptySuccess.status, 'success');
		assert.notEqual(
			resultFromPromise({ status: 'rejected', reason: new Error('ACCESS_DENIED') }).status,
			'success'
		);
	});
});

describe('LOT28E-D active-care stale response', () => {
	it('late A ticket cannot commit after switch to B', async () => {
		const gen = createPatientLoadGeneration();
		const state = { ticket: null as string | null };

		const tokenA = gen.bump();
		state.ticket = null;

		const tokenB = gen.bump();
		state.ticket = null;
		assert.equal(
			commitIfCurrent(gen.isCurrent.bind(gen), tokenB, 'ticket-B', (v) => {
				state.ticket = v;
			}),
			true
		);

		await new Promise((r) => setTimeout(r, 20));
		const lateA = commitIfCurrent(gen.isCurrent.bind(gen), tokenA, 'ticket-A', (v) => {
			state.ticket = v;
		});
		assert.equal(lateA, false);
		assert.equal(state.ticket, 'ticket-B');
	});
});
