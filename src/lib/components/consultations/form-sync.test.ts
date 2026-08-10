import assert from 'node:assert/strict';
import test from 'node:test';

import { formSnapshot, isFormDirty, shouldHydrateForm, uniquePositiveIDs } from './form-sync.ts';

test('initial mount hydrates from the prop', () => {
	assert.equal(shouldHydrateForm({ initialized: false, sameEntity: true, dirty: false }), true);
});

test('a changed prop hydrates a clean form', () => {
	assert.equal(shouldHydrateForm({ initialized: true, sameEntity: true, dirty: false }), true);
});

test('a changed consultation identity always hydrates', () => {
	assert.equal(shouldHydrateForm({ initialized: true, sameEntity: false, dirty: true }), true);
});

test('save then refresh hydrates because the saved draft becomes the baseline', () => {
	const saved = { diagnosis: 'serveur' };
	assert.equal(isFormDirty(saved, formSnapshot(saved)), false);
	assert.equal(shouldHydrateForm({ initialized: true, sameEntity: true, dirty: false }), true);
});

test('ExamEditor IDs are deduplicated during hydration', () => {
	assert.deepEqual(uniquePositiveIDs([3, 3, 2, 0, -1, 2]), [3, 2]);
});

test('PrescriptionForm replacement does not append stale entries', () => {
	const local = [{ id: 1 }, { id: 2 }];
	const server = [{ id: 2 }];
	const hydrated = structuredClone(server);
	assert.deepEqual(hydrated, [{ id: 2 }]);
	assert.notDeepEqual(hydrated, [...local, ...server]);
});

test('a dirty form protects local input until explicit hydration', () => {
	assert.equal(isFormDirty({ diagnosis: 'local' }, formSnapshot({ diagnosis: 'serveur' })), true);
	assert.equal(shouldHydrateForm({ initialized: true, sameEntity: true, dirty: true }), false);
	assert.equal(
		shouldHydrateForm({ initialized: true, sameEntity: true, dirty: true, force: true }),
		true
	);
});
