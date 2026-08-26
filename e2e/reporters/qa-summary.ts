import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { finalizeQASummaryTests, type QASummaryAttempt } from '../../src/lib/qa/summary.ts';

export default class QASummaryReporter implements Reporter {
	private startedAt = new Date();
	private attempts: QASummaryAttempt[] = [];
	onBegin() {
		this.startedAt = new Date();
	}
	onTestEnd(test: TestCase, result: TestResult) {
		const key = test.title.match(/QA-[A-Z]+-\d+/)?.[0] ?? test.id;
		const suite = test.location.file.split('/e2e/')[1]?.split('/')[0] ?? 'e2e';
		const artifacts = result.attachments
			.filter((a) => a.path)
			.map((a) => ({
				type: a.name.toUpperCase().replaceAll('-', '_'),
				name: a.name,
				location: relative(process.cwd(), a.path!)
			}));
		this.attempts.push({
			id: test.id,
			key,
			suite,
			title: test.title,
			status:
				result.status === 'passed' ? 'PASSED' : result.status === 'skipped' ? 'SKIPPED' : 'FAILED',
			duration: result.duration,
			error: result.error?.message ?? null,
			retryCount: result.retry,
			artifacts
		});
	}
	onEnd(result: FullResult) {
		const tests = finalizeQASummaryTests(this.attempts);
		const finishedAt = new Date();
		const passed = tests.filter((t) => t.status === 'PASSED').length;
		const failed = tests.filter((t) => t.status === 'FAILED').length;
		const skipped = tests.filter((t) => t.status === 'SKIPPED').length;
		const notImplemented = tests.filter((t) => t.status === 'NOT_IMPLEMENTED').length;
		const output = {
			runId: process.env.QA_RUN_ID ?? `local-${this.startedAt.toISOString()}`,
			type: (process.env.QA_SUITE ?? 'smoke').toUpperCase(),
			commitSha: process.env.GITHUB_SHA ?? 'local',
			branch: process.env.GITHUB_REF_NAME ?? 'local',
			environment: process.env.QA_ENVIRONMENT ?? 'local',
			triggeredBy: process.env.GITHUB_ACTOR ?? 'local',
			startedAt: this.startedAt.toISOString(),
			finishedAt: finishedAt.toISOString(),
			duration: finishedAt.getTime() - this.startedAt.getTime(),
			total: tests.length,
			passed,
			failed,
			skipped,
			notImplemented,
			status: result.status === 'passed' ? 'PASSED' : 'FAILED',
			tests,
			artifacts: [
				{ type: 'HTML_REPORT', name: 'Playwright HTML', location: 'playwright-report/index.html' },
				{ type: 'JUNIT', name: 'JUnit XML', location: 'test-results/junit.xml' }
			]
		};
		const path = 'test-results/qa-summary.json';
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, JSON.stringify(output, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
	}
}
