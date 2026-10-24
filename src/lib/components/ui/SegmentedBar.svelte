<script lang="ts">
	import { chartColors, sharePercent, type ChartTone } from '$lib/design/charts';

	export interface SegmentedBarRow {
		label: string;
		value: number;
	}

	interface Props {
		/** Étapes ordonnées : teinte unique, de la plus claire à la plus foncée. */
		rows: SegmentedBarRow[];
		label: string;
		unit?: string;
		tone?: ChartTone;
	}

	let { rows, label, unit = '', tone = 'primary' }: Props = $props();

	const total = $derived(rows.reduce((sum, r) => sum + Math.max(0, r.value), 0));
	// Opacités croissantes : échelle séquentielle d'une seule teinte.
	const opacity = (index: number) =>
		rows.length <= 1 ? 1 : 0.35 + (0.65 * index) / (rows.length - 1);
	const format = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
</script>

<div class="min-w-0 @container">
	<div
		class="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border/60"
		role="img"
		aria-label={`${label} : ${rows.map((r) => `${r.label} ${format(r.value)}`).join(', ')}`}
	>
		{#each rows as row, index (row.label)}
			{#if row.value > 0}
				<div
					class="h-full"
					style={`flex:${row.value} 1 0;background:${chartColors[tone]};opacity:${opacity(index)}`}
					title={`${row.label} : ${format(row.value)} ${unit}`}
				></div>
			{/if}
		{/each}
	</div>

	<ul class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs @lg:grid-cols-2">
		{#each rows as row, index (row.label)}
			<li class="flex min-w-0 items-center gap-2">
				<span
					class="size-2.5 shrink-0 rounded-sm"
					style={`background:${chartColors[tone]};opacity:${opacity(index)}`}
					aria-hidden="true"
				></span>
				<span class="truncate text-foreground-secondary">{row.label}</span>
				<span class="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
					{format(row.value)}
				</span>
				<span class="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
					{Math.round(sharePercent(row.value, total))} %
				</span>
			</li>
		{/each}
	</ul>
</div>
