<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { medcoreTypography } from '$lib/design/theme';

	interface Props {
		title: string;
		description?: string;
		columns?: 1 | 2 | 3;
		class?: string;
		children: Snippet;
		actions?: Snippet;
	}

	let {
		title,
		description = '',
		columns = 2,
		class: className = '',
		children,
		actions
	}: Props = $props();

	const grid = $derived(
		columns === 1
			? 'grid gap-4'
			: columns === 3
				? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
				: 'grid gap-4 md:grid-cols-2'
	);
</script>

<section
	class={cn(
		'rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]',
		className
	)}
>
	<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class={medcoreTypography.sectionTitle}>{title}</h2>
			{#if description}
				<p class="mt-1 text-sm text-slate-500">{description}</p>
			{/if}
		</div>
		{#if actions}{@render actions()}{/if}
	</div>
	<div class={grid}>
		{@render children()}
	</div>
</section>
