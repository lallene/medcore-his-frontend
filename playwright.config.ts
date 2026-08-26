import { defineConfig, devices } from '@playwright/test';
import { assertSafeQARun } from './src/lib/qa/policy';

const environment = process.env.QA_ENVIRONMENT ?? 'local';
const suite = process.env.QA_SUITE ?? 'smoke';
assertSafeQARun(environment, suite);

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	timeout: 30_000,
	grep:
		suite === 'full'
			? undefined
			: suite === 'critical'
				? /@(smoke|critical)/
				: suite === 'production-smoke'
					? /@production-safe/
					: /@smoke/,
	outputDir: 'test-results/artifacts',
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
		['junit', { outputFile: 'test-results/junit.xml' }],
		['json', { outputFile: 'test-results/playwright-results.json' }],
		['./e2e/reporters/qa-summary.ts']
	],
	use: {
		baseURL: process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		...devices['Desktop Chrome']
	}
});
