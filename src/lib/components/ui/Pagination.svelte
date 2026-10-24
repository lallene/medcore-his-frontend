<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { paginationItems } from '$lib/design/pagination';

	/**
	 * Pagination MedCore unique : résumé à gauche, précédent / pages / suivant à droite.
	 * `onpage(n)` reçoit toujours le numéro de page demandé ; le chargement reste
	 * celui de l'écran appelant (aucun contrat API modifié).
	 */
	interface Props {
		page: number;
		/** 0 lorsque l'API ne fournit pas le nombre de pages (précédent/suivant seuls). */
		totalPages: number;
		total?: number;
		pageSize?: number;
		onpage?: (page: number) => void;
		/** Désactive la navigation pendant un chargement. */
		disabled?: boolean;
		/** Force l'état « suivant » lorsque `totalPages` est inconnu. */
		hasNext?: boolean;
		/** Unité du résumé par défaut, ex. `patient(s)`. */
		unit?: string;
		/** Résumé personnalisé (conserve un texte existant). */
		summary?: Snippet;
		showPages?: boolean;
		class?: string;
		'data-testid'?: string;
		summaryTestId?: string;
		prevTestId?: string;
		nextTestId?: string;
	}

	let {
		page,
		totalPages,
		total = 0,
		pageSize = 20,
		onpage,
		disabled = false,
		hasNext,
		unit = '',
		summary,
		showPages = true,
		class: className = '',
		'data-testid': testId,
		summaryTestId,
		prevTestId,
		nextTestId
	}: Props = $props();

	const start = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const end = $derived(Math.min(page * pageSize, total));
	const canPrev = $derived(!disabled && page > 1);
	const canNext = $derived(!disabled && (hasNext ?? page < totalPages));
	const items = $derived(showPages && totalPages > 1 ? paginationItems(page, totalPages) : []);

	const control =
		'inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-small font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-45';
	const idle =
		'border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-muted hover:text-foreground active:bg-surface-sunken';
</script>

<nav
	class={cn(
		'flex flex-wrap items-center justify-between gap-3 text-small text-muted-foreground',
		className
	)}
	aria-label="Pagination"
	data-testid={testId}
>
	<p class="tabular-nums" data-testid={summaryTestId}>
		{#if summary}
			{@render summary()}
		{:else if total > 0}
			<span class="font-medium text-foreground">{start}–{end}</span> sur
			<span class="font-medium text-foreground">{total.toLocaleString('fr-FR')}</span>
			{unit || 'résultat(s)'}
		{:else}
			Page {page}{#if totalPages > 0}
				<span> / </span>{Math.max(totalPages, 1)}{/if}
		{/if}
	</p>
	<div class="flex items-center gap-1">
		<button
			type="button"
			class={cn(control, idle)}
			disabled={!canPrev}
			onclick={() => onpage?.(page - 1)}
			aria-label="Page précédente"
			data-testid={prevTestId}
		>
			<ChevronLeft size={16} aria-hidden="true" />
		</button>
		{#each items as item, i (typeof item === 'number' ? `p${item}` : `gap${i}`)}
			{#if item === 'gap'}
				<span class="inline-flex size-8 items-center justify-center" aria-hidden="true">…</span>
			{:else}
				<button
					type="button"
					class={cn(
						control,
						'min-w-8 px-1.5',
						item === page
							? 'border-primary-border bg-primary-soft font-semibold text-primary'
							: idle
					)}
					aria-current={item === page ? 'page' : undefined}
					aria-label={`Page ${item}`}
					disabled={disabled && item !== page}
					onclick={() => item !== page && onpage?.(item)}
				>
					{item}
				</button>
			{/if}
		{/each}
		<button
			type="button"
			class={cn(control, idle)}
			disabled={!canNext}
			onclick={() => onpage?.(page + 1)}
			aria-label="Page suivante"
			data-testid={nextTestId}
		>
			<ChevronRight size={16} aria-hidden="true" />
		</button>
	</div>
</nav>
