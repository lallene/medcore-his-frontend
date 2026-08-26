<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 24, class: className = '' }: Props = $props();
</script>

<div
	class={cn('animate-spin rounded-full border-4 border-slate-200 border-t-primary', className)}
	style={`width:${size}px;height:${size}px`}
	role="status"
	aria-label="Chargement"
></div>
