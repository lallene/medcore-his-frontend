<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { medcoreTypography } from '$lib/design/theme';

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		class?: string;
		actions?: Snippet;
		meta?: Snippet;
	}

	let {
		eyebrow = '',
		title,
		description = '',
		class: className = '',
		actions,
		meta
	}: Props = $props();
</script>

<header
	class={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
	data-testid="page-header"
>
	<div class="min-w-0">
		{#if eyebrow}
			<p class={medcoreTypography.eyebrow}>{eyebrow}</p>
		{/if}
		<h1 class={cn(medcoreTypography.pageTitle, eyebrow && 'mt-2')}>{title}</h1>
		{#if description}
			<p class="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
		{/if}
		{#if meta}
			<div class="mt-3">{@render meta()}</div>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>
