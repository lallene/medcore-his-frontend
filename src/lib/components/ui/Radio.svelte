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

<label
	class={cn(
		'inline-flex items-center gap-2 text-sm text-foreground-secondary has-[:disabled]:opacity-60',
		className
	)}
>
	<input
		{id}
		{name}
		type="radio"
		{value}
		bind:group
		{disabled}
		class="size-4 border-border-strong text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
	/>
	{#if label}<span>{label}</span>{/if}
</label>
