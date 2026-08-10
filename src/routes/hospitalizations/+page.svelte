<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Eye, Hospital } from 'lucide-svelte';
	import { listHospitalizations } from '$lib/api/hospitalizations';
	import { hospitalizationStatusLabel } from '$lib/components/hospitalizations/hospitalization-state';
	import type { Hospitalization, HospitalizationStatus } from '$lib/types/hospitalization';

	let items = $state<Hospitalization[]>([]);
	let loading = $state(true);
	let error = $state('');
	let status = $state<HospitalizationStatus | ''>('');
	let page = $state(1);
	let totalPages = $state(1);
	async function load() {
		loading = true;
		error = '';
		try {
			const result = await listHospitalizations({ page, limit: 20, status });
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
		class="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-red-800 to-[#0E4C92] p-8 text-white md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-red-100">Séjours hospitaliers</p>
			<h1 class="mt-2 text-3xl font-black">Hospitalisations</h1>
			<p class="mt-2 text-sm text-red-50">Admissions planifiées, séjours actifs et sorties.</p>
		</div>
		<Hospital size={42} />
	</header>
	<div class="flex gap-3">
		<select
			bind:value={status}
			onchange={load}
			class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
			><option value="">Tous les statuts</option><option value="PLANNED">Planifiées</option><option
				value="ADMITTED">Admises</option
			><option value="DISCHARGED">Sorties</option><option value="CANCELLED">Annulées</option
			></select
		>
	</div>
	{#if error}<p class="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>{/if}
	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
		{#if loading}<p class="p-8 text-slate-500">Chargement...</p>{:else if items.length === 0}<p
				class="p-8 text-center text-slate-500"
			>
				Aucune hospitalisation.
			</p>{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"
						><tr
							><th class="p-4">Admission</th><th class="p-4">Patient</th><th class="p-4">Service</th
							><th class="p-4">Type</th><th class="p-4">Date</th><th class="p-4">Sortie prévue</th
							><th class="p-4">Statut</th><th class="p-4"></th></tr
						></thead
					><tbody
						>{#each items as item (item.id)}<tr class="border-t border-slate-100"
								><td class="p-4 font-black">{item.admissionNumber}</td><td class="p-4"
									>{item.patient.nom} {item.patient.prenoms}</td
								><td class="p-4">{item.department || '—'}</td><td class="p-4"
									>{item.hospitalizationType || '—'}</td
								><td class="p-4"
									>{item.admittedAt
										? new Date(item.admittedAt).toLocaleDateString('fr-FR')
										: 'Non admis'}</td
								><td class="p-4"
									>{item.expectedDischargeAt
										? new Date(item.expectedDischargeAt).toLocaleDateString('fr-FR')
										: '—'}</td
								><td class="p-4 font-bold">{hospitalizationStatusLabel(item.status)}</td><td
									class="p-4"
									><button
										type="button"
										aria-label="Ouvrir"
										onclick={() => goto(resolve(`/hospitalizations/${item.id}`))}
										class="text-[#0E4C92]"><Eye size={18} /></button
									></td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		{/if}
	</div>
	<div class="flex justify-end gap-2">
		<button
			disabled={page <= 1}
			onclick={() => {
				page--;
				void load();
			}}
			class="rounded-lg border px-3 py-2 disabled:opacity-40">Précédent</button
		><span class="px-3 py-2 text-sm">{page}/{Math.max(totalPages, 1)}</span><button
			disabled={page >= totalPages}
			onclick={() => {
				page++;
				void load();
			}}
			class="rounded-lg border px-3 py-2 disabled:opacity-40">Suivant</button
		>
	</div>
</div>
