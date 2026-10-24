<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { cn } from '$lib/utils';
	import { medcoreColors, medcoreTypography } from '$lib/design/theme';

	interface Props {
		icon?: ComponentType;
		title: string;
		value: string | number;
		detail?: string;
		trend?: string;
		progress?: number;
		accent?: string;
		class?: string;
	}

	let {
		icon: Icon,
		title,
		value,
		detail = '',
		trend = '',
		progress,
		accent = medcoreColors.primary,
		class: className = ''
	}: Props = $props();

	const clampedProgress = $derived(
		progress == null ? null : Math.min(Math.max(Number(progress) || 0, 0), 100)
	);
</script>

<div
	class={cn('rounded-xl border border-border bg-surface p-5 shadow-xs', className)}
	data-testid="metric-card"
>
	<div class="flex items-start justify-between gap-3">
		<p class="text-small font-medium text-muted-foreground">{title}</p>
		{#if Icon}
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-lg"
				style={`color:${accent};background:color-mix(in srgb, ${accent} 10%, white)`}
			>
				<Icon size={18} aria-hidden="true" />
			</div>
		{/if}
	</div>
	<p class={cn('mt-2', medcoreTypography.kpi)}>{value}</p>
	{#if trend}
		<p class="mt-1 text-xs text-muted-foreground">{trend}</p>
	{/if}
	{#if clampedProgress != null}
		<div
			class="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
			role="progressbar"
			aria-label={`${title} : ${clampedProgress} %`}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={clampedProgress}
		>
			<div
				class="mc-progress-fill h-full rounded-full"
				style={`width:${clampedProgress}%;background:${accent}`}
			></div>
		</div>
	{/if}
	{#if detail}
		<p class="mt-2 text-xs text-muted-foreground">{detail}</p>
	{/if}
</div>

<style>
	.mc-progress-fill {
		transform-origin: left center;
		animation: mc-progress-reveal 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes mc-progress-reveal {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mc-progress-fill {
			animation: none;
		}
	}
</style>
