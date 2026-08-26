<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Inbox } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { medcoreTypography } from '$lib/design/theme';

	interface Props {
		title?: string;
		description?: string;
		// lucide icons are compatible at runtime
		icon?: typeof Inbox;
		class?: string;
		cta?: Snippet;
	}

	let {
		title = 'Aucun element',
		description = "Il n'y a rien a afficher pour le moment.",
		icon: Icon = Inbox,
		class: className = '',
		cta
	}: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 px-6 py-12 text-center',
		className
	)}
	role="status"
>
	<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
		<Icon size={22} aria-hidden="true" />
	</div>
	<h3 class={medcoreTypography.cardTitle}>{title}</h3>
	<p class="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
	{#if cta}
		<div class="mt-5">{@render cta()}</div>
	{/if}
</div>
