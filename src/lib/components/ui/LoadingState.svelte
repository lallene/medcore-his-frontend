<script lang="ts">
	import Spinner from './Spinner.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		label?: string;
		class?: string;
	}

	let { label = 'Chargement…', class: className = '' }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground',
		className
	)}
	role="status"
	aria-live="polite"
>
	<Spinner size={24} />
	<p>{label}</p>
</div>
