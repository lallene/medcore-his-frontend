import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { GrcRisk } from '$lib/types/grc';
import {
	canCreateRisks,
	canReadRisks,
	canUpdateRisks,
	emptyRiskFilters,
	emptyRiskForm,
	hasActiveRiskFilters,
	productPreview,
	riskFormFrom,
	riskLevelName,
	riskPayload,
	riskQuery,
	riskRelationAccess,
	riskStatusLabel,
	riskTreatmentLabel,
	scoreText,
	validateRiskForm
} from './risk-state.ts';

const risk: GrcRisk = {
	id: 7,
	reference: 'RISK-001',
	title: 'Indisponibilité DPI',
	description: 'Panne',
	assetId: 3,
	owningServiceId: 2,
	ownerProfileId: 5,
	approverProfileId: 6,
	threat: 'Panne',
	vulnerability: 'Pas de redondance',
	likelihood: 4,
	impact: 5,
	inherentScore: 20,
	inherentLevel: 'CRITICAL',
	residualLikelihood: 2,
	residualImpact: 3,
	residualScore: 6,
	residualLevel: 'MEDIUM',
	treatment: 'REDUCE',
	treatmentDueAt: '2026-12-31T00:00:00Z',
	status: 'OPEN',
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

test('labels cover exactly the backend risk enums and the API levels', () => {
	assert.deepEqual(Object.keys(riskStatusLabel), [
		'DRAFT',
		'OPEN',
		'IN_TREATMENT',
		'ACCEPTED',
		'CLOSED'
	]);
	assert.deepEqual(Object.keys(riskTreatmentLabel), ['REDUCE', 'ACCEPT', 'AVOID', 'TRANSFER']);
	assert.deepEqual(Object.keys(riskLevelName), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
});

test('levels come from the API: the frontend holds no threshold', () => {
	// The level shown is the one the server returned, even for an unexpected score.
	assert.equal(scoreText(20, 'CRITICAL'), '20 · Critique');
	assert.equal(scoreText(6, 'MEDIUM'), '6 · Modéré');
	assert.equal(scoreText(4, 'UNKNOWN'), '4 · UNKNOWN');
	const source = readFileSync(new URL('./risk-state.ts', import.meta.url), 'utf8');
	assert.doesNotMatch(
		source,
		/(>=|<=|<|>)\s*(4|5|9|10|14|15)\b/,
		'no RiskLevel threshold in the frontend'
	);
});

test('risk actions follow create/update/read permissions separately', () => {
	assert.equal(canReadRisks(['grc.risk.read']), true);
	assert.equal(canCreateRisks(['grc.risk.read']), false);
	assert.equal(canUpdateRisks(['grc.risk.create']), false);
	assert.equal(canCreateRisks(['grc.risk.create']) && canUpdateRisks(['grc.risk.update']), true);
	assert.equal(canUpdateRisks(['grc.risk.approve']), false);
	assert.equal(canReadRisks(['grc.asset.read', 'grc.dashboard.read']), false);
	assert.equal(canReadRisks(['*']) && canCreateRisks(['*']) && canUpdateRisks(['*']), true);
	assert.deepEqual(riskRelationAccess(['grc.risk.read', 'grc.action.read']), {
		controls: false,
		actions: true,
		findings: false
	});
});

test('list query sends only the filters that are set', () => {
	assert.deepEqual(riskQuery(emptyRiskFilters()), { page: 1, limit: 20 });
	assert.equal(hasActiveRiskFilters(emptyRiskFilters()), false);
	assert.deepEqual(
		riskQuery({
			search: ' panne ',
			status: 'OPEN',
			treatment: 'REDUCE',
			inherentLevel: 'CRITICAL',
			residualLevel: 'MEDIUM',
			assetId: 3,
			page: 2
		}),
		{
			page: 2,
			limit: 20,
			search: 'panne',
			status: 'OPEN',
			treatment: 'REDUCE',
			inherentLevel: 'CRITICAL',
			residualLevel: 'MEDIUM',
			assetId: 3
		}
	);
	assert.equal(hasActiveRiskFilters({ ...emptyRiskFilters(), residualLevel: 'HIGH' }), true);
	assert.equal(hasActiveRiskFilters({ ...emptyRiskFilters(), assetId: 4 }), true);
});

test('form validation mirrors the backend rules for UX only', () => {
	assert.deepEqual(Object.keys(validateRiskForm(emptyRiskForm())).sort(), [
		'impact',
		'likelihood',
		'reference',
		'residualImpact',
		'residualLikelihood',
		'title',
		'treatment'
	]);
	const valid = riskFormFrom(risk);
	assert.deepEqual(validateRiskForm(valid), {});
	assert.ok(validateRiskForm({ ...valid, reference: '  ' }).reference);
	assert.ok(validateRiskForm({ ...valid, reference: 'É'.repeat(61) }).reference);
	assert.deepEqual(validateRiskForm({ ...valid, reference: 'É'.repeat(60) }), {});
	assert.ok(validateRiskForm({ ...valid, title: 't'.repeat(221) }).title);
	assert.ok(validateRiskForm({ ...valid, likelihood: 6 }).likelihood);
	assert.ok(validateRiskForm({ ...valid, residualImpact: 0 }).residualImpact);
	assert.ok(validateRiskForm({ ...valid, status: 'ARCHIVED' }).status);
	assert.ok(validateRiskForm({ ...valid, treatmentDueDate: '31/12/2026' }).treatmentDueDate);
});

test('score preview shows probability × impact without any level', () => {
	assert.equal(productPreview(4, 5), '4 × 5 = 20');
	assert.equal(productPreview(null, 5), '—');
});

test('payload carries no server-managed, score or level field', () => {
	const payload = riskPayload({ ...riskFormFrom(risk), reference: ' risk-001 ' });
	assert.deepEqual(payload, {
		reference: 'risk-001',
		title: 'Indisponibilité DPI',
		description: 'Panne',
		assetId: 3,
		owningServiceId: 2,
		ownerProfileId: 5,
		approverProfileId: 6,
		threat: 'Panne',
		vulnerability: 'Pas de redondance',
		likelihood: 4,
		impact: 5,
		residualLikelihood: 2,
		residualImpact: 3,
		treatment: 'REDUCE',
		treatmentDueAt: '2026-12-31T00:00:00Z',
		status: 'OPEN'
	});
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'inherentScore',
		'residualScore',
		'inherentLevel',
		'residualLevel'
	])
		assert.equal(key in payload, false, key);
	assert.equal(riskPayload({ ...riskFormFrom(risk), treatmentDueDate: '' }).treatmentDueAt, null);
});
