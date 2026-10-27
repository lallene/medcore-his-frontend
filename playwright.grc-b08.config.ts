import { defineConfig, devices } from '@playwright/test';

// GRC15-B08 — run only through scripts/grc-b08-e2e.sh, which starts the local
// production-like stack (server.mjs + Go API + throwaway PostgreSQL) and exports
// GRC_B08_*. Kept out of ./e2e so the DEMO-seeded release gate never picks it up.
const baseURL = process.env.GRC_B08_BASE_URL;
if (!baseURL) throw new Error('GRC_B08_BASE_URL is required: run scripts/grc-b08-e2e.sh');

export default defineConfig({
	testDir: './e2e-grc',
	fullyParallel: false,
	forbidOnly: true,
	retries: 0,
	workers: 1,
	timeout: 30_000,
	outputDir: 'test-results/grc-b08',
	reporter: [['list'], ['html', { outputFolder: 'test-results/grc-b08-report', open: 'never' }]],
	use: {
		baseURL,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'off',
		...devices['Desktop Chrome']
	}
});
