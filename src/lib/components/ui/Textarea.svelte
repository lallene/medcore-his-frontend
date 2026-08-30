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
		'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted',
		invalid && 'border-danger focus:border-danger focus:ring-danger/15',
		className
	)}></textarea>
