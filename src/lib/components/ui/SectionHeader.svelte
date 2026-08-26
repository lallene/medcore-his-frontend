<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { medcoreTypography } from '$lib/design/theme';

	interface Props {
		title: string;
		description?: string;
		class?: string;
		actions?: Snippet;
	}

	let { title, description = '', class: className = '', actions }: Props = $props();
</script>

<div class={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
	<div>
		<h2 class={medcoreTypography.sectionTitle}>{title}</h2>
		{#if description}<p class="mt-1 text-sm text-slate-500">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex gap-2">{@render actions()}</div>{/if}
</div>
