import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessCenter, canManageAccess, canManageMatrix, canManageOverrides } from './state.ts';

test('access center permission helpers', () => {
	assert.equal(canAccessCenter(['staff.read']), true);
	assert.equal(canAccessCenter(['patients:read']), false);
	assert.equal(canManageAccess(['rbac.user.manage']), true);
	assert.equal(canManageOverrides(['rbac.override.manage']), true);
	assert.equal(canManageMatrix(['rbac.matrix.manage']), true);
	assert.equal(canManageMatrix(['staff.manage']), false);
});
