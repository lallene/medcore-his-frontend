export function assertSafeQARun(environment: string, suite: string): void {
	if (environment.trim().toLowerCase() === 'production' && suite !== 'production-smoke') {
		throw new Error(
			'QA release gate: les suites destructives sont interdites en production. Utiliser QA_SUITE=production-smoke.'
		);
	}
}
