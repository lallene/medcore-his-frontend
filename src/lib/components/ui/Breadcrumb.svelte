<script lang="ts">
	import { resolve } from '$app/paths';
	import { ChevronRight } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		items: Crumb[];
		class?: string;
	}

	let { items, class: className = '' }: Props = $props();
</script>

<nav aria-label="Fil d'Ariane" class={cn('flex flex-wrap items-center gap-1 text-sm', className)}>
	{#each items as item, i (item.label + i)}
		{#if i > 0}
			<ChevronRight class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
		{/if}
		{#if item.href && i < items.length - 1}
			<a class="font-medium text-primary hover:underline" href={resolve(item.href as '/patients')}
				>{item.label}</a
			>
		{:else}
			<span class="text-slate-500" aria-current={i === items.length - 1 ? 'page' : undefined}
				>{item.label}</span
			>
		{/if}
	{/each}
</nav>
