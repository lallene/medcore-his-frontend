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
		title = 'Aucun élément',
		description = "Il n'y a rien à afficher pour le moment.",
		icon: Icon = Inbox,
		class: className = '',
		cta
	}: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-muted/50 px-6 py-10 text-center',
		className
	)}
	role="status"
>
	<div
		class="mb-3 flex size-11 items-center justify-center rounded-lg bg-surface text-muted-foreground ring-1 ring-border"
	>
		<Icon size={22} aria-hidden="true" />
	</div>
	<h3 class={medcoreTypography.cardTitle}>{title}</h3>
	<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
	{#if cta}
		<div class="mt-5">{@render cta()}</div>
	{/if}
</div>
