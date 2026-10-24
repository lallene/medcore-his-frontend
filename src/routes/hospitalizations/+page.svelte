<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Eye, Hospital } from 'lucide-svelte';
	import { listHospitalizations } from '$lib/api/hospitalizations';
	import { hospitalizationStatusLabel } from '$lib/components/hospitalizations/hospitalization-state';
	import type { Hospitalization, HospitalizationStatus } from '$lib/types/hospitalization';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';

	let items = $state<Hospitalization[]>([]);
	let loading = $state(true);
	let error = $state('');
	let status = $state<HospitalizationStatus | ''>('');
	let serviceId = $state<number | null>(null);
	let page = $state(1);
	let totalPages = $state(1);
	async function load() {
		loading = true;
		error = '';
		try {
			const result = await listHospitalizations({
				page,
				limit: 20,
				status,
				serviceId: serviceId || undefined
			});
			items = result.data;
			totalPages = result.meta.totalPages;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Chargement impossible.';
		} finally {
			loading = false;
		}
	}
	onMount(load);
</script>

<svelte:head><title>Hospitalisations | MedCore HIS</title></svelte:head>
<div class="space-y-6">
	<header
		class="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
				Séjours hospitaliers
			</p>
			<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
				Hospitalisations
			</h1>
			<p class="mt-1.5 text-sm text-muted-foreground">
				Admissions planifiées, séjours actifs et sorties.
			</p>
		</div>
		<div
			class="hidden size-12 items-center justify-center rounded-lg bg-primary-soft text-primary md:flex"
		>
			<Hospital size="24" aria-hidden="true" />
		</div>
	</header>
	<div class="flex flex-wrap gap-3">
		<div class="w-full sm:w-auto sm:min-w-64">
			<ServiceSelect
				bind:value={serviceId}
				capability="hospitalization"
				placeholder="Tous les services"
				onchange={load}
			/>
		</div>
		<select
			bind:value={status}
			onchange={load}
			class="rounded-lg border border-input bg-white px-3 py-2 text-sm font-bold"
			><option value="">Tous les statuts</option><option value="PLANNED">Planifiées</option><option
				value="ADMITTED">Admises</option
			><option value="DISCHARGED">Sorties</option><option value="CANCELLED">Annulées</option
			></select
		>
	</div>
	{#if error}<Alert tone="danger">{error}</Alert>{/if}
	<div>
		<Table>
			<thead
				><tr
					><th>Admission</th><th>Patient</th><th>Service</th><th>Type</th><th>Date</th><th
						>Sortie prévue</th
					><th>Statut</th><th class="mc-actions"></th></tr
				></thead
			><tbody
				>{#if loading}<TableState
						state="loading"
						colspan={8}
						title="Chargement…"
					/>{:else if error && items.length === 0}<TableState
						state="error"
						colspan={8}
					/>{:else if items.length === 0}<TableState
						state="empty"
						colspan={8}
						title="Aucune hospitalisation."
					/>{:else}{#each items as item (item.id)}<tr
							><td class="mc-id">{item.admissionNumber}</td><td
								>{item.patient.nom} {item.patient.prenoms}</td
							><td>{item.department || '—'}</td><td>{item.hospitalizationType || '—'}</td><td
								>{item.admittedAt
									? new Date(item.admittedAt).toLocaleDateString('fr-FR')
									: 'Non admis'}</td
							><td
								>{item.expectedDischargeAt
									? new Date(item.expectedDischargeAt).toLocaleDateString('fr-FR')
									: '—'}</td
							><td>{hospitalizationStatusLabel(item.status)}</td><td class="mc-actions"
								><IconButton
									size="sm"
									label="Ouvrir"
									onclick={() => goto(resolve(`/hospitalizations/${item.id}`))}
									><Eye size={16} aria-hidden="true" /></IconButton
								></td
							></tr
						>{/each}{/if}</tbody
			>
		</Table>
	</div>
	<Pagination
		{page}
		totalPages={Math.max(totalPages, 1)}
		disabled={loading}
		onpage={(next) => {
			page = next;
			void load();
		}}
	/>
</div>
