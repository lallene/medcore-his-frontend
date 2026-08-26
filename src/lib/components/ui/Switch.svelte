<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		id?: string;
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		class?: string;
	}

	let {
		id = '',
		checked = $bindable(false),
		disabled = false,
		label = '',
		class: className = ''
	}: Props = $props();
</script>

<label class={cn('inline-flex items-center gap-3 text-sm text-slate-700', className)}>
	<button
		{id}
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label || 'Basculer'}
		{disabled}
		onclick={() => (checked = !checked)}
		class={cn(
			'relative h-6 w-11 rounded-full transition focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50',
			checked ? 'bg-primary' : 'bg-slate-300'
		)}
	>
		<span
			class={cn(
				'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition',
				checked && 'translate-x-5'
			)}
			aria-hidden="true"
		></span>
	</button>
	{#if label}<span>{label}</span>{/if}
</label>
