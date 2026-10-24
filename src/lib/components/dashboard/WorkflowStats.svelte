<script lang="ts">
	import type { WorkflowStats } from '$lib/types/dashboard';
	import BarChart, { type BarChartRow } from '$lib/components/ui/BarChart.svelte';

	interface Props {
		workflow: WorkflowStats;
		total: number;
		/** Libellé de la période filtrée (bons créés sur la période). */
		period?: string;
	}

	let { workflow, total, period = '' }: Props = $props();

	const rows = $derived<BarChartRow[]>([
		{ label: 'Validés', value: workflow.validated, tone: 'success' },
		{ label: 'Rejetés', value: workflow.rejected, tone: 'danger' },
		{ label: 'Annulés', value: workflow.cancelled, tone: 'neutral' },
		{ label: 'Contrôlés', value: workflow.controlled, tone: 'warning' },
		{ label: 'Soumis', value: workflow.submitted, tone: 'info' },
		{ label: 'Brouillons', value: workflow.draft, tone: 'primary' }
	]);

	const validatedPercent = $derived(total > 0 ? Math.round((workflow.validated / total) * 100) : 0);
	const processing = $derived(workflow.controlled + workflow.submitted);
	const processingPercent = $derived(total > 0 ? Math.round((processing / total) * 100) : 0);
</script>

<section
	class="@container flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6"
>
	<div>
		<h2 class="text-base font-semibold text-foreground">Répartition des bons PEC</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Statut actuel des {total.toLocaleString('fr-FR')} bon(s) créé(s){period
				? ` · ${period}`
				: ''}.
		</p>
	</div>

	<div class="mt-5 grid grid-cols-3 gap-2">
		<div class="rounded-lg border border-primary-border bg-primary-soft px-3 py-3">
			<p class="text-xs font-medium text-primary">Total</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums text-primary">
				{total.toLocaleString('fr-FR')}
			</p>
			<p class="mt-0.5 text-2xs text-muted-foreground">bons PEC</p>
		</div>

		<div class="rounded-lg border border-success-border bg-success-soft px-3 py-3">
			<p class="text-xs font-medium text-success-strong">Validés</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums text-success-strong">
				{workflow.validated.toLocaleString('fr-FR')}
			</p>
			<p class="mt-0.5 text-2xs text-muted-foreground">{validatedPercent} % du total</p>
		</div>

		<div class="rounded-lg border border-warning-border bg-warning-soft px-3 py-3">
			<p class="text-xs font-medium text-warning-strong">En traitement</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums text-warning-strong">
				{processing.toLocaleString('fr-FR')}
			</p>
			<p class="mt-0.5 text-2xs text-muted-foreground">{processingPercent} % du total</p>
		</div>
	</div>

	<div class="mt-5 min-w-0 flex-1">
		<BarChart
			title="Statuts des bons PEC"
			description="Répartition par état du workflow"
			{rows}
			unit="bons"
		/>
	</div>
</section>
