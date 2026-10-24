<script lang="ts">
	import Alert from './Alert.svelte';
	import EmptyState from './EmptyState.svelte';
	import LoadingState from './LoadingState.svelte';
	import {
		chartColors,
		chartMotion,
		formatChartNumber,
		sharePercent,
		type ChartTone
	} from '$lib/design/charts';

	export interface BarChartRow {
		label: string;
		value: number;
		tone?: ChartTone;
	}

	interface Props {
		title: string;
		description?: string;
		rows?: BarChartRow[];
		unit?: string;
		state?: 'loading' | 'empty' | 'error' | 'data';
		errorMessage?: string;
	}

	let {
		title,
		description = '',
		rows = [],
		unit = '',
		state = 'data',
		errorMessage = 'Impossible de charger les données de cette visualisation.'
	}: Props = $props();

	const total = $derived(rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
	const maxValue = $derived(Math.max(0, ...rows.map((row) => Math.max(0, row.value))));
	const resolvedState = $derived(state === 'data' && total <= 0 ? 'empty' : state);
	const descriptionId = $derived(`chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
</script>

<section
	class="@container rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6"
	aria-labelledby={`${descriptionId}-title`}
	aria-describedby={description ? `${descriptionId}-description` : undefined}
>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 id={`${descriptionId}-title`} class="text-base font-semibold text-foreground">
				{title}
			</h2>

			{#if description}
				<p id={`${descriptionId}-description`} class="mt-1 text-sm text-muted-foreground">
					{description}
				</p>
			{/if}
		</div>

		{#if resolvedState === 'data'}
			<div class="text-right">
				<p class="text-xs text-muted-foreground">Total</p>
				<p class="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
					{formatChartNumber(total)}
					{unit}
				</p>
			</div>
		{/if}
	</div>

	{#if resolvedState === 'loading'}
		<div class="mt-5">
			<LoadingState label="Chargement de la visualisation…" />
		</div>
	{:else if resolvedState === 'error'}
		<div class="mt-5">
			<Alert tone="danger">{errorMessage}</Alert>
		</div>
	{:else if resolvedState === 'empty'}
		<div class="mt-5">
			<EmptyState
				title="Aucune donnée disponible pour cette période"
				description="La visualisation apparaîtra lorsque des données seront disponibles."
			/>
		</div>
	{:else}
		<div class="mt-6">
			<div class="relative">
				<div
					class="pointer-events-none absolute inset-x-0 bottom-[74px] top-0 flex flex-col justify-between"
					aria-hidden="true"
				>
					<div class="border-t border-border/60"></div>
					<div class="border-t border-border/60"></div>
					<div class="border-t border-border/60"></div>
					<div class="border-t border-border/60"></div>
					<div class="border-t border-border"></div>
				</div>

				<div
					class="relative grid h-[280px] grid-cols-6 items-end gap-1.5 @md:gap-3 @2xl:gap-6"
					role="list"
					aria-label={`${title}. Total : ${formatChartNumber(total)} ${unit}.`}
				>
					{#each rows as row, index (row.label)}
						{@const value = Math.max(0, row.value)}
						{@const percent = sharePercent(value, total)}
						{@const height = maxValue > 0 ? (value / maxValue) * 100 : 0}
						{@const formattedValue = formatChartNumber(value)}

						<div
							class="group relative flex h-full min-w-0 flex-col justify-end"
							role="listitem"
							aria-label={`${row.label} : ${formattedValue} ${unit}, ${Math.round(percent)} % du total`}
						>
							<div class="relative flex h-[195px] items-end justify-center">
								<div
									class="mc-column relative w-full max-w-[84px] rounded-t-md"
									style={`--chart-height:${height}%;--chart-color:${chartColors[row.tone ?? 'primary']};--chart-duration:${chartMotion.durationMs}ms;--chart-easing:${chartMotion.easing};--chart-delay:${index * 55}ms`}
								>
									{#if value > 0}
										<span
											class="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-semibold tabular-nums text-foreground"
										>
											{formattedValue}
										</span>
									{/if}
								</div>
							</div>

							<div class="mt-3 min-h-[58px] text-center">
								<p
									class="text-2xs font-medium whitespace-nowrap text-foreground-secondary @lg:text-xs @2xl:text-sm"
								>
									{row.label}
								</p>
								<p class="mt-1 text-xs tabular-nums text-muted-foreground">
									{Math.round(percent)} %
								</p>
							</div>

							<div
								class="pointer-events-none absolute bottom-[72px] left-1/2 z-dropdown hidden -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md group-hover:block"
								role="tooltip"
							>
								<p class="whitespace-nowrap font-semibold">{row.label}</p>
								<p class="mt-0.5 whitespace-nowrap tabular-nums">
									{formattedValue}
									{unit} · {Math.round(percent)} %
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<p class="sr-only">
				{#each rows as row, index (row.label)}
					{row.label} : {formatChartNumber(Math.max(0, row.value))}
					{unit},
					{Math.round(sharePercent(row.value, total))} % du total{index < rows.length - 1
						? '; '
						: '.'}
				{/each}
			</p>
		</div>
	{/if}
</section>

<style>
	.mc-column {
		height: var(--chart-height);
		min-height: 0;
		background: var(--chart-color);
		transform-origin: bottom center;
		animation: mc-column-reveal var(--chart-duration) var(--chart-easing) var(--chart-delay) both;
	}

	@keyframes mc-column-reveal {
		from {
			transform: scaleY(0);
			opacity: 0.45;
		}

		to {
			transform: scaleY(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mc-column {
			animation: none;
		}
	}
</style>
