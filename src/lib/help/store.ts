import { writable } from 'svelte/store';
import { fetchHelpCatalog } from '$lib/api/help';
import { token } from '$lib/stores/auth';
import type { HelpEntry } from '$lib/types/help';
import { createHelpCatalogLoader } from './catalog';

const loader = createHelpCatalogLoader(fetchHelpCatalog);

/** Visible help entries by key (empty until the single catalog request resolves). */
export const helpEntries = writable<Map<string, HelpEntry>>(new Map());

/** Idempotent: every HelpHint calls it; only the first triggers the HTTP request. */
export function ensureHelpCatalog(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve();
	return loader.load().then((byKey) => helpEntries.set(new Map(byKey)));
}

export function helpEntryList(): HelpEntry[] {
	return loader.entries();
}

export function resetHelpCatalog(): void {
	loader.reset();
	helpEntries.set(new Map());
}

// The visible catalog depends on the user's permissions: drop it whenever the session changes.
let lastToken: string | null | undefined;
token.subscribe((value) => {
	if (lastToken !== undefined && value !== lastToken) resetHelpCatalog();
	lastToken = value;
});
