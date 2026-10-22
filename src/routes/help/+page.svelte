<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { CircleHelp } from 'lucide-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import HelpArticle from '$lib/components/help/HelpArticle.svelte';
	import { ensureHelpCatalog, helpEntries } from '$lib/help/store';
	import { helpModuleLabel, helpModulesWithCounts, searchHelp } from '$lib/help/catalog';
	import type { HelpEntry } from '$lib/types/help';

	let loading = $state(true);
	let query = $state('');
	let moduleFilter = $state('');
	let selectedKey = $state('');

	const all = $derived<HelpEntry[]>([...$helpEntries.values()]);
	const modules = $derived(helpModulesWithCounts(all));
	const results = $derived(searchHelp(all, query, moduleFilter));
	const selected = $derived(results.find((e) => e.helpKey === selectedKey) ?? null);

	onMount(async () => {
		const key = page.url.searchParams.get('key') ?? '';
		const mod = page.url.searchParams.get('module') ?? '';
		await ensureHelpCatalog();
		const entry = key ? $helpEntries.get(key) : undefined;
		if (entry) {
			moduleFilter = entry.module;
			selectedKey = entry.helpKey;
		} else if (mod) {
			moduleFilter = mod;
		}
		loading = false;
	});
</script>

<svelte:head><title>Aide | MedCore HIS</title></svelte:head>

<div class="space-y-6" data-testid="help-center">
	<PageHeader
		eyebrow="Centre d’aide"
		title="Aide MedCore"
		description="Explications des champs, statuts et actions sensibles de l’application. Seules les aides des modules auxquels vous avez accès sont affichées."
	/>

	{#if loading}
		<LoadingState label="Chargement de l’aide…" />
	{:else}
		<div class="grid gap-6 lg:grid-cols-[14rem_1fr]">
			<nav aria-label="Modules de l’aide" class="space-y-1">
				<button
					type="button"
					class={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${moduleFilter === '' ? 'bg-[#0E4C92] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
					aria-pressed={moduleFilter === ''}
					data-testid="help-module-all"
					onclick={() => (moduleFilter = '')}>Tous les modules ({all.length})</button
				>
				{#each modules as m (m.key)}
					<button
						type="button"
						class={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${moduleFilter === m.key ? 'bg-[#0E4C92] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
						aria-pressed={moduleFilter === m.key}
						data-testid={`help-module-${m.key}`}
						onclick={() => {
							moduleFilter = m.key;
							selectedKey = '';
						}}>{m.label} ({m.count})</button
					>
				{/each}
			</nav>

			<section class="space-y-4" aria-labelledby="help-results-title">
				<div>
					<label for="help-search" class="mb-1 block text-sm font-semibold text-slate-700"
						>Rechercher dans l’aide</label
					>
					<Input
						id="help-search"
						bind:value={query}
						placeholder="Ex. remboursement, glycémie, fond initial…"
						data-testid="help-search"
					/>
				</div>
				<h2 id="help-results-title" class="text-sm font-bold text-slate-600" aria-live="polite">
					{results.length} résultat{results.length > 1 ? 's' : ''}{moduleFilter
						? ` · ${helpModuleLabel(moduleFilter)}`
						: ''}
				</h2>
				{#if results.length === 0}
					<EmptyState
						title="Aucune aide trouvée"
						description="Essayez un autre mot-clé ou un autre module."
					/>
				{:else}
					<div class="grid gap-4 xl:grid-cols-[1fr_1fr]">
						<ul class="space-y-2" data-testid="help-results">
							{#each results as entry (entry.helpKey)}
								<li>
									<button
										type="button"
										class={`flex w-full items-start gap-2 rounded-xl border p-3 text-left text-sm transition ${selectedKey === entry.helpKey ? 'border-[#0E4C92] bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
										aria-pressed={selectedKey === entry.helpKey}
										data-testid={`help-result-${entry.helpKey}`}
										onclick={() => (selectedKey = entry.helpKey)}
									>
										<CircleHelp class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
										<span>
											<span class="block font-semibold text-slate-900">{entry.elementLabel}</span>
											<span class="block text-xs text-slate-500"
												>{helpModuleLabel(entry.module)} — {entry.shortHelp}</span
											>
										</span>
									</button>
								</li>
							{/each}
						</ul>
						<div class="xl:sticky xl:top-4 xl:self-start" aria-live="polite">
							{#if selected}
								<article
									class="rounded-2xl border border-slate-200 bg-white p-5"
									data-testid="help-detail"
								>
									<HelpArticle entry={selected} headingLevel={2} />
								</article>
							{:else}
								<p
									class="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500"
								>
									Sélectionnez une entrée pour afficher l’explication détaillée.
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>
