/** One Playwright attempt recorded for qa-summary.json. */
export type QASummaryAttempt = {
	/** Playwright test identity — groups retries of the same case. */
	id: string;
	key: string;
	suite: string;
	title: string;
	status: string;
	duration: number;
	error: string | null;
	retryCount: number;
	artifacts: { type: string; name: string; location: string }[];
};

export type QASummaryTest = Omit<QASummaryAttempt, 'id'>;

/**
 * Collapse Playwright retry attempts into one final entry per test identity.
 * Keeps the attempt with the highest retryCount (final attempt metadata).
 * Distinct tests that share a QA key are left intact so qa-import can still reject real duplicates.
 */
export function finalizeQASummaryTests(attempts: QASummaryAttempt[]): QASummaryTest[] {
	const lastById = new Map<string, QASummaryAttempt>();
	const order: string[] = [];

	for (const attempt of attempts) {
		if (!lastById.has(attempt.id)) {
			order.push(attempt.id);
		}
		const prev = lastById.get(attempt.id);
		if (!prev || attempt.retryCount >= prev.retryCount) {
			lastById.set(attempt.id, attempt);
		}
	}

	return order.map((id) => {
		const final = lastById.get(id)!;
		return {
			key: final.key,
			suite: final.suite,
			title: final.title,
			status: final.status,
			duration: final.duration,
			error: final.error,
			retryCount: final.retryCount,
			artifacts: final.artifacts
		};
	});
}
