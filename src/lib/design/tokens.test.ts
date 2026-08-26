import assert from 'node:assert/strict';
import test from 'node:test';
import { medcoreColors, medcoreTypography } from './theme.ts';
import { statusBadgeClass, statusTone } from './status.ts';

test('primary and success keep stable brand meanings', () => {
	assert.equal(medcoreColors.primary, '#0E4C92');
	assert.equal(medcoreColors.semantic.success, '#18B893');
	assert.equal(medcoreColors.semantic.danger, '#EF4444');
	assert.notEqual(medcoreColors.secondary, medcoreColors.semantic.success);
});

test('status tones are centralized for QA and ticketing', () => {
	assert.equal(statusTone('PASSED'), 'success');
	assert.equal(statusTone('FAILED'), 'danger');
	assert.equal(statusTone('DRAFT'), 'warning');
	assert.equal(statusTone('P1'), 'danger');
	assert.match(statusBadgeClass('RESOLVED'), /emerald/);
});

test('typography tokens expose page and label roles', () => {
	assert.match(medcoreTypography.pageTitle, /text-3xl/);
	assert.match(medcoreTypography.label, /font-semibold/);
	assert.match(medcoreTypography.eyebrow, /text-primary/);
});
