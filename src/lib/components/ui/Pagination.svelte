<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import Button from './Button.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		page: number;
		totalPages: number;
		total?: number;
		pageSize?: number;
		onpage?: (page: number) => void;
		class?: string;
	}

	let {
		page,
		totalPages,
		total = 0,
		pageSize = 20,
		onpage,
		class: className = ''
	}: Props = $props();

	const start = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const end = $derived(Math.min(page * pageSize, total));
</script>

<nav
	class={cn('flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600', className)}
	aria-label="Pagination"
>
	<p>
		{#if total > 0}
			{start}–{end} sur {total}
		{:else}
			Page {page} / {Math.max(totalPages, 1)}
		{/if}
	</p>
	<div class="flex items-center gap-2">
		<Button
			variant="secondary"
			size="sm"
			disabled={page <= 1}
			onclick={() => onpage?.(page - 1)}
			aria-label="Page précédente"
		>
			<ChevronLeft size={16} />
			Précédent
		</Button>
		<Button
			variant="secondary"
			size="sm"
			disabled={page >= totalPages}
			onclick={() => onpage?.(page + 1)}
			aria-label="Page suivante"
		>
			Suivant
			<ChevronRight size={16} />
		</Button>
	</div>
</nav>
