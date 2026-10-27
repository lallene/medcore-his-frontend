import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcCount, GrcDashboard } from '$lib/types/grc';
import {
	attentionItems,
	canReadGrcDashboard,
	coverageDetail,
	distributionRows,
	formatGrcPercent,
	isGrcDashboardEmpty,
	parseGrcWindow,
	riskLevelLabel,
	riskLevelTone
} from './dashboard-state.ts';

const counts = (keys: string[], values: number[] = []): GrcCount[] =>
	keys.map((key, i) => ({ key, count: values[i] ?? 0 }));
const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function dashboard(overrides: Partial<GrcDashboard> = {}): GrcDashboard {
	const zeroRatio = { numerator: 0, denominator: 0, percent: 0 };
	return {
		generatedAt: '2026-06-01T12:00:00Z',
		windows: { expiringSoonDays: 30, dueSoonDays: 15 },
		summary: {
			assets: 0,
			openRisks: 0,
			criticalOrHighRisks: 0,
			controls: 0,
			evidenceIssues: 0,
			openRemediationActions: 0,
			openFindings: 0,
			overdueItems: 0,
			controlMappingCoveragePercent: 0
		},
		assets: { total: 0, active: 0, critical: 0, byStatus: [], byCriticality: [] },
		risks: {
			total: 0,
			open: 0,
			critical: 0,
			high: 0,
			byStatus: [],
			residualByLevel: counts(LEVELS),
			inherentByLevel: counts(LEVELS)
		},
		controls: {
			total: 0,
			byStatus: [],
			implementations: 0,
			implementationsByStatus: [],
			implementationsByLatestAssessmentResult: []
		},
		compliance: {
			frameworks: 0,
			frameworksByStatus: [],
			requirements: 0,
			applicableRequirements: 0,
			mappedRequirements: 0,
			unmappedRequirements: 0,
			controlMappingCoverage: zeroRatio
		},
		evidence: { total: 0, byStatus: [], valid: 0, expired: 0, expiringSoon: 0, invalid: 0 },
		actions: { total: 0, byStatus: [], byPriority: [], open: 0, overdue: 0, dueSoon: 0 },
		assessments: { total: 0, byStatus: [], reassessmentDue: 0, hasInvalidEvidence: 0 },
		audits: { total: 0, byStatus: [] },
		findings: { total: 0, byStatus: [], bySeverity: [], open: 0, overdue: 0 },
		attention: {
			criticalResidualRisks: 0,
			highResidualRisks: 0,
			expiredEvidence: 0,
			evidenceExpiringSoon: 0,
			overdueActions: 0,
			actionsDueSoon: 0,
			reassessmentsDue: 0,
			overdueFindings: 0
		},
		...overrides
	};
}

test('GRC dashboard requires grc.dashboard.read (or the wildcard) only', () => {
	assert.equal(canReadGrcDashboard(['grc.dashboard.read']), true);
	assert.equal(canReadGrcDashboard(['*']), true);
	assert.equal(canReadGrcDashboard([]), false);
	assert.equal(
		canReadGrcDashboard(['dashboard.read', 'grc.risk.read', 'grc.evidence.read']),
		false
	);
});

test('soon windows are strict integers between 1 and 365, never corrected', () => {
	assert.equal(parseGrcWindow('1'), 1);
	assert.equal(parseGrcWindow(' 30 '), 30);
	assert.equal(parseGrcWindow('365'), 365);
	for (const raw of ['', '0', '366', '-1', '1.5', 'abc', '30j', '1e2']) {
		assert.equal(parseGrcWindow(raw), null, raw);
	}
});

test('risk level rows keep the API order with text labels and the validated grid', () => {
	const rows = distributionRows(counts(LEVELS, [1, 0, 2, 1]), riskLevelLabel, riskLevelTone);
	assert.deepEqual(
		rows.map((r) => [r.label, r.value, r.tone]),
		[
			['Faible (1–4)', 1, 'success'],
			['Modéré (5–9)', 0, 'info'],
			['Élevé (10–14)', 2, 'warning'],
			['Critique (15–25)', 1, 'danger']
		]
	);
	// An unknown key stays visible with its code instead of disappearing.
	assert.deepEqual(distributionRows([{ key: 'NEW', count: 3 }])[0], {
		id: 'NEW',
		label: 'NEW',
		value: 3,
		tone: 'primary'
	});
});

test('coverage is described with its numerator and denominator', () => {
	assert.equal(
		coverageDetail({ numerator: 1, denominator: 3, percent: 33.33 }),
		'1 exigence(s) couverte(s) sur 3 applicable(s)'
	);
	assert.equal(
		coverageDetail({ numerator: 0, denominator: 0, percent: 0 }),
		'Aucune exigence applicable'
	);
	assert.equal(formatGrcPercent(33.33).replace(/\s/g, ' '), '33,33 %');
	assert.equal(formatGrcPercent(0).replace(/\s/g, ' '), '0 %');
});

test('attention items follow the API figures in a fixed order, without weighting', () => {
	const items = attentionItems(
		dashboard({
			attention: {
				criticalResidualRisks: 1,
				highResidualRisks: 2,
				expiredEvidence: 3,
				evidenceExpiringSoon: 4,
				overdueActions: 5,
				actionsDueSoon: 6,
				reassessmentsDue: 7,
				overdueFindings: 8
			}
		})
	);
	assert.deepEqual(
		items.map((i) => [i.id, i.count]),
		[
			['criticalResidualRisks', 1],
			['highResidualRisks', 2],
			['expiredEvidence', 3],
			['evidenceExpiringSoon', 4],
			['overdueActions', 5],
			['actionsDueSoon', 6],
			['reassessmentsDue', 7],
			['overdueFindings', 8]
		]
	);
	// Window labels come from the response, not from a hard-coded default.
	assert.match(items[3].description, /30 prochains jours/);
	assert.match(items[5].description, /15 prochains jours/);
});

test('empty state only when no GRC record exists', () => {
	assert.equal(isGrcDashboardEmpty(dashboard()), true);
	assert.equal(isGrcDashboardEmpty(dashboard({ audits: { total: 1, byStatus: [] } })), false);
	assert.equal(
		isGrcDashboardEmpty(
			dashboard({
				compliance: {
					...dashboard().compliance,
					requirements: 2
				}
			})
		),
		false
	);
});
