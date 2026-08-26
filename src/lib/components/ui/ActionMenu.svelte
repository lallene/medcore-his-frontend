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
			class="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-modal)]"
			role="menu"
		>
			{@render children()}
		</div>
	{/if}
</div>
