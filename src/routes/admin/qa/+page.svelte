<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getQAKPIs, listQACampaigns } from '$lib/api/qa';
	import type { QACampaign, QAKPIs } from '$lib/types/qa';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let campaigns = $state<QACampaign[]>([]);
	let kpis = $state<QAKPIs | null>(null);
	let error = $state('');
	let environment = $state('');
	let status = $state('');
	let suite = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');

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
</script>

<svelte:head><title>Automated QA — MedCore HIS</title></svelte:head>

<div class="space-y-6">
	<PageHeader
		eyebrow="Release Gate"
		title="MedCore Automated QA"
		description="Campagnes CI/E2E, preuves et statut de validation. Aucune exécution shell depuis cette page."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard title="Dernière campagne" value={kpis?.lastCampaign?.runId ?? '—'} />
		<MetricCard title="Statut" value={kpis?.lastCampaign?.status ?? '—'} />
		<MetricCard title="Durée" value={duration(kpis?.lastCampaign?.durationMs ?? 0)} />
		<MetricCard
			title="Taux de réussite"
			value={`${(kpis?.passRate ?? 0).toFixed(1)} %`}
			progress={Math.min(100, Math.max(0, kpis?.passRate ?? 0))}
		/>
		<MetricCard title="Tests passés" value={kpis?.lastCampaign?.passed ?? 0} />
		<MetricCard title="Tests échoués" value={kpis?.lastCampaign?.failed ?? 0} />
		<MetricCard title="Ignorés" value={kpis?.lastCampaign?.skipped ?? 0} />
		<MetricCard title="Non implémentés" value={kpis?.lastCampaign?.notImplemented ?? 0} />
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			void load();
		}}
	>
		<FilterBar>
			<Input bind:value={environment} placeholder="Environnement" class="min-w-[10rem]" />
			<Select bind:value={status} class="min-w-[10rem]" aria-label="Statut campagne">
				<option value="">Tous statuts</option>
				<option>PASSED</option>
				<option>FAILED</option>
				<option>RUNNING</option>
				<option>CANCELLED</option>
			</Select>
			<Input bind:value={suite} placeholder="Suite" class="min-w-[8rem]" />
			<Input type="date" bind:value={dateFrom} class="min-w-[10rem]" />
			<Input type="date" bind:value={dateTo} class="min-w-[10rem]" />
			<Button type="submit" variant="secondary">Filtrer</Button>
		</FilterBar>
	</form>

	<div
		class="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]"
	>
		<table class="w-full text-left text-sm">
			<thead class="bg-surface-muted">
				<tr>
					<th class="p-3">Run ID</th>
					<th>Type</th>
					<th>Environnement</th>
					<th>Commit</th>
					<th>Date</th>
					<th>Durée</th>
					<th>Statut</th>
					<th>Total</th>
					<th>Pass/Fail/Skip/NI</th>
				</tr>
			</thead>
			<tbody>
				{#each campaigns as campaign (campaign.id)}
					<tr
						class="cursor-pointer border-t border-border hover:bg-surface-muted/60"
						onclick={() => goto(resolve(`/admin/qa/${campaign.id}`))}
					>
						<td class="p-3 font-bold">{campaign.runId}</td>
						<td>{campaign.runType}</td>
						<td>{campaign.environment}</td>
						<td class="font-mono text-xs">{campaign.commitSha.slice(0, 8) || '—'}</td>
						<td>{new Date(campaign.startedAt).toLocaleString('fr-FR')}</td>
						<td>{duration(campaign.durationMs)}</td>
						<td><StatusBadge status={campaign.status} /></td>
						<td>{campaign.total}</td>
						<td
							>{campaign.passed} / {campaign.failed} / {campaign.skipped} / {campaign.notImplemented}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if campaigns.length === 0}
			<div class="p-4">
				<EmptyState
					title="Aucune campagne enregistrée"
					description="Importez un qa-summary via CLI."
				/>
			</div>
		{/if}
	</div>
</div>
