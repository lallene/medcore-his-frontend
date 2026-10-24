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

<label class={cn('inline-flex items-center gap-3 text-sm text-foreground-secondary', className)}>
	<button
		{id}
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label || 'Basculer'}
		{disabled}
		onclick={() => (checked = !checked)}
		class={cn(
			'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
			checked ? 'bg-primary' : 'bg-slate-300 hover:bg-slate-400'
		)}
	>
		<span
			class={cn(
				'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
				checked && 'translate-x-5'
			)}
			aria-hidden="true"
		></span>
	</button>
	{#if label}<span>{label}</span>{/if}
</label>
