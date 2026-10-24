<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		lines?: number;
	}

	let { class: className = '', lines = 3 }: Props = $props();
</script>

<div class={cn('animate-pulse space-y-3', className)} aria-hidden="true">
	{#each Array.from({ length: lines }, (_, i) => i) as i (i)}
		<div class="h-3 rounded-sm bg-surface-sunken" style={`width:${90 - i * 12}%`}></div>
	{/each}
</div>
