<script lang="ts">
	import { onMount } from 'svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';

	/**
	 * Ajout d'un lien vers une relation existante (exigence, risque) : recherche,
	 * choix puis lien. Le lien lui-même passe par la route existante de l'appelant.
	 */
	interface Option {
		id: number;
		label: string;
	}

	interface Props {
		id: string;
		title: string;
		placeholder: string;
		search: (term: string) => Promise<Option[]>;
		/** Identifiants déjà liés, exclus des choix. */
		linked: number[];
		onlink: (id: number) => Promise<void>;
	}

	let { id, title, placeholder, search, linked, onlink }: Props = $props();

	let term = $state('');
	let options = $state<Option[]>([]);
	let selected = $state('');
	let error = $state('');
	let busy = $state(false);

	const available = $derived(options.filter((o) => !linked.includes(o.id)));

	async function find() {
		error = '';
		try {
			options = await search(term.trim());
			selected = '';
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Recherche indisponible.');
		}
	}

	async function link() {
		if (!selected) return;
		busy = true;
		error = '';
		try {
			await onlink(Number(selected));
			selected = '';
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible de créer ce lien.');
		} finally {
			busy = false;
		}
	}

	onMount(find);
</script>

<div class="space-y-2 border-t border-border pt-4" data-testid={`${id}-linker`}>
	<p class="text-sm font-medium text-foreground">{title}</p>
	<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
		<Input id={`${id}-search`} bind:value={term} {placeholder} />
		<Button variant="secondary" onclick={find}>Rechercher</Button>
	</div>
	<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
		<select
			aria-label={title}
			class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
			bind:value={selected}
			data-testid={`${id}-select`}
		>
			<option value="">Choisir…</option>
			{#each available as option (option.id)}
				<option value={String(option.id)}>{option.label}</option>
			{/each}
		</select>
		<Button onclick={link} disabled={!selected || busy} data-testid={`${id}-link`}>Lier</Button>
	</div>
	{#if error}<Alert tone="danger">{error}</Alert>{/if}
</div>
