<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getConsultations } from '$lib/api/consultations';
	import type { ConsultationListItem, ConsultationStatus } from '$lib/types/consultation';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';

	let consultations = $state<ConsultationListItem[]>([]);
	let loading = $state(true);
	let error = $state('');
	let page = $state(1);
	let limit = $state(20);
	let total = $state(0);
	let totalPages = $state(1);
	let search = $state('');
	let status = $state<ConsultationStatus | ''>('');
	let serviceId = $state<number | null>(null);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			const result = await getConsultations({
				page,
				limit,
				status,
				serviceId: serviceId || undefined,
				search: search.trim() || undefined
			});
			consultations = result.data;
			total = result.meta.total;
			totalPages = Math.max(1, result.meta.totalPages);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger les consultations.';
		} finally {
			loading = false;
		}
	}

	function applyFilters(): void {
		page = 1;
		void load();
	}

	function changePage(nextPage: number): void {
		if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
		page = nextPage;
		void load();
	}

	function formatDate(value: string): string {
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? '—'
			: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
	}

	function statusLabel(value: ConsultationStatus): string {
		return (
			{ draft: 'Brouillon', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée' }[
				value
			] ?? value
		);
	}

	onMount(() => void load());
</script>

<svelte:head><title>Consultations — MedCore HIS</title></svelte:head>

<div class="space-y-6">
	<header class="rounded-2xl bg-gradient-to-r from-[#0E4C92] to-[#18B893] p-7 text-white shadow-lg">
		<p class="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Activité clinique</p>
		<h1 class="mt-2 text-3xl font-black">Consultations</h1>
		<p class="mt-2 text-blue-50">{total} consultation(s) enregistrée(s)</p>
	</header>

	<form
		class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"
		onsubmit={(event) => {
			event.preventDefault();
			applyFilters();
		}}
	>
		<input
			bind:value={search}
			placeholder="Patient, médecin, diagnostic…"
			class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
		/>
		<ServiceSelect
			bind:value={serviceId}
			capability="consultation"
			placeholder="Tous les services"
		/>
		<select bind:value={status} class="rounded-xl border border-slate-200 px-4 py-3 text-sm">
			<option value="">Tous les statuts</option>
			<option value="draft">Brouillon</option>
			<option value="in_progress">En cours</option>
			<option value="completed">Terminée</option>
			<option value="cancelled">Annulée</option>
		</select>
		<button type="submit" class="rounded-xl bg-[#0E4C92] px-4 py-3 text-sm font-bold text-white"
			>Rechercher</button
		>
	</form>

	{#if error}
		<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
	{/if}

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"
					><tr
						><th class="px-5 py-4">Patient</th><th class="px-5 py-4">Date</th><th class="px-5 py-4"
							>Médecin / service</th
						><th class="px-5 py-4">Statut</th><th class="px-5 py-4">Diagnostic</th><th
							class="px-5 py-4"
						></th></tr
					></thead
				>
				<tbody class="divide-y divide-slate-100">
					{#if loading}
						<tr><td colspan="6" class="px-5 py-10 text-center text-slate-500">Chargement…</td></tr>
					{:else if consultations.length === 0}
						<tr
							><td colspan="6" class="px-5 py-10 text-center text-slate-500"
								>Aucune consultation trouvée.</td
							></tr
						>
					{:else}
						{#each consultations as consultation (consultation.id)}
							<tr class="hover:bg-slate-50"
								><td class="px-5 py-4"
									><p class="font-bold text-slate-900">
										{consultation.patientName || 'Patient sans identité'}
									</p>
									<p class="text-xs text-slate-500">
										{consultation.patientCode ||
											consultation.patientRecord ||
											`#${consultation.patientId}`}
									</p></td
								><td class="px-5 py-4 text-slate-600">{formatDate(consultation.createdAt)}</td><td
									class="px-5 py-4"
									><p class="font-medium text-slate-800">{consultation.doctorName || '—'}</p>
									<p class="text-xs text-slate-500">
										{consultation.service || 'Service non renseigné'}
									</p></td
								><td class="px-5 py-4"
									><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
										>{statusLabel(consultation.status)}</span
									></td
								><td class="max-w-xs truncate px-5 py-4 text-slate-600"
									>{consultation.diagnosis || '—'}</td
								><td class="px-5 py-4 text-right"
									><button
										type="button"
										onclick={() => goto(resolve(`/consultations/${consultation.id}`))}
										class="font-bold text-[#0E4C92] hover:underline">Ouvrir</button
									></td
								></tr
							>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		<div class="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
			<span class="text-slate-500">Page {page} sur {totalPages}</span>
			<div class="flex gap-2">
				<button
					type="button"
					disabled={page <= 1 || loading}
					onclick={() => changePage(page - 1)}
					class="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Précédent</button
				><button
					type="button"
					disabled={page >= totalPages || loading}
					onclick={() => changePage(page + 1)}
					class="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Suivant</button
				>
			</div>
		</div>
	</div>
</div>
