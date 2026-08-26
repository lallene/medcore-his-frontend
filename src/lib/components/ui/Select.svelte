<script lang="ts">
	import { cn } from '$lib/utils';

	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		id?: string;
		options?: Option[];
		value?: string;
		disabled?: boolean;
		invalid?: boolean;
		required?: boolean;
		name?: string;
		class?: string;
		'aria-label'?: string;
		children?: import('svelte').Snippet;
	}

	let {
		id = '',
		options = [],
		value = $bindable(''),
		disabled = false,
		invalid = false,
		required = false,
		name = '',
		class: className = '',
		'aria-label': ariaLabel,
		children
	}: Props = $props();
</script>

<select
	{id}
	{name}
	bind:value
	{disabled}
	{required}
	aria-label={ariaLabel}
	aria-invalid={invalid || undefined}
	class={cn(
		'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted',
		invalid && 'border-danger focus:border-danger focus:ring-danger/15',
		className
	)}
>
	{#if children}
		{@render children()}
	{:else}
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	{/if}
</select>
