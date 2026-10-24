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
		info: 'border-info-border bg-info-soft text-sky-900 [&>svg]:text-info-strong',
		success: 'border-success-border bg-success-soft text-emerald-900 [&>svg]:text-success-strong',
		warning: 'border-warning-border bg-warning-soft text-amber-950 [&>svg]:text-warning-strong',
		danger: 'border-danger-border bg-danger-soft text-red-900 [&>svg]:text-danger-strong'
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

<div {role} class={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', styles[tone], className)}>
	<Icon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
	<div class="min-w-0">
		{#if title}<p class="font-semibold">{title}</p>{/if}
		{#if children}<div class={title ? 'mt-1' : ''}>{@render children()}</div>{/if}
	</div>
</div>
