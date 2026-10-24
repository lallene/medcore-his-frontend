<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	/**
	 * Tableau MedCore : conteneur avec son propre scroll horizontal + `<table>`
	 * stylé par `.mc-table` (layout.css). Le contenu (`thead`/`tbody`) reste natif.
	 */
	interface Props {
		/** Largeur minimale avant scroll horizontal dans le conteneur (ex. `900px`). */
		minWidth?: string;
		/** `bordered` (défaut) ou `plain` lorsque le tableau est déjà dans une carte bordée. */
		variant?: 'bordered' | 'plain';
		/** Légende accessible ; visuellement masquée sauf `captionVisible`. */
		caption?: string;
		captionVisible?: boolean;
		class?: string;
		tableClass?: string;
		'aria-label'?: string;
		'data-testid'?: string;
		/** `data-testid` du conteneur (conservé lorsqu'il existait sur l'ancien wrapper). */
		containerTestId?: string;
		children: Snippet;
	}

	let {
		minWidth,
		variant = 'bordered',
		caption = '',
		captionVisible = false,
		class: className = '',
		tableClass = '',
		'aria-label': ariaLabel,
		'data-testid': testId,
		containerTestId,
		children
	}: Props = $props();
</script>

<div
	class={cn('mc-table-container', className)}
	data-variant={variant}
	data-testid={containerTestId}
>
	<table
		class={cn('mc-table', tableClass)}
		style={minWidth ? `min-width:${minWidth}` : undefined}
		aria-label={ariaLabel}
		data-testid={testId}
	>
		{#if caption}
			<caption class={captionVisible ? undefined : 'sr-only'}>{caption}</caption>
		{/if}
		{@render children()}
	</table>
</div>
