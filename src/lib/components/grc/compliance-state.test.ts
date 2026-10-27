import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcComplianceCoverage } from '$lib/types/grc';
import {
	canManageMapping,
	canReadControls,
	canReadCoverage,
	canReadFrameworks,
	canReadRequirements,
	coverageNote,
	coverageOf,
	coveragePercent,
	coverageText,
	emptyFrameworkFilters,
	emptyRequirementFilters,
	frameworkQuery,
	frameworkStatusLabel,
	hasActiveRequirementFilters,
	mappingLabel,
	requirementQuery,
	requirementStatusLabel
} from './compliance-state.ts';
import { coverageDetail, formatGrcPercent } from './dashboard-state.ts';

const coverage = (
	frameworkId: number | null,
	requirements: number,
	applicable: number,
	mapped: number,
	percent: number
): GrcComplianceCoverage => ({
	frameworkId,
	requirements,
	applicableRequirements: applicable,
	mappedRequirements: mapped,
	unmappedRequirements: applicable - mapped,
	controlMappingCoverage: { numerator: mapped, denominator: applicable, percent }
});

test('labels cover exactly the backend framework and requirement enums', () => {
	assert.deepEqual(Object.keys(frameworkStatusLabel), ['DRAFT', 'ACTIVE', 'ARCHIVED']);
	assert.deepEqual(Object.keys(requirementStatusLabel), ['ACTIVE', 'INACTIVE']);
});

test('compliance permissions follow the existing routes', () => {
	assert.equal(canReadFrameworks(['grc.framework.read']), true);
	assert.equal(canReadRequirements(['grc.framework.read']), false);
	assert.equal(canReadCoverage(['grc.framework.read']), false);
	assert.equal(canReadCoverage(['grc.framework.read', 'grc.requirement.read']), true);
	assert.equal(canReadCoverage(['*']), true);
	assert.equal(canReadControls(['grc.control.read']), true);
	// Mapping is managed with grc.control.manage only (POST/DELETE /requirement-controls).
	assert.equal(canManageMapping(['grc.requirement.manage', 'grc.framework.manage']), false);
	assert.equal(canManageMapping(['grc.control.manage']), true);
	assert.equal(canReadFrameworks(['grc.risk.read', 'grc.dashboard.read']), false);
});

test('coverage is presented exactly like the GRC dashboard', () => {
	const c = coverage(1, 4, 3, 2, 66.67);
	assert.equal(coveragePercent(c), formatGrcPercent(66.67));
	assert.equal(coverageText(c), coverageDetail(c.controlMappingCoverage));
	assert.equal(coveragePercent(null), '—');
	assert.equal(coverageText(coverage(null, 0, 0, 0, 0)), 'Aucune exigence applicable');
});

test('a 0/0 coverage is explained, never shown as a failure', () => {
	assert.equal(
		coverageNote('DRAFT', coverage(2, 1, 0, 0, 0)),
		'Référentiel non actif : aucune exigence applicable.'
	);
	assert.equal(coverageNote('ACTIVE', coverage(3, 0, 0, 0, 0)), 'Aucune exigence enregistrée.');
	assert.equal(coverageNote('ACTIVE', coverage(4, 2, 0, 0, 0)), 'Aucune exigence active.');
	assert.equal(coverageNote('ACTIVE', coverage(1, 4, 3, 2, 66.67)), '');
	assert.equal(coverageNote('ACTIVE', null), '');
});

test('coverage lookup by framework in a report', () => {
	const rows = [coverage(1, 4, 3, 2, 66.67), coverage(2, 1, 0, 0, 0)];
	assert.equal(coverageOf(rows, 2)?.requirements, 1);
	assert.equal(coverageOf(rows, 9), null);
});

test('mapping is always described in text', () => {
	assert.equal(mappingLabel(0), 'Non couverte');
	assert.equal(mappingLabel(1), 'Couverte · 1 contrôle');
	assert.equal(mappingLabel(3), 'Couverte · 3 contrôles');
});

test('queries send only the filters that are set', () => {
	assert.deepEqual(frameworkQuery(emptyFrameworkFilters()), { page: 1, limit: 20 });
	assert.deepEqual(frameworkQuery({ search: ' iso ', status: 'ACTIVE', page: 2 }), {
		page: 2,
		limit: 20,
		search: 'iso',
		status: 'ACTIVE'
	});
	assert.deepEqual(requirementQuery(7, emptyRequirementFilters()), {
		frameworkId: 7,
		page: 1,
		limit: 20
	});
	assert.deepEqual(
		requirementQuery(7, { search: 'a.5', status: 'ACTIVE', mapped: 'false', page: 3 }),
		{
			frameworkId: 7,
			page: 3,
			limit: 20,
			search: 'a.5',
			status: 'ACTIVE',
			mapped: 'false'
		}
	);
	assert.equal(hasActiveRequirementFilters(emptyRequirementFilters()), false);
	assert.equal(hasActiveRequirementFilters({ ...emptyRequirementFilters(), mapped: 'true' }), true);
});
