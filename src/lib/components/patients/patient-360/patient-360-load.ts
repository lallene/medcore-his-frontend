import { isAccessDeniedError } from '../../../rbac/permissions.ts';
import type { Patient360Capabilities } from './capabilities.ts';

/** Outcome of one authorized module fetch (bootstrap or tab branch). */
export type ModuleBranchResult<T> =
	{ status: 'success'; data: T } | { status: 'denied' } | { status: 'error'; message: string };

export type BranchOutcome<T> = ModuleBranchResult<T> | { status: 'skipped' };

export function resultFromPromise<T>(settled: PromiseSettledResult<T>): ModuleBranchResult<T> {
	if (settled.status === 'fulfilled') {
		return { status: 'success', data: settled.value };
	}
	const reason = settled.reason;
	if (isAccessDeniedError(reason)) {
		return { status: 'denied' };
	}
	const message =
		reason instanceof Error ? reason.message : 'Une erreur est survenue lors du chargement.';
	return { status: 'error', message };
}

export function errorMessageFromUnknown(error: unknown, fallback: string): string {
	if (isAccessDeniedError(error)) return 'ACCESS_DENIED';
	return error instanceof Error ? error.message : fallback;
}

/**
 * Overview / tab exam count: authoritative only when derived from loaded consultations.
 * Lab/imaging-only actors must not see a fabricated zero before opening Examens.
 */
export function overviewExamCountFromConsultations(
	caps: Pick<Patient360Capabilities, 'canReadConsultations'>,
	consultations: Array<{ exams?: unknown[] }>
): number | undefined {
	if (!caps.canReadConsultations) {
		return undefined;
	}
	return consultations.reduce((total, c) => total + (c.exams?.length ?? 0), 0);
}

export function tabExamCount(
	caps: Pick<Patient360Capabilities, 'canReadConsultations'>,
	consultations: Array<{ exams?: unknown[] }>
): number | undefined {
	return overviewExamCountFromConsultations(caps, consultations);
}

export function classifyModuleFetchError(error: unknown): 'denied' | 'error' {
	if (isAccessDeniedError(error)) return 'denied';
	return 'error';
}

export function createPatientLoadGeneration() {
	let generation = 0;
	return {
		bump(): number {
			generation += 1;
			return generation;
		},
		isCurrent(token: number): boolean {
			return token === generation;
		}
	};
}

/**
 * Isolated authorized-branch runner used by Billing / Exams / Insurance composition.
 * Disabled capabilities never invoke fetch (B03 / E01–E02 / P05).
 * One branch failure never erases sibling outcomes (B01/B02 / E03/E04).
 */
export async function settleAuthorizedBranches<T>(
	branches: Array<{ key: string; enabled: boolean; fetch: () => Promise<T> }>
): Promise<Record<string, BranchOutcome<T>>> {
	const out: Record<string, BranchOutcome<T>> = {};
	await Promise.all(
		branches.map(async (branch) => {
			if (!branch.enabled) {
				out[branch.key] = { status: 'skipped' };
				return;
			}
			try {
				const data = await branch.fetch();
				out[branch.key] = { status: 'success', data };
			} catch (error: unknown) {
				if (classifyModuleFetchError(error) === 'denied') {
					out[branch.key] = { status: 'denied' };
				} else {
					out[branch.key] = {
						status: 'error',
						message: errorMessageFromUnknown(error, 'Chargement impossible.')
					};
				}
			}
		})
	);
	return out;
}

export function issuedBranchKeys(results: Record<string, BranchOutcome<unknown>>): string[] {
	return Object.entries(results)
		.filter(([, r]) => r.status !== 'skipped')
		.map(([key]) => key);
}

/** Active-care banner commit guard — late A must not paint under B. */
export function commitIfCurrent<T>(
	isCurrent: (token: number) => boolean,
	token: number,
	value: T,
	commit: (value: T) => void
): boolean {
	if (!isCurrent(token)) return false;
	commit(value);
	return true;
}

/**
 * Bootstrap page composition state: patient identity is page-critical;
 * modules keep independent success / denied / error / empty.
 */
export type BootstrapPageState = {
	patient: { id: number; code: string } | null;
	pageError: string;
	accessDenied: boolean;
	modules: Record<string, ModuleBranchResult<unknown> | { status: 'empty' }>;
};

export function applyBootstrapPatientResult(
	state: BootstrapPageState,
	result: ModuleBranchResult<{ id: number; code: string }>
): BootstrapPageState {
	if (result.status === 'denied') {
		return { ...state, patient: null, accessDenied: true, pageError: '' };
	}
	if (result.status === 'error') {
		return { ...state, patient: null, accessDenied: false, pageError: result.message };
	}
	return { ...state, patient: result.data, accessDenied: false, pageError: '' };
}

export function applyBootstrapModuleResult<T>(
	state: BootstrapPageState,
	key: string,
	result: ModuleBranchResult<T>
): BootstrapPageState {
	const modules = { ...state.modules };
	if (result.status === 'success') {
		const empty =
			Array.isArray(result.data) && result.data.length === 0
				? ({ status: 'empty' } as const)
				: result;
		modules[key] = empty.status === 'empty' ? empty : result;
	} else {
		modules[key] = result;
	}
	return { ...state, modules };
}

export function consultationDerivedExamsVisible(canReadConsultations: boolean): boolean {
	return canReadConsultations;
}

export function examsCreateCtaVisible(canCreateConsultation: boolean): boolean {
	return canCreateConsultation;
}
