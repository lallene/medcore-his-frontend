<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

	interface Props {
		type?: 'button' | 'submit' | 'reset';
		variant?: Variant;
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		onclick?: () => void;
		children?: Snippet;
	}

	let {
		type = 'button',
		variant = 'primary',
		disabled = false,
		loading = false,
		fullWidth = false,
		onclick,
		children
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'bg-blue-600 hover:bg-blue-700 text-white',
		secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
		success: 'bg-green-600 hover:bg-green-700 text-white',
		danger: 'bg-red-600 hover:bg-red-700 text-white',
		ghost: 'bg-transparent hover:bg-slate-100 text-slate-700'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	class={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition
	${variants[variant]}
	${fullWidth ? 'w-full' : ''}
	${disabled || loading ? 'cursor-not-allowed opacity-60' : ''}`}
>
	{#if loading}
		<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
	{/if}

	{@render children?.()}
</button>
