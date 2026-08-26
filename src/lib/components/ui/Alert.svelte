<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	type Tone = 'info' | 'success' | 'warning' | 'danger';

	interface Props {
		tone?: Tone;
		title?: string;
		class?: string;
		children?: Snippet;
		role?: 'alert' | 'status';
	}

	let {
		tone = 'info',
		title = '',
		class: className = '',
		children,
		role = 'alert'
	}: Props = $props();

	const styles: Record<Tone, string> = {
		info: 'border-sky-200 bg-sky-50 text-sky-900',
		success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
		warning: 'border-amber-200 bg-amber-50 text-amber-950',
		danger: 'border-red-200 bg-red-50 text-red-900'
	};

	const Icon = $derived(
		tone === 'success'
			? CheckCircle2
			: tone === 'warning'
				? TriangleAlert
				: tone === 'danger'
					? AlertCircle
					: Info
	);
</script>

<div {role} class={cn('flex gap-3 rounded-2xl border p-4 text-sm', styles[tone], className)}>
	<Icon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
	<div class="min-w-0">
		{#if title}<p class="font-semibold">{title}</p>{/if}
		{#if children}<div class={title ? 'mt-1' : ''}>{@render children()}</div>{/if}
	</div>
</div>
