<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	/**
	 * Choix d'une cible existante (implémentation, risque, constat) via sa liste API.
	 * Sans la permission de lecture correspondante, la valeur actuelle est affichée et conservée.
	 */
	interface Option {
		id: number;
		label: string;
	}

	interface Props {
		id: string;
		value?: number | null;
		allowed: boolean;
		search: (term: string) => Promise<Option[]>;
		/** Cible enregistrée et son libellé, proposée tant qu'elle est choisie. */
		currentId?: number | null;
		currentLabel?: string;
		emptyLabel: string;
		deniedText: string;
		searchable?: boolean;
		'data-testid'?: string;
	}

	let {
		id,
		value = $bindable(null),
		allowed,
		search,
		currentId = null,
		currentLabel = '',
		emptyLabel,
		deniedText,
		searchable = true,
		'data-testid': testId
	}: Props = $props();

	let term = $state('');
	let options = $state<Option[]>([]);
	let error = $state('');

	async function load() {
		error = '';
		try {
			options = await search(term.trim());
		} catch {
			error = 'Liste indisponible.';
		}
	}

	onMount(() => {
		if (allowed) void load();
	});
</script>

{#if allowed}
	{#if searchable}
		<div class="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
			<Input id={`${id}-search`} bind:value={term} placeholder="Rechercher…" />
			<Button variant="secondary" onclick={load}>Rechercher</Button>
		</div>
	{/if}
	<select
		{id}
		class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
		value={value ?? ''}
		onchange={(e) => {
			const raw = (e.currentTarget as HTMLSelectElement).value;
			value = raw ? Number(raw) : null;
		}}
		data-testid={testId}
	>
		<option value="">{emptyLabel}</option>
		{#if currentId !== null && currentLabel && !options.some((o) => o.id === currentId)}
			<option value={currentId}>{currentLabel}</option>
		{/if}
		{#each options as option (option.id)}
			<option value={option.id}>{option.label}</option>
		{/each}
	</select>
	{#if error}<p class="mt-1 text-xs text-danger">{error}</p>{/if}
{:else}
	<p class="text-sm text-foreground">{currentLabel || 'Aucune'}</p>
	<p class="text-xs text-muted-foreground">{deniedText}</p>
{/if}
