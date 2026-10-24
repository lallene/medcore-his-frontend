<script lang="ts">
	import {
		chartColors,
		labelInterval,
		niceAxis,
		shortCivilDate,
		type ChartTone
	} from '$lib/design/charts';

	export interface LineChartSeries {
		label: string;
		values: number[];
		tone?: ChartTone;
		/** Tiret : encodage secondaire, l'identité ne repose pas sur la couleur seule. */
		dashed?: boolean;
	}

	interface Props {
		/** Jours civils YYYY-MM-DD, alignés sur les valeurs de chaque série. */
		dates: string[];
		series: LineChartSeries[];
		label: string;
		unit?: string;
		height?: number;
	}

	let { dates, series, label, unit = '', height = 220 }: Props = $props();

	const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
	const format = (value: number) =>
		new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);

	let width = $state(0);
	let active = $state<number | null>(null);

	const count = $derived(dates.length);
	const axis = $derived(niceAxis(Math.max(0, ...series.flatMap((s) => s.values))));
	const ticks = $derived(
		Array.from({ length: Math.round(axis.max / axis.step) + 1 }, (_, i) => i * axis.step)
	);
	const plotWidth = $derived(Math.max(0, width - PAD.left - PAD.right));
	const plotHeight = $derived(height - PAD.top - PAD.bottom);
	const every = $derived(labelInterval(count, Math.max(2, Math.floor(plotWidth / 56))));

	const x = (i: number) =>
		count <= 1 ? PAD.left + plotWidth / 2 : PAD.left + (i * plotWidth) / (count - 1);
	const y = (value: number) => PAD.top + plotHeight * (1 - Math.max(0, value) / axis.max);
	// Identifiant unique des dégradés (plusieurs graphiques par page).
	const uid = $props.id();

	const linePath = (values: number[]) =>
		values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
	// Aire décorative sous une série pleine : même tracé refermé sur la ligne de base.
	const areaPath = (values: number[]) =>
		`${linePath(values)} L${x(values.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

	// Dernier jour toujours libellé ; un libellé régulier trop proche de lui est omis.
	const showDateLabel = (i: number) =>
		i === count - 1 || (i % every === 0 && count - 1 - i >= every);

	function indexAt(clientX: number, target: SVGElement): number {
		const left = target.getBoundingClientRect().left;
		if (count <= 1) return 0;
		const step = plotWidth / (count - 1);
		return Math.min(count - 1, Math.max(0, Math.round((clientX - left - PAD.left) / step)));
	}

	function onKeydown(event: KeyboardEvent) {
		if (count === 0) return;
		const current = active ?? -1;
		if (event.key === 'ArrowRight') active = Math.min(count - 1, current + 1);
		else if (event.key === 'ArrowLeft') active = Math.max(0, current <= 0 ? 0 : current - 1);
		else if (event.key === 'Escape') active = null;
		else return;
		event.preventDefault();
	}

	// Infobulle à côté du repère (jamais dessus), du côté où il reste de la place.
	const tooltipOnLeft = $derived(active !== null && x(active) > width / 2);
	const tooltipLeft = $derived(active === null ? 0 : x(active) + (tooltipOnLeft ? -12 : 12));
</script>

<div class="min-w-0">
	<ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground-secondary">
		{#each series as s (s.label)}
			<li class="flex items-center gap-2">
				<svg width="20" height="8" aria-hidden="true">
					<line
						x1="1"
						y1="4"
						x2="19"
						y2="4"
						stroke={chartColors[s.tone ?? 'primary']}
						stroke-width="2"
						stroke-linecap="round"
						stroke-dasharray={s.dashed ? '4 3' : undefined}
					/>
				</svg>
				{s.label}
				<span class="font-semibold tabular-nums text-foreground">
					{format(s.values.reduce((sum, v) => sum + v, 0))}
				</span>
			</li>
		{/each}
	</ul>

	<div class="relative mt-3" bind:clientWidth={width}>
		{#if width > 0}
			<!-- Survol/flèches = infobulle visuelle ; les valeurs sont aussi dans le tableau sr-only. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<svg
				{width}
				{height}
				role="img"
				aria-label={`${label}. Flèches gauche/droite pour parcourir les jours.`}
				tabindex="0"
				class="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
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
						x={PAD.left - 8}
						y={y(tick)}
						dy="0.32em"
						text-anchor="end"
						class="fill-muted-foreground text-2xs tabular-nums">{format(tick)}</text
					>
				{/each}

				{#each dates as date, i (date)}
					{#if showDateLabel(i)}
						<text
							x={x(i)}
							y={height - 6}
							text-anchor={count > 1 && i === 0
								? 'start'
								: count > 1 && i === count - 1
									? 'end'
									: 'middle'}
							class="fill-muted-foreground text-2xs tabular-nums">{shortCivilDate(date)}</text
						>
					{/if}
				{/each}

				{#if active !== null}
					<line
						x1={x(active)}
						x2={x(active)}
						y1={PAD.top}
						y2={PAD.top + plotHeight}
						class="stroke-muted-foreground/50"
						stroke-width="1"
					/>
				{/if}

				<defs>
					{#each series as s, index (s.label)}
						<linearGradient id={`${uid}-area-${index}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color={chartColors[s.tone ?? 'primary']} stop-opacity="0.18" />
							<stop offset="100%" stop-color={chartColors[s.tone ?? 'primary']} stop-opacity="0" />
						</linearGradient>
					{/each}
				</defs>

				{#each series as s, index (s.label)}
					{@const color = chartColors[s.tone ?? 'primary']}
					{#if count > 1 && !s.dashed}
						<path d={areaPath(s.values)} fill={`url(#${uid}-area-${index})`} />
					{/if}
					{#if count > 1}
						<path
							d={linePath(s.values)}
							fill="none"
							stroke={color}
							stroke-width="2"
							stroke-linejoin="round"
							stroke-linecap="round"
							stroke-dasharray={s.dashed ? '6 4' : undefined}
						/>
					{/if}
					{#each s.values as value, i (i)}
						{#if count === 1 || i === active}
							<circle
								cx={x(i)}
								cy={y(value)}
								r="4"
								fill={color}
								class="stroke-surface"
								stroke-width="2"
							/>
						{/if}
					{/each}
				{/each}
			</svg>

			{#if active !== null}
				<div
					class="pointer-events-none absolute top-0 z-dropdown rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md"
					class:-translate-x-full={tooltipOnLeft}
					style={`left:${tooltipLeft}px`}
					role="status"
				>
					<p class="whitespace-nowrap font-semibold">{shortCivilDate(dates[active])}</p>
					{#each series as s (s.label)}
						<p class="mt-0.5 flex items-center gap-2 whitespace-nowrap tabular-nums">
							<span
								class="inline-block size-2 rounded-full"
								style={`background:${chartColors[s.tone ?? 'primary']}`}
								aria-hidden="true"
							></span>
							{s.label} : {format(s.values[active] ?? 0)}
							{unit}
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
			</tr>
		</thead>
		<tbody>
			{#each dates as date, i (date)}
				<tr>
					<th scope="row">{shortCivilDate(date)}</th>
					{#each series as s (s.label)}<td>{format(s.values[i] ?? 0)} {unit}</td>{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
