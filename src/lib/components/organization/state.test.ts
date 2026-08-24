import assert from 'node:assert/strict';
import test from 'node:test';
import { eligibleServices, organizationTree } from './state.ts';
import type { OrganizationDepartment, OrganizationService } from '../../types/organization.ts';
const service = (id: number, name: string, active = true): OrganizationService => ({
	id,
	departmentId: 1,
	code: name.slice(0, 3).toUpperCase(),
	name,
	shortName: '',
	serviceType: 'CLINICAL',
	active,
	clinical: true,
	supportsHospitalization: id === 1,
	supportsConsultation: true,
	supportsBeds: id === 1,
	sortOrder: id
});
test('ServiceSelect excludes inactive units and respects capabilities', () => {
	const items = [service(1, 'Urgences'), service(2, 'ORL'), service(3, 'Ancien', false)];
	assert.deepEqual(
		eligibleServices(items, 'beds').map((x) => x.id),
		[1]
	);
	assert.deepEqual(
		eligibleServices(items, 'consultation').map((x) => x.id),
		[1, 2]
	);
});
test('organization tree preserves hierarchical deterministic order', () => {
	const a = {
		id: 2,
		code: 'B',
		name: 'B',
		description: '',
		active: true,
		sortOrder: 20,
		services: [service(2, 'ORL'), service(1, 'Urgences')]
	} as OrganizationDepartment;
	const b = { ...a, id: 1, code: 'A', name: 'A', sortOrder: 10, services: [] };
	const tree = organizationTree([a, b]);
	assert.deepEqual(
		tree.map((x) => x.code),
		['A', 'B']
	);
	assert.deepEqual(
		tree[1].services.map((x) => x.id),
		[1, 2]
	);
});
