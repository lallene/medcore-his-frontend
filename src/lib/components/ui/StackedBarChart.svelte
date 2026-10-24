<script lang="ts">
	import {
		chartColors,
		labelInterval,
		niceAxis,
		sharePercent,
		shortCivilDate,
		type ChartTone
	} from '$lib/design/charts';

	export interface StackedBarSeries {
		label: string;
		tone: ChartTone;
		values: number[];
	}

	interface Props {
		/** Jours civils YYYY-MM-DD, alignés sur les valeurs de chaque série. */
		dates: string[];
		/** Séries empilées du bas vers le haut, dans l'ordre de la légende. */
		series: StackedBarSeries[];
		label: string;
		unit?: string;
		height?: number;
	}

	let { dates, series, label, unit = '', height = 200 }: Props = $props();

	const PAD = { top: 12, right: 8, bottom: 26, left: 32 };
	const GAP = 2;
	const format = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

	let width = $state(0);
	let active = $state<number | null>(null);

	const count = $derived(dates.length);
	const totals = $derived(
		dates.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
	);
	const seriesTotals = $derived(series.map((s) => s.values.reduce((sum, v) => sum + v, 0)));
	const grandTotal = $derived(seriesTotals.reduce((sum, v) => sum + v, 0));
	const axis = $derived(niceAxis(Math.max(0, ...totals)));
	const ticks = $derived(
		Array.from({ length: Math.round(axis.max / axis.step) + 1 }, (_, i) => i * axis.step)
	);
	const plotWidth = $derived(Math.max(0, width - PAD.left - PAD.right));
	const plotHeight = $derived(height - PAD.top - PAD.bottom);
	const slot = $derived(count > 0 ? plotWidth / count : 0);
	const barWidth = $derived(Math.max(1, Math.min(40, slot - GAP)));
	const every = $derived(labelInterval(count, Math.max(2, Math.floor(plotWidth / 52))));

	const center = (i: number) => PAD.left + slot * (i + 0.5);
	const y = (value: number) => PAD.top + plotHeight * (1 - Math.max(0, value) / axis.max);
	const showDateLabel = (i: number) =>
		i === count - 1 || (i % every === 0 && count - 1 - i >= every);

	/** Segments d'une colonne : 2 px de surface entre deux statuts, sommet arrondi. */
	function segments(i: number) {
		const out: { d: string; color: string }[] = [];
		const visible = series.filter((s) => (s.values[i] ?? 0) > 0);
		let base = 0;
		visible.forEach((s, index) => {
			const value = s.values[i] ?? 0;
			const bottom = y(base);
			const top = y(base + value);
			base += value;
			const gapBelow = index > 0 ? GAP / 2 : 0;
			const gapAbove = index < visible.length - 1 ? GAP / 2 : 0;
			const yTop = top + gapAbove;
			const yBottom = bottom - gapBelow;
			if (yBottom - yTop <= 0.5) return;
			const left = center(i) - barWidth / 2;
			const isTop = index === visible.length - 1;
			const r = isTop ? Math.min(3, barWidth / 2, yBottom - yTop) : 0;
			out.push({
				color: chartColors[s.tone],
				d: `M${left},${yBottom} V${yTop + r} Q${left},${yTop} ${left + r},${yTop} H${left + barWidth - r} Q${left + barWidth},${yTop} ${left + barWidth},${yTop + r} V${yBottom} Z`
			});
		});
		return out;
	}

	function indexAt(clientX: number, target: SVGElement): number {
		const offset = clientX - target.getBoundingClientRect().left - PAD.left;
		return Math.min(count - 1, Math.max(0, Math.floor(offset / (slot || 1))));
	}

	function onKeydown(event: KeyboardEvent) {
		if (count === 0) return;
		const current = active ?? -1;
		if (event.key === 'ArrowRight') active = Math.min(count - 1, current + 1);
		else if (event.key === 'ArrowLeft') active = Math.max(0, current - 1);
		else if (event.key === 'Escape') active = null;
		else return;
		event.preventDefault();
	}

	// Infobulle à côté de la colonne survolée, du côté où il reste de la place.
	const tooltipOnLeft = $derived(active !== null && center(active) > width / 2);
	const tooltipLeft = $derived(
		active === null ? 0 : center(active) + (tooltipOnLeft ? -barWidth : barWidth)
	);
</script>

<div class="min-w-0 @container">
	<ul class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs @lg:grid-cols-2">
		{#each series as s, index (s.label)}
			<li class="flex min-w-0 items-center gap-2">
				<span
					class="size-2.5 shrink-0 rounded-sm"
					style={`background:${chartColors[s.tone]}`}
					aria-hidden="true"
				></span>
				<span class="truncate text-foreground-secondary">{s.label}</span>
				<span class="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
					{format(seriesTotals[index])}
				</span>
				<span class="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
					{Math.round(sharePercent(seriesTotals[index], grandTotal))} %
				</span>
			</li>
		{/each}
	</ul>

	<div class="relative mt-4" bind:clientWidth={width}>
		{#if width > 0}
			<!-- Survol/flèches = infobulle visuelle ; les valeurs sont aussi dans le tableau sr-only. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<svg
				{width}
				{height}
				role="img"
				aria-label={`${label}. Flèches gauche/droite pour parcourir les jours.`}
				tabindex="0"
				class="block touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
				onpointermove={(e) => (active = indexAt(e.clientX, e.currentTarget))}
				onpointerleave={() => (active = null)}
				onkeydown={onKeydown}
				onblur={() => (active = null)}
			>
				{#each ticks as tick (tick)}
					<line
						x1={PAD.left}
						x2={PAD.left + plotWidth}
						y1={y(tick)}
						y2={y(tick)}
						class={tick === 0 ? 'stroke-border' : 'stroke-border/60'}
						stroke-width="1"
					/>
					<text
						x={PAD.left - 6}
						y={y(tick)}
						dy="0.32em"
						text-anchor="end"
						class="fill-muted-foreground text-2xs tabular-nums">{format(tick)}</text
					>
				{/each}

				{#each dates as date, i (date)}
					<g opacity={active === null || active === i ? 1 : 0.5}>
						{#each segments(i) as segment, k (k)}
							<path d={segment.d} fill={segment.color} />
						{/each}
					</g>
					{#if showDateLabel(i)}
						<text
							x={center(i)}
							y={height - 6}
							text-anchor="middle"
							class="fill-muted-foreground text-2xs tabular-nums">{shortCivilDate(date)}</text
						>
					{/if}
				{/each}
			</svg>

			{#if active !== null}
				<div
					class="pointer-events-none absolute top-0 z-dropdown rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md"
					class:-translate-x-full={tooltipOnLeft}
					style={`left:${tooltipLeft}px`}
					role="status"
				>
					<p class="whitespace-nowrap font-semibold">
						{shortCivilDate(dates[active])} · {format(totals[active])}
						{unit}
					</p>
					{#each [...series].reverse() as s (s.label)}
						<p class="mt-0.5 flex items-center gap-2 whitespace-nowrap tabular-nums">
							<span
								class="inline-block size-2 rounded-sm"
								style={`background:${chartColors[s.tone]}`}
								aria-hidden="true"
							></span>
							{s.label} : {format(s.values[active] ?? 0)}
						</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<table class="sr-only">
		<caption>{label}</caption>
		<thead>
			<tr>
				<th scope="col">Jour</th>
				{#each series as s (s.label)}<th scope="col">{s.label}</th>{/each}
				<th scope="col">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each dates as date, i (date)}
				<tr>
					<th scope="row">{shortCivilDate(date)}</th>
					{#each series as s (s.label)}<td>{format(s.values[i] ?? 0)}</td>{/each}
					<td>{format(totals[i])} {unit}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
