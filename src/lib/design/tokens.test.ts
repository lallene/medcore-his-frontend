import assert from 'node:assert/strict';
import test from 'node:test';
import { medcoreColors, medcoreControlHeight, medcoreTypography, medcoreZIndex } from './theme.ts';
import {
	buttonBaseClasses,
	buttonDisabledClasses,
	buttonSizeClasses,
	buttonVariantClasses,
	statusBadgeClass,
	statusTone
} from './status.ts';

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

test('semantic tones expose an AA-safe strong variant distinct from the base', () => {
	const { semantic } = medcoreColors;
	assert.equal(semantic.successStrong, '#047857');
	assert.equal(semantic.dangerStrong, '#B91C1C');
	assert.notEqual(semantic.warningStrong, semantic.warning);
	assert.notEqual(semantic.infoStrong, semantic.info);
});

test('button variants keep destructive and primary intents distinct', () => {
	assert.match(buttonVariantClasses.primary, /bg-primary/);
	assert.match(buttonVariantClasses.danger, /bg-danger-strong/);
	assert.doesNotMatch(buttonVariantClasses.secondary, /(^|\s)bg-primary(\s|$)|bg-danger/);
	assert.doesNotMatch(buttonVariantClasses.ghost, /(^|\s)bg-primary(\s|$)|bg-danger/);
});

test('layers and control heights are ordered tokens', () => {
	assert.ok(medcoreZIndex.dropdown < medcoreZIndex.topbar);
	assert.ok(medcoreZIndex.sidebar < medcoreZIndex.modal);
	assert.ok(medcoreZIndex.modal < medcoreZIndex.toast);
	assert.equal(medcoreControlHeight.md, '2.5rem');
});

test('ghost buttons are visibly interactive at rest without becoming secondary', () => {
	assert.doesNotMatch(buttonVariantClasses.ghost, /(^|\s)bg-transparent(\s|$)/);
	assert.match(buttonVariantClasses.ghost, /(^|\s)bg-primary-soft(\s|$)/);
	assert.doesNotMatch(buttonVariantClasses.ghost, /border-border-strong|bg-surface(\s|$)/);
	assert.notEqual(buttonVariantClasses.ghost, buttonVariantClasses.secondary);
});

test('buttons and button-styled links share base, size and disabled classes', () => {
	assert.match(buttonBaseClasses, /inline-flex/);
	assert.match(buttonDisabledClasses, /aria-disabled:opacity-55/);
	assert.match(buttonDisabledClasses, /disabled:opacity-55/);
	assert.match(buttonSizeClasses.md, /min-h-control/);
});
