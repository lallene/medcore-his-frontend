<script lang="ts">
	import { chartColors, chartMotion, formatChartNumber, sharePercent } from '$lib/design/charts';
	import type { ChartTone } from '$lib/design/charts';

	export type DonutChartRow = {
		label: string;
		value: number | null;
		tone: ChartTone;
		hint?: string;
		nullLabel?: string;
	};

	interface Props {
		rows: DonutChartRow[];
		centerLabel?: string;
		unit?: string;
		ariaLabel?: string;
	}

	let {
		rows,
		centerLabel = 'Total',
		unit = '',
		ariaLabel = 'Graphique en anneau'
	}: Props = $props();

	const availableRows = $derived(rows.filter((row) => row.value !== null));
	const total = $derived(availableRows.reduce((sum, row) => sum + Math.max(0, row.value ?? 0), 0));
	const hasData = $derived(total > 0);

	const radius = 54;
	const circumference = 2 * Math.PI * radius;

	const segments = $derived.by(() => {
		let offset = 0;

		return availableRows
			.filter((row) => (row.value ?? 0) > 0)
			.map((row) => {
				const value = Math.max(0, row.value ?? 0);
				const percent = sharePercent(value, total);
				const length = (percent / 100) * circumference;
				const segment = {
					...row,
					value,
					percent,
					length,
					offset,
					color: chartColors[row.tone]
				};

				offset += length;
				return segment;
			});
	});

	function percentLabel(value: number | null): string {
		if (value === null || total <= 0) return '—';
		return `${Math.round(sharePercent(value, total))} %`;
	}
</script>

<div
	class="@container"
	style={`--donut-duration: ${chartMotion.durationMs}ms; --donut-easing: ${chartMotion.easing};`}
>
	<div class="grid items-center gap-5 @md:grid-cols-[minmax(170px,0.8fr)_minmax(0,1.2fr)]">
		<div class="flex justify-center">
			<div
				class="relative size-[172px] shrink-0"
				role="img"
				aria-label={`${ariaLabel}. ${formatChartNumber(total)} ${unit}`.trim()}
			>
				<svg viewBox="0 0 128 128" class="size-full -rotate-90" aria-hidden="true">
					<circle
						cx="64"
						cy="64"
						r={radius}
						fill="none"
						stroke="var(--color-surface-sunken)"
						stroke-width="18"
					/>

					{#if hasData}
						{#each segments as segment (segment.label)}
							<circle
								cx="64"
								cy="64"
								r={radius}
								fill="none"
								stroke={segment.color}
								stroke-width="18"
								stroke-linecap="butt"
								stroke-dasharray={`${segment.length} ${circumference - segment.length}`}
								stroke-dashoffset={-segment.offset}
								class="donut-segment"
							>
								<title>
									{segment.label}: {formatChartNumber(segment.value)} ({Math.round(segment.percent)} %)
								</title>
							</circle>
						{/each}
					{/if}
				</svg>

				<div
					class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
				>
					<span class="text-xs font-medium text-muted-foreground">{centerLabel}</span>
					<strong class="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
						{formatChartNumber(total)}
					</strong>
					{#if unit}
						<span class="mt-0.5 text-xs text-muted-foreground">{unit}</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="min-w-0 space-y-1">
			{#each rows as row (row.label)}
				<div class="rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted">
					<div class="flex min-w-0 items-center gap-2">
						<span
							class="size-2.5 shrink-0 rounded-full"
							style={`background-color: ${chartColors[row.tone]}`}
							aria-hidden="true"
						></span>

						<span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
							{row.label}
						</span>

						{#if row.value === null}
							<span class="shrink-0 text-xs font-medium text-muted-foreground">—</span>
						{:else}
							<span class="shrink-0 text-sm font-semibold tabular-nums text-foreground">
								{formatChartNumber(row.value)}
							</span>
							<span class="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
								{percentLabel(row.value)}
							</span>
						{/if}
					</div>

					{#if row.value === null}
						<p class="mt-1 pl-[18px] text-xs leading-4 text-warning-strong">
							{row.nullLabel ?? 'Donnée indisponible'}
						</p>
					{:else if row.hint}
						<p class="mt-1 pl-[18px] text-xs leading-4 text-muted-foreground">
							{row.hint}
						</p>
					{/if}
				</div>
			{/each}

			{#if !hasData}
				<p class="px-2 pt-2 text-xs text-muted-foreground">Aucune donnée sur la période.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.donut-segment {
		animation: donut-reveal var(--donut-duration) var(--donut-easing) both;
		transform-origin: center;
	}

	@keyframes donut-reveal {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.donut-segment {
			animation: none;
		}
	}
</style>
