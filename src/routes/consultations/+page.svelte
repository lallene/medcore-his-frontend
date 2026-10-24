<script lang="ts">
	import Alert from '$lib/components/ui/Alert.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
	<header class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
		<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">Activité clinique</p>
		<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
			Consultations
		</h1>
		<p class="mt-1.5 text-sm text-muted-foreground">{total} consultation(s) enregistrée(s)</p>
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
			class="rounded-lg border border-input px-3 py-2 text-sm"
		/>
		<ServiceSelect
			bind:value={serviceId}
			capability="consultation"
			placeholder="Tous les services"
		/>
		<select bind:value={status} class="rounded-lg border border-input px-3 py-2 text-sm">
			<option value="">Tous les statuts</option>
			<option value="draft">Brouillon</option>
			<option value="in_progress">En cours</option>
			<option value="completed">Terminée</option>
			<option value="cancelled">Annulée</option>
		</select>
		<button
			type="submit"
			class="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
			>Rechercher</button
		>
	</form>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<div class="space-y-3">
		<Table>
			<thead
				><tr
					><th>Patient</th><th>Date</th><th>Médecin / service</th><th>Statut</th><th>Diagnostic</th
					><th class="mc-actions"></th></tr
				></thead
			>
			<tbody>
				{#if loading}
					<TableState state="loading" colspan={6} title="Chargement…" />
				{:else if error && consultations.length === 0}
					<TableState state="error" colspan={6} />
				{:else if consultations.length === 0}
					<TableState state="empty" colspan={6} title="Aucune consultation trouvée." />
				{:else}
					{#each consultations as consultation (consultation.id)}
						<tr
							><td
								><p class="font-bold text-slate-900">
									{consultation.patientName || 'Patient sans identité'}
								</p>
								<p class="text-xs text-slate-500">
									{consultation.patientCode ||
										consultation.patientRecord ||
										`#${consultation.patientId}`}
								</p></td
							><td>{formatDate(consultation.createdAt)}</td><td
								><p class="font-medium text-slate-800">{consultation.doctorName || '—'}</p>
								<p class="text-xs text-slate-500">
									{consultation.service || 'Service non renseigné'}
								</p></td
							><td
								><StatusBadge
									status={consultation.status}
									label={statusLabel(consultation.status)}
								/></td
							><td class="max-w-xs truncate">{consultation.diagnosis || '—'}</td><td
								class="text-right mc-actions"
								><Button
									size="sm"
									variant="ghost"
									onclick={() => goto(resolve(`/consultations/${consultation.id}`))}>Ouvrir</Button
								></td
							></tr
						>
					{/each}
				{/if}
			</tbody>
		</Table>
		<Pagination {page} {totalPages} disabled={loading} onpage={changePage}>
			{#snippet summary()}Page {page} sur {totalPages}{/snippet}
		</Pagination>
	</div>
</div>
