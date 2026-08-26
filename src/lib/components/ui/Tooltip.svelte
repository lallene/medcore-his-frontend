<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		text: string;
		class?: string;
		children: Snippet;
	}

	let { text, class: className = '', children }: Props = $props();
</script>

<span class={cn('inline-flex', className)} title={text}>
	{@render children()}
</span>
