<script lang="ts">
	import { chartColors, chartMotion, type ChartTone } from '$lib/design/charts';

	export interface RankedBarRow {
		id: string | number;
		label: string;
		value: number;
	}

	interface Props {
		/** Lignes déjà triées dans l'ordre d'affichage. */
		rows: RankedBarRow[];
		label: string;
		unit?: string;
		tone?: ChartTone;
	}

	let { rows, label, unit = '', tone = 'primary' }: Props = $props();

	const format = (value: number) =>
		new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
	const maxValue = $derived(Math.max(0, ...rows.map((r) => r.value)));
</script>

<ul class="space-y-3" aria-label={label}>
	{#each rows as row, index (row.id)}
		{@const width = maxValue > 0 ? (Math.max(0, row.value) / maxValue) * 100 : 0}
		<li class="min-w-0">
			<div class="flex items-baseline justify-between gap-3 text-sm">
				<span class="truncate text-foreground-secondary" title={row.label}>{row.label}</span>
				<span class="shrink-0 font-semibold tabular-nums text-foreground">
					{format(row.value)}
					{unit}
				</span>
			</div>
			<div class="mt-1.5 h-2 rounded-full bg-surface-muted" aria-hidden="true">
				<div
					class="mc-bar h-2 rounded-full"
					style={`width:${width}%;--bar-color:${chartColors[tone]};--bar-duration:${chartMotion.durationMs}ms;--bar-easing:${chartMotion.easing};--bar-delay:${Math.min(index, 12) * 35}ms`}
				></div>
			</div>
		</li>
	{/each}
</ul>

<style>
	.mc-bar {
		background: var(--bar-color);
		transform-origin: left center;
		animation: mc-bar-reveal var(--bar-duration) var(--bar-easing) var(--bar-delay) both;
	}

	@keyframes mc-bar-reveal {
		from {
			transform: scaleX(0);
		}

		to {
			transform: scaleX(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mc-bar {
			animation: none;
		}
	}
</style>
