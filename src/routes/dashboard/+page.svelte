<script lang="ts">
	import { onMount } from 'svelte';

	import { getDashboard } from '$lib/api/dashboard';
	import ActivityTimeline from '../../components/dashboard/ActivityTimeline.svelte';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import WorkflowStats from '$lib/components/dashboard/WorkflowStats.svelte';
	import type { Dashboard } from '$lib/types/dashboard';

	let dashboard = $state<Dashboard | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			dashboard = await getDashboard();
		} catch {
			error = 'Impossible de charger le dashboard.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Dashboard | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du dashboard...</p>
{:else if error}
	<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
{:else if dashboard}
	<div class="space-y-6">
		<div>
			<h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
			<p class="text-slate-500">Vue d’ensemble MedCore HIS</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
			<KpiCard title="Patients" value={dashboard.patients} icon="users" />
			<KpiCard title="Assurés" value={dashboard.insured} icon="shield" />
			<KpiCard title="Compagnies" value={dashboard.companies} icon="building" />
			<KpiCard title="Garants" value={dashboard.guarantors} icon="building" />
			<KpiCard title="Bons Assurance" value={dashboard.vouchers} icon="file" />
			<KpiCard title="Validés" value={dashboard.validated} icon="shield" />
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="xl:col-span-2">
				<WorkflowStats workflow={dashboard.workflow} total={dashboard.vouchers} />
			</div>

			<ActivityTimeline activities={dashboard.recentActivities} />
		</div>
	</div>
{/if}
