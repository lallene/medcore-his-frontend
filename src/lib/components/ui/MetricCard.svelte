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
</script>

<div
	class={cn(
		'rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-card-hover)]',
		className
	)}
	data-testid="metric-card"
>
	<div class="flex items-center justify-between">
		{#if Icon}
			<div
				class="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
				style={`background:${accent}`}
			>
				<Icon size={20} aria-hidden="true" />
			</div>
		{:else}
			<div></div>
		{/if}
		{#if trend}
			<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
				{trend}
			</span>
		{/if}
	</div>
	<p class="mt-4 text-sm text-slate-500">{title}</p>
	<p class={cn('mt-1', medcoreTypography.kpi)}>{value}</p>
	{#if progress != null}
		<div class="mt-4 h-2 rounded-full bg-slate-100">
			<div class="h-2 rounded-full" style={`width:${progress}%;background:${accent}`}></div>
		</div>
	{/if}
	{#if detail}
		<p class="mt-2 text-xs text-slate-400">{detail}</p>
	{/if}
</div>
