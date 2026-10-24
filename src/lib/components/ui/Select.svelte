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
		'data-testid'?: string;
		onchange?: (e: Event) => void;
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
		'data-testid': testId,
		onchange,
		children
	}: Props = $props();
</script>

<select
	{id}
	{name}
	bind:value
	{disabled}
	{required}
	{onchange}
	aria-label={ariaLabel}
	aria-invalid={invalid || undefined}
	data-testid={testId}
	class={cn(
		'min-h-control w-full rounded-lg border border-input bg-surface py-2 pr-9 pl-3 text-sm text-foreground shadow-xs outline-none transition-colors hover:border-border-strong focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground',
		invalid && 'border-danger hover:border-danger focus:border-danger focus:ring-danger/15',
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
