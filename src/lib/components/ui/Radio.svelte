<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		id?: string;
		name: string;
		value: string;
		group?: string;
		disabled?: boolean;
		label?: string;
		class?: string;
	}

	let {
		id = '',
		name,
		value,
		group = $bindable(''),
		disabled = false,
		label = '',
		class: className = ''
	}: Props = $props();
</script>

<label class={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
	<input
		{id}
		{name}
		type="radio"
		{value}
		bind:group
		{disabled}
		class="h-4 w-4 border-border text-primary focus:ring-primary/30"
	/>
	{#if label}<span>{label}</span>{/if}
</label>
