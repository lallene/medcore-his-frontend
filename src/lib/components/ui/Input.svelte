<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		id?: string;
		type?: string;
		placeholder?: string;
		value?: string;
		disabled?: boolean;
		readonly?: boolean;
		invalid?: boolean;
		required?: boolean;
		name?: string;
		autocomplete?: AutoFill;
		class?: string;
		'data-testid'?: string;
		oninput?: (e: Event) => void;
	}

	let {
		id = '',
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		disabled = false,
		readonly = false,
		invalid = false,
		required = false,
		name = '',
		autocomplete,
		class: className = '',
		'data-testid': testId,
		oninput
	}: Props = $props();
</script>

<input
	{id}
	{type}
	{name}
	{placeholder}
	{disabled}
	{readonly}
	{required}
	{autocomplete}
	{oninput}
	bind:value
	aria-invalid={invalid || undefined}
	data-testid={testId}
	class={cn(
		'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70',
		invalid && 'border-danger focus:border-danger focus:ring-danger/15',
		className
	)}
/>
