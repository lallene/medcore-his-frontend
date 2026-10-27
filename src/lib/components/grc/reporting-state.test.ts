import assert from 'node:assert/strict';
import test from 'node:test';

import type { GrcCount, GrcReporting } from '$lib/types/grc';
import {
	GRC_WINDOW_DEFAULT,
	REPORTING_FRAMEWORK_FILTER_LABEL,
	REPORTING_FRAMEWORK_SCOPE,
	distributionKeys,
	isReportingZero,
	levelRows,
	reportingRows,
	reportingWindow,
	simulateReportingSession,
	toggleFramework
} from './reporting-state.ts';

const zeroRatio = { numerator: 0, denominator: 0, percent: 0 };
const counts = (entries: Array<[string, number]>): GrcCount[] =>
	entries.map(([key, count]) => ({ key, count }));

function emptyReport(): GrcReporting {
	const executive = {
		assetsTotal: 0,
		openRisks: 0,
		highCriticalOpenRisks: 0,
		activeFrameworks: 0,
		applicableRequirements: 0,
		mappedRequirements: 0,
		mappingCoverage: zeroRatio,
		controlsTotal: 0,
		implementationsTotal: 0,
		evidenceExpired: 0,
		evidenceExpiringSoon: 0,
		evidenceInvalid: 0,
		openActions: 0,
		overdueActions: 0,
		dueSoonActions: 0,
		activeAudits: 0,
		openFindings: 0,
		overdueFindings: 0,
		activeIncidents: 0,
		publishedPolicies: 0,
		policiesInReview: 0
	};
	return {
		generatedAt: '2026-06-01T12:00:00Z',
		windows: { evidenceExpiringSoonDays: 30, actionDueSoonDays: 30 },
		frameworkScope: { appliesTo: 'compliance', frameworkIds: [] },
		executive,
		risks: {
			byStatus: counts([
				['DRAFT', 0],
				['OPEN', 0]
			]),
			byTreatment: [],
			openByInherentLevel: [],
			openByResidualLevel: counts([
				['LOW', 0],
				['MEDIUM', 0],
				['HIGH', 0],
				['CRITICAL', 0]
			]),
			highCriticalOpenRisks: 0,
			openByOwningService: [],
			openByAssetCriticality: []
		},
		compliance: {
			activeFrameworks: 0,
			activeRequirements: 0,
			applicableRequirements: 0,
			mappedRequirements: 0,
			mappingCoverage: zeroRatio,
			byFramework: []
		},
		controls: { total: 0, byStatus: [], implementationsTotal: 0, implementationsByStatus: [] },
		evidence: { byValidity: [], byType: [], valid: 0, expiringSoon: 0, expired: 0, invalid: 0 },
		actions: { byStatus: [], byDueState: [], openByPriority: [], open: 0, overdue: 0, dueSoon: 0 },
		audits: { byStatus: [], byType: [], active: 0, completed: 0 },
		findings: { byStatus: [], bySeverity: [], open: 0, overdue: 0 },
		incidents: { byStatus: [], bySeverity: [], active: 0 },
		policies: { byStatus: [], byOwningService: [], published: 0, inReview: 0 }
	};
}

test('zero distributions keep API order and textual labels', () => {
	const rows = levelRows(emptyReport().risks.openByResidualLevel);
	assert.deepEqual(
		rows.map((row) => row.label),
		['Faible (1–4)', 'Modéré (5–9)', 'Élevé (10–14)', 'Critique (15–25)']
	);
	assert.deepEqual(
		rows.map((row) => row.value),
		[0, 0, 0, 0]
	);
	assert.deepEqual(distributionKeys(emptyReport().risks.byStatus), ['DRAFT', 'OPEN']);
	assert.equal(reportingRows(counts([['PUBLISHED', 2]]))[0].label, 'Publiée');
});

test('windows and framework selection stay within the allowlist', () => {
	assert.equal(reportingWindow(''), null);
	assert.equal(reportingWindow('0'), null);
	assert.equal(reportingWindow('366'), null);
	assert.equal(reportingWindow('30'), 30);
	assert.equal(reportingWindow(String(GRC_WINDOW_DEFAULT)), 30);
	assert.deepEqual(toggleFramework([2], 2), []);
	assert.deepEqual(toggleFramework([2], 1), [2, 1]);
	assert.deepEqual(toggleFramework([1], 0), [1]);
	assert.equal(REPORTING_FRAMEWORK_FILTER_LABEL.includes('conformité'), true);
	assert.equal(REPORTING_FRAMEWORK_SCOPE, 'compliance');
});

test('empty reporting stays a readable zero state', () => {
	assert.equal(isReportingZero(emptyReport()), true);
	const filled = emptyReport();
	filled.executive.openRisks = 1;
	assert.equal(isReportingZero(filled), false);
});

test('simulated session covers access, states and viewports', () => {
	const report = emptyReport();
	for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
		const denied = simulateReportingSession({
			permissions: ['grc.dashboard.read'],
			phase: 'ready',
			report,
			viewport
		});
		assert.equal(denied.access, 'denied');
		assert.equal(denied.sections.length, 0);
		assert.equal(denied.horizontalPageScroll, false);

		const loading = simulateReportingSession({
			permissions: ['grc.reporting.read'],
			phase: 'loading',
			report: null,
			viewport
		});
		assert.equal(loading.access, 'allowed');
		assert.equal(loading.phase, 'loading');

		const error = simulateReportingSession({
			permissions: ['*'],
			phase: 'error',
			report: null,
			viewport
		});
		assert.equal(error.phase, 'error');

		const ready = simulateReportingSession({
			permissions: ['grc.reporting.read'],
			phase: 'ready',
			report,
			viewport
		});
		assert.equal(ready.zero, true);
		assert.equal(ready.scope, 'compliance');
		assert.equal(ready.sections.length, 9);
		assert.equal(ready.viewport, viewport);
	}
});
