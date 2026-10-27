<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	interface Option {
		id: number;
		label: string;
	}

	interface Props {
		id: string;
		selected?: number[];
		allowed: boolean;
		search: (term: string) => Promise<Option[]>;
		current?: Option[];
		deniedText: string;
		'data-testid'?: string;
	}

	let {
		id,
		selected = $bindable([]),
		allowed,
		search,
		current = [],
		deniedText,
		'data-testid': testId
	}: Props = $props();

	let term = $state('');
	let options = $state<Option[]>([]);
	let error = $state('');

	const visible = $derived.by(() => {
		const seen: Record<number, true> = {};
		const out: Option[] = [];
		for (const option of [...current, ...options]) {
			if (seen[option.id]) continue;
			seen[option.id] = true;
			out.push(option);
		}
		return out;
	});

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

	function toggle(optionId: number, checked: boolean) {
		selected = checked
			? [...new Set([...selected, optionId])]
			: selected.filter((value) => value !== optionId);
	}
</script>

{#if allowed}
	<div class="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
		<Input id={`${id}-search`} bind:value={term} placeholder="Rechercher…" />
		<Button variant="secondary" onclick={load}>Rechercher</Button>
	</div>
	{#if error}
		<p class="text-sm text-danger">{error}</p>
	{/if}
	<ul class="max-h-40 space-y-1 overflow-auto" data-testid={testId}>
		{#each visible as option (option.id)}
			<li>
				<label class="flex min-w-0 items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={selected.includes(option.id)}
						onchange={(event) => toggle(option.id, event.currentTarget.checked)}
					/>
					<span class="truncate">{option.label}</span>
				</label>
			</li>
		{:else}
			<li class="text-sm text-muted-foreground">Aucun résultat</li>
		{/each}
	</ul>
{:else}
	<p class="text-sm text-muted-foreground">{deniedText}</p>
	{#if current.length}
		<ul class="mt-1 space-y-1 text-sm">
			{#each current as option (option.id)}
				<li>{option.label}</li>
			{/each}
		</ul>
	{/if}
{/if}
