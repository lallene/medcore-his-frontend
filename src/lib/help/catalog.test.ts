import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import type { HelpCatalogResponse, HelpEntry } from '$lib/types/help';
import {
	HELP_MODULES,
	createHelpCatalogLoader,
	hasDetailedHelp,
	helpModuleLabel,
	helpModulesWithCounts,
	normalizeHelpText,
	searchHelp
} from './catalog.ts';
import { buildVisibleNavigation } from '../rbac/navigation.ts';

const entry = (over: Partial<HelpEntry>): HelpEntry => ({
	helpKey: 'billing.demo.x',
	module: 'billing',
	page: '/billing',
	elementType: 'field',
	elementLabel: 'Libellé',
	shortHelp: 'Aide courte',
	sortOrder: 0,
	...over
});

const sample: HelpEntry[] = [
	entry({
		helpKey: 'consultation.vitals.glycemia',
		module: 'consultations',
		elementLabel: 'Glycémie',
		shortHelp: 'Glycémie en g/L.',
		sortOrder: 70
	}),
	entry({
		helpKey: 'billing.refund.reason',
		module: 'billing',
		elementLabel: 'Motif du remboursement',
		shortHelp: 'Motif réglementé.',
		detailedHelp: 'Le motif « Autre » exige une validation managériale.',
		sortOrder: 80
	}),
	entry({
		helpKey: 'cash.session.opening_float',
		module: 'cash',
		elementLabel: 'Fond initial',
		shortHelp: 'Espèces à l’ouverture.',
		sortOrder: 10
	}),
	entry({
		helpKey: 'billing.payment.method',
		module: 'billing',
		elementLabel: 'Mode de paiement',
		shortHelp: 'Les espèces passent par la caisse.',
		sortOrder: 20
	})
];

test('normalizeHelpText strips accents, case and extra spaces', () => {
	assert.equal(normalizeHelpText('  Glycémie   À JEUN '), 'glycemie a jeun');
	assert.equal(normalizeHelpText('Référence d’attestation'), 'reference d attestation');
});

test('searchHelp is accent / case insensitive and requires every word', () => {
	assert.deepEqual(
		searchHelp(sample, 'GLYCEMIE').map((e) => e.helpKey),
		['consultation.vitals.glycemia']
	);
	assert.deepEqual(
		searchHelp(sample, 'ESPECES passent').map((e) => e.helpKey),
		['billing.payment.method']
	);
	assert.equal(searchHelp(sample, 'manageriale').length, 1, 'detailed help is searchable');
	assert.ok(
		searchHelp(sample, 'caisse').some((e) => e.helpKey === 'cash.session.opening_float'),
		'module label is searchable'
	);
	assert.equal(searchHelp(sample, 'glycemie remboursement').length, 0);
});

test('searchHelp filters by module and keeps module then sortOrder ordering', () => {
	assert.deepEqual(
		searchHelp(sample, '', 'billing').map((e) => e.helpKey),
		['billing.payment.method', 'billing.refund.reason']
	);
	const all = searchHelp(sample, '').map((e) => e.module);
	assert.deepEqual(all, ['consultations', 'billing', 'billing', 'cash']);
	// Label matches rank before body matches.
	const hits = searchHelp(
		[
			entry({ helpKey: 'billing.a.b', elementLabel: 'Autre', shortHelp: 'Fond initial cité' }),
			entry({ helpKey: 'cash.a.b', module: 'cash', elementLabel: 'Fond initial' })
		],
		'fond initial'
	);
	assert.equal(hits[0].helpKey, 'cash.a.b');
});

test('helpModulesWithCounts lists only real modules having entries, in display order', () => {
	const mods = helpModulesWithCounts(sample);
	assert.deepEqual(
		mods.map((m) => [m.key, m.count]),
		[
			['consultations', 1],
			['billing', 2],
			['cash', 1]
		]
	);
	assert.equal(helpModuleLabel('insurance'), 'Assurance / PEC');
	assert.ok(HELP_MODULES.every((m) => m.label.length > 0));
});

test('hasDetailedHelp distinguishes tooltip-only entries', () => {
	assert.equal(hasDetailedHelp(sample[0]), false);
	assert.equal(hasDetailedHelp(sample[1]), true);
	assert.equal(hasDetailedHelp(undefined), false);
	assert.equal(hasDetailedHelp(entry({ actionHelp: 'Cocher puis saisir.' })), true);
});

test('catalog loader: single request, shared in-flight promise, cached, reset', async () => {
	let calls = 0;
	const loader = createHelpCatalogLoader(async (): Promise<HelpCatalogResponse> => {
		calls++;
		return { version: 'v1', entries: sample };
	});
	const [a, b] = await Promise.all([loader.load(), loader.load()]);
	assert.equal(calls, 1, 'concurrent callers share one request');
	assert.equal(a, b);
	await loader.load();
	assert.equal(calls, 1, 'loaded catalog is cached');
	assert.equal(loader.get('cash.session.opening_float')?.elementLabel, 'Fond initial');
	assert.equal(loader.get('unknown.key.x'), undefined);
	loader.reset();
	assert.equal(loader.loaded(), false);
	await loader.load();
	assert.equal(calls, 2, 'reset forces a reload (new session)');
});

test('catalog loader never throws and retries after a failure', async () => {
	let calls = 0;
	const loader = createHelpCatalogLoader(async () => {
		calls++;
		if (calls === 1) throw new Error('network');
		return { version: 'v2', entries: sample };
	});
	const first = await loader.load();
	assert.equal(first.size, 0);
	assert.equal(loader.loaded(), false);
	const second = await loader.load();
	assert.equal(second.size, sample.length);
});

test('help center is reachable from navigation for any authenticated user', () => {
	const visible = buildVisibleNavigation([]).flatMap((section) => section.entries);
	assert.ok(visible.some((entry) => entry.kind === 'link' && entry.item.href === '/help'));
});

test('every helpKey used in the UI is well-formed and maps to a known module namespace', () => {
	const prefixes = [
		'patient.',
		'agenda.',
		'queue.',
		'consultation.',
		'laboratory.',
		'imaging.',
		'pharmacy.',
		'hospitalization.',
		'performed_act.',
		'billing.',
		'cash.',
		'insurance.',
		'insurance_receivables.',
		'administration.',
		'ticket.'
	];
	const keys = new Set<string>();
	const walk = (dir: string) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (name.endsWith('.svelte')) {
				const src = readFileSync(path, 'utf8');
				for (const m of src.matchAll(/helpKey="([^"]+)"/g)) keys.add(m[1]);
				for (const m of src.matchAll(/:\s*'((?:queue)\.[a-z0-9_.]+)'/g)) keys.add(m[1]);
			}
		}
	};
	walk(join(process.cwd(), 'src'));
	assert.ok(keys.size >= 50, `expected the V1 instrumentation, found ${keys.size} keys`);
	for (const key of keys) {
		assert.match(key, /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}$/, key);
		assert.ok(
			prefixes.some((p) => key.startsWith(p)),
			`${key} does not belong to a MedCore module`
		);
	}
});
