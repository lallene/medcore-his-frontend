<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getQAKPIs, listQACampaigns } from '$lib/api/qa';
	import type { QACampaign, QAKPIs } from '$lib/types/qa';
	let campaigns = $state<QACampaign[]>([]),
		kpis = $state<QAKPIs | null>(null),
		error = $state(''),
		environment = $state(''),
		status = $state(''),
		suite = $state(''),
		dateFrom = $state(''),
		dateTo = $state('');
	async function load() {
		try {
			[kpis, { data: campaigns }] = await Promise.all([
				getQAKPIs(),
				listQACampaigns({ environment, status, suite, dateFrom, dateTo, limit: 50 })
			]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement QA impossible';
		}
	}
	onMount(load);
	const duration = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
	const badge = (value: string) =>
		value === 'PASSED'
			? 'bg-emerald-100 text-emerald-700'
			: value === 'FAILED'
				? 'bg-red-100 text-red-700'
				: 'bg-amber-100 text-amber-700';
</script>

<svelte:head><title>Automated QA — MedCore HIS</title></svelte:head>
<div class="space-y-6 p-6">
	<header>
		<p class="text-xs font-black uppercase text-indigo-700">Release Gate</p>
		<h1 class="text-3xl font-black">MedCore Automated QA</h1>
		<p class="text-slate-500">
			Campagnes CI/E2E, preuves et statut de validation. Aucune exécution shell depuis cette page.
		</p>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<div class="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
		{#each [{ label: 'Dernière campagne', value: kpis?.lastCampaign?.runId ?? '—' }, { label: 'Statut', value: kpis?.lastCampaign?.status ?? '—' }, { label: 'Durée', value: duration(kpis?.lastCampaign?.durationMs ?? 0) }, { label: 'Taux de réussite', value: `${(kpis?.passRate ?? 0).toFixed(1)} %` }, { label: 'Tests passés', value: kpis?.lastCampaign?.passed ?? 0 }, { label: 'Tests échoués', value: kpis?.lastCampaign?.failed ?? 0 }, { label: 'Ignorés', value: kpis?.lastCampaign?.skipped ?? 0 }, { label: 'Non implémentés', value: kpis?.lastCampaign?.notImplemented ?? 0 }] as item (item.label)}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-bold uppercase text-slate-400">{item.label}</p>
				<p class="mt-2 text-xl font-black">{item.value}</p>
			</div>{/each}
	</div>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			void load();
		}}
		class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6"
	>
		<input
			bind:value={environment}
			placeholder="Environnement"
			class="rounded-xl border p-3"
		/><select bind:value={status} class="rounded-xl border p-3"
			><option value="">Tous statuts</option><option>PASSED</option><option>FAILED</option><option
				>RUNNING</option
			><option>CANCELLED</option></select
		><input bind:value={suite} placeholder="Suite" class="rounded-xl border p-3" /><input
			type="date"
			bind:value={dateFrom}
			class="rounded-xl border p-3"
		/><input type="date" bind:value={dateTo} class="rounded-xl border p-3" /><button
			class="rounded-xl bg-slate-900 font-bold text-white">Filtrer</button
		>
	</form>
	<div class="overflow-x-auto rounded-2xl border bg-white">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-50"
				><tr
					><th class="p-3">Run ID</th><th>Type</th><th>Environnement</th><th>Commit</th><th>Date</th
					><th>Durée</th><th>Statut</th><th>Total</th><th>Pass/Fail/Skip/NI</th></tr
				></thead
			><tbody
				>{#each campaigns as campaign (campaign.id)}<tr
						class="cursor-pointer border-t hover:bg-slate-50"
						onclick={() => goto(resolve(`/admin/qa/${campaign.id}`))}
						><td class="p-3 font-bold">{campaign.runId}</td><td>{campaign.runType}</td><td
							>{campaign.environment}</td
						><td class="font-mono text-xs">{campaign.commitSha.slice(0, 8) || '—'}</td><td
							>{new Date(campaign.startedAt).toLocaleString('fr-FR')}</td
						><td>{duration(campaign.durationMs)}</td><td
							><span class={`rounded-full px-2 py-1 text-xs font-bold ${badge(campaign.status)}`}
								>{campaign.status}</span
							></td
						><td>{campaign.total}</td><td
							>{campaign.passed} / {campaign.failed} / {campaign.skipped} / {campaign.notImplemented}</td
						></tr
					>{/each}</tbody
			>
		</table>
		{#if campaigns.length === 0}<p class="p-8 text-center text-slate-500">
				Aucune campagne enregistrée.
			</p>{/if}
	</div>
</div>
