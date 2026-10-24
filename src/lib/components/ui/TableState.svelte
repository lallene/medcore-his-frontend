<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AlertCircle, Inbox } from 'lucide-svelte';

	/**
	 * Ligne d'état d'un tableau MedCore : chargement (squelette qui préserve la
	 * hauteur), vide ou erreur. À placer dans `<tbody>`.
	 */
	interface Props {
		state: 'loading' | 'empty' | 'error';
		colspan: number;
		title?: string;
		description?: string;
		/** Nombre de lignes fantômes pendant le chargement. */
		rows?: number;
		action?: Snippet;
		'data-testid'?: string;
	}

	let {
		state,
		colspan,
		title = '',
		description = '',
		rows = 3,
		action,
		'data-testid': testId
	}: Props = $props();

	const defaultTitle = $derived(
		state === 'error' ? 'Impossible de charger les données' : 'Aucun résultat'
	);
</script>

{#if state === 'loading'}
	{#each Array.from({ length: rows }, (_, i) => i) as i (i)}
		<tr class="mc-row-state" aria-hidden="true" data-testid={i === 0 ? testId : undefined}>
			<td {colspan}>
				<div
					class="h-3 animate-pulse rounded-sm bg-surface-sunken"
					style={`width:${88 - i * 14}%`}
				></div>
			</td>
		</tr>
	{/each}
	<tr class="sr-only">
		<td {colspan}><span role="status" aria-live="polite">{title || 'Chargement…'}</span></td>
	</tr>
{:else}
	<tr class="mc-row-state" data-testid={testId}>
		<td {colspan} class="py-10 text-center">
			<div
				class="mx-auto flex max-w-md flex-col items-center gap-2"
				role={state === 'error' ? 'alert' : 'status'}
			>
				{#if state === 'error'}
					<AlertCircle size={20} class="text-danger-strong" aria-hidden="true" />
				{:else}
					<Inbox size={20} class="text-subtle-foreground" aria-hidden="true" />
				{/if}
				<p
					class={state === 'error'
						? 'font-semibold text-danger-strong'
						: 'font-semibold text-foreground'}
				>
					{title || defaultTitle}
				</p>
				{#if description}<p class="text-small text-muted-foreground">{description}</p>{/if}
				{#if action}<div class="mt-2">{@render action()}</div>{/if}
			</div>
		</td>
	</tr>
{/if}
