import type { HelpCatalogResponse, HelpEntry } from '$lib/types/help';

/**
 * LOT AIDE — help catalog logic (pure, testable with node:test).
 * The backend is the authority: entries arrive already filtered by permissions.
 */

/** Modules really present in MedCore (mirror of backend help.Modules), in display order. */
export const HELP_MODULES: ReadonlyArray<{ key: string; label: string }> = [
	{ key: 'patients', label: 'Patients' },
	{ key: 'agenda', label: 'Agenda' },
	{ key: 'queue', label: 'File patients' },
	{ key: 'consultations', label: 'Consultations' },
	{ key: 'laboratory', label: 'Laboratoire' },
	{ key: 'imaging', label: 'Imagerie' },
	{ key: 'pharmacy', label: 'Pharmacie' },
	{ key: 'hospitalizations', label: 'Hospitalisations' },
	{ key: 'performed_acts', label: 'Actes réalisés' },
	{ key: 'billing', label: 'Facturation' },
	{ key: 'cash', label: 'Caisse' },
	{ key: 'insurance', label: 'Assurance / PEC' },
	{ key: 'insurance_receivables', label: 'Créances assureurs' },
	{ key: 'administration', label: 'Administration' },
	{ key: 'tickets', label: 'Support' }
];

export function helpModuleLabel(module: string): string {
	return HELP_MODULES.find((m) => m.key === module)?.label ?? module;
}

/** Lower-case, accent-free, whitespace-collapsed form used for search. */
export function normalizeHelpText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’']/g, ' ')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function haystack(entry: HelpEntry): string {
	return normalizeHelpText(
		[
			entry.elementLabel,
			entry.shortHelp,
			entry.detailedHelp ?? '',
			entry.actionHelp ?? '',
			helpModuleLabel(entry.module),
			entry.helpKey
		].join(' ')
	);
}

/**
 * Every query word must appear (accent / case insensitive). Results: label matches first,
 * then module order, then sortOrder.
 */
export function searchHelp(entries: HelpEntry[], query: string, module = ''): HelpEntry[] {
	const words = normalizeHelpText(query).split(' ').filter(Boolean);
	const scoped = module ? entries.filter((e) => e.module === module) : entries;
	const matches = words.length
		? scoped.filter((e) => {
				const text = haystack(e);
				return words.every((w) => text.includes(w));
			})
		: scoped;
	const moduleRank = (m: string) => {
		const i = HELP_MODULES.findIndex((x) => x.key === m);
		return i < 0 ? HELP_MODULES.length : i;
	};
	const labelHit = (e: HelpEntry) =>
		words.length && words.every((w) => normalizeHelpText(e.elementLabel).includes(w)) ? 0 : 1;
	return [...matches].sort(
		(a, b) =>
			labelHit(a) - labelHit(b) ||
			moduleRank(a.module) - moduleRank(b.module) ||
			a.sortOrder - b.sortOrder ||
			a.helpKey.localeCompare(b.helpKey)
	);
}

/** Modules that actually have visible entries, with counts, in display order. */
export function helpModulesWithCounts(
	entries: HelpEntry[]
): Array<{ key: string; label: string; count: number }> {
	const counts = new Map<string, number>();
	for (const e of entries) counts.set(e.module, (counts.get(e.module) ?? 0) + 1);
	return HELP_MODULES.filter((m) => counts.has(m.key)).map((m) => ({
		...m,
		count: counts.get(m.key) ?? 0
	}));
}

export function hasDetailedHelp(entry: HelpEntry | undefined | null): boolean {
	return !!entry && !!((entry.detailedHelp ?? '').trim() || (entry.actionHelp ?? '').trim());
}

export type HelpCatalogLoader = {
	/** Loads once; concurrent callers share the same request. */
	load(): Promise<Map<string, HelpEntry>>;
	/** Synchronous lookup once loaded (undefined while loading or for unknown keys). */
	get(key: string): HelpEntry | undefined;
	entries(): HelpEntry[];
	loaded(): boolean;
	/** Drop the cache (logout / user switch). */
	reset(): void;
};

/**
 * Session cache: a single HTTP call for the whole catalog, shared by every help hint.
 * A failed load is not cached (a later call retries) and never throws to the caller.
 */
export function createHelpCatalogLoader(
	fetchCatalog: () => Promise<HelpCatalogResponse>
): HelpCatalogLoader {
	let byKey = new Map<string, HelpEntry>();
	let list: HelpEntry[] = [];
	let done = false;
	let inflight: Promise<Map<string, HelpEntry>> | null = null;
	let generation = 0;
	return {
		load() {
			if (done) return Promise.resolve(byKey);
			if (inflight) return inflight;
			const gen = generation;
			inflight = fetchCatalog()
				.then((res) => {
					if (gen !== generation) return byKey;
					list = Array.isArray(res?.entries) ? res.entries : [];
					byKey = new Map(list.map((e) => [e.helpKey, e]));
					done = true;
					return byKey;
				})
				.catch(() => byKey)
				.finally(() => {
					if (gen === generation) inflight = null;
				});
			return inflight;
		},
		get: (key) => byKey.get(key),
		entries: () => list,
		loaded: () => done,
		reset() {
			generation++;
			byKey = new Map();
			list = [];
			done = false;
			inflight = null;
		}
	};
}
