/**
 * LOT AIDE+SEED — QA demo password, never defaulted.
 * The demo seed creates every demo account with MEDCORE_DEMO_SEED_PASSWORD; the Release Gate
 * generates it per run (masked) and exports the same value as QA_ADMIN_PASSWORD.
 * Missing → fail immediately with a message that never contains a secret.
 */
export const QA_PASSWORD_MISSING =
	'QA_ADMIN_PASSWORD is required (same value as MEDCORE_DEMO_SEED_PASSWORD used by the demo seed); there is no default.';

export function requiredQaPassword(env: Record<string, string | undefined> = process.env): string {
	const value = env.QA_ADMIN_PASSWORD;
	if (!value || value.trim() === '') throw new Error(QA_PASSWORD_MISSING);
	return value;
}
