<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary';

	interface Props {
		variant?: Variant;
		children?: Snippet;
	}

	let { variant = 'primary', children }: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'bg-blue-100 text-blue-700',
		success: 'bg-green-100 text-green-700',
		warning: 'bg-amber-100 text-amber-700',
		danger: 'bg-red-100 text-red-700',
		secondary: 'bg-slate-100 text-slate-700'
	};
</script>

<span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]}`}>
	{@render children?.()}
</span>
