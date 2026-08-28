import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { can, canAll, canAny, hasWildcard, isAccessDeniedError } from './permissions.ts';
import {
	adminMenu,
	defaultLandingRoute,
	filterVisibleNav,
	workspaceMenu,
	canAccessPath
} from './navigation.ts';

describe('rbac permissions', () => {
	it('wildcard grants all', () => {
		assert.equal(can(['*'], 'qa.read'), true);
		assert.equal(hasWildcard(['*']), true);
	});

	it('canAny and canAll', () => {
		const perms = ['billing.read', 'cash.session.read'];
		assert.equal(canAny(perms, ['qa.read', 'billing.read']), true);
		assert.equal(canAny(perms, ['qa.read']), false);
		assert.equal(canAll(perms, ['billing.read', 'cash.session.read']), true);
		assert.equal(canAll(perms, ['billing.read', 'qa.read']), false);
	});

	it('maps axios 403 marker', () => {
		assert.equal(isAccessDeniedError(new Error('ACCESS_DENIED')), true);
	});
});

describe('rbac navigation', () => {
	it('cashier menu hides clinical services', () => {
		const cashier = [
			'billing.read',
			'cash.register.read',
			'cash.session.read',
			'cash.payment.create',
			'ticket.read.own',
			'organization.read'
		];
		const visible = filterVisibleNav(workspaceMenu, cashier);
		assert.ok(visible.some((i) => i.href === '/cash'));
		assert.ok(!visible.some((i) => i.href === '/patients'));
		assert.ok(!visible.some((i) => i.href === '/dashboard'));
		const services = filterVisibleNav(
			[
				{ title: 'Pharmacie', href: '/pharmacy', permissions: ['pharmacy.stock.read'] },
				{ title: 'Laboratoire', href: '/laboratory', permissions: ['laboratory.read'] }
			],
			cashier
		);
		assert.equal(services.length, 0);
		assert.equal(filterVisibleNav(adminMenu, cashier).length, 0);
	});

	it('doctor lands on worklist not dashboard', () => {
		const doctor = [
			'patients:read',
			'queue.doctor.read',
			'laboratory.read',
			'ticket.read.own',
			'organization.read'
		];
		assert.equal(defaultLandingRoute(doctor), '/queue/doctor');
		assert.equal(canAccessPath('/laboratory', doctor), true);
		assert.equal(canAccessPath('/admin/access', doctor), false);
	});

	it('admin wildcard keeps access center', () => {
		assert.equal(defaultLandingRoute(['*']), '/dashboard');
		assert.equal(canAccessPath('/admin/access', ['*']), true);
	});
});
