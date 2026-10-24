<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MoreHorizontal } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import IconButton from './IconButton.svelte';

	interface Props {
		label?: string;
		class?: string;
		children: Snippet;
	}

	let { label = 'Actions', class: className = '', children }: Props = $props();

	let open = $state(false);
</script>

<div class={cn('relative inline-block', className)}>
	<IconButton {label} onclick={() => (open = !open)}>
		<MoreHorizontal size={18} />
	</IconButton>
	{#if open}
		<div
			class="absolute right-0 z-(--z-dropdown) mt-1 min-w-40 rounded-lg border border-border bg-popover py-1 shadow-md"
			role="menu"
		>
			{@render children()}
		</div>
	{/if}
</div>
