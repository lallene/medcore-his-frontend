<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		id?: string;
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		name?: string;
		class?: string;
	}

	let {
		id = '',
		checked = $bindable(false),
		disabled = false,
		label = '',
		name = '',
		class: className = ''
	}: Props = $props();
</script>

<label class={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
	<input
		{id}
		{name}
		type="checkbox"
		bind:checked
		{disabled}
		class="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
	/>
	{#if label}<span>{label}</span>{/if}
</label>
