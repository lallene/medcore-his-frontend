<script lang="ts">
	import { getAppointmentSeries } from '$lib/api/appointments';
	import {
		formatSeriesRecurrenceSummary,
		seriesOccurrenceKindLabels
	} from '$lib/components/agenda/series';
	import { formatAgendaDateTime, appointmentStatusLabels } from '$lib/components/agenda/state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';
	import type { AppointmentSeries, SeriesOccurrenceKind } from '$lib/types/scheduling';

	interface Props {
		open?: boolean;
		seriesId: number | null;
		onclose?: () => void;
	}

	let { open = $bindable(false), seriesId, onclose }: Props = $props();

	let loading = $state(false);
	let error = $state('');
	let series = $state<AppointmentSeries | null>(null);
	let loadSeq = 0;

	$effect(() => {
		if (!open || !seriesId) return;
		void load(seriesId);
	});

	async function load(id: number) {
		const seq = ++loadSeq;
		loading = true;
		error = '';
		try {
			const data = await getAppointmentSeries(id);
			if (seq !== loadSeq) return;
			series = data;
		} catch (e) {
			if (seq !== loadSeq) return;
			series = null;
			error = resolveUserErrorMessage(e, 'Impossible de charger la série.');
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}
</script>

<Modal
	bind:open
	title="Série récurrente"
	description={series ? formatSeriesRecurrenceSummary(series) : 'Détail des occurrences'}
	size="lg"
	{onclose}
>
	{#if loading}
		<LoadingState label="Chargement de la série…" />
	{:else if error}
		<Alert tone="danger" title="Erreur">{error}</Alert>
	{:else if series}
		<div class="space-y-4" data-testid="agenda-series-detail">
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-semibold {series.status === 'ACTIVE'
						? 'bg-emerald-50 text-emerald-800'
						: 'bg-slate-100 text-slate-600'}"
					data-testid="agenda-series-status"
				>
					{series.status === 'ACTIVE' ? 'Active' : 'Annulée'}
				</span>
				<span class="text-xs text-slate-500">Version {series.version}</span>
				<span class="text-xs text-slate-500">· {series.durationMinutes} min</span>
			</div>

			<p class="text-sm text-slate-700" data-testid="agenda-series-summary">
				{formatSeriesRecurrenceSummary(series)}
			</p>

			<div class="overflow-hidden rounded-xl border border-border">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th class="px-3 py-2">#</th>
							<th class="px-3 py-2">Créneau</th>
							<th class="px-3 py-2">Statut</th>
							<th class="px-3 py-2">Type</th>
						</tr>
					</thead>
					<tbody>
						{#each series.occurrences as occ (occ.id)}
							<tr class="border-t border-border" data-testid="agenda-series-occurrence">
								<td class="px-3 py-2 font-medium">{occ.index}</td>
								<td class="px-3 py-2">{formatAgendaDateTime(occ.scheduledAt)}</td>
								<td class="px-3 py-2">
									{appointmentStatusLabels[occ.status as keyof typeof appointmentStatusLabels] ??
										occ.status}
								</td>
								<td class="px-3 py-2 text-slate-600">
									{seriesOccurrenceKindLabels[occ.kind as SeriesOccurrenceKind] ?? occ.kind}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Fermer</Button>
	{/snippet}
</Modal>
