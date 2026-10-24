<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		id?: string;
		rows?: number;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		invalid?: boolean;
		required?: boolean;
		name?: string;
		class?: string;
		'data-testid'?: string;
	}

	let {
		id = '',
		rows = 4,
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		readonly = false,
		invalid = false,
		required = false,
		name = '',
		class: className = '',
		'data-testid': testId
	}: Props = $props();
</script>

<textarea
	{id}
	{name}
	bind:value
	{rows}
	{placeholder}
	{disabled}
	{readonly}
	{required}
	aria-invalid={invalid || undefined}
	data-testid={testId}
	class={cn(
		'w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground',
		invalid && 'border-danger hover:border-danger focus:border-danger focus:ring-danger/15',
		className
	)}></textarea>
