<script lang="ts">
	import { onMount } from 'svelte';
	import { listStaff } from '$lib/api/staff';
	import type { StaffProfile } from '$lib/types/staff';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { canAny, getStoredPermissions } from '$lib/rbac/permissions';

	/**
	 * Choix d'un profil du personnel pour un champ GRC (propriétaire, approbateur).
	 * La liste requiert staff.read : sans elle, la valeur actuelle est affichée et conservée.
	 */
	interface Props {
		id: string;
		value?: number | null;
		/** Profil enregistré et son libellé (préchargé par l'API GRC), proposé tant qu'il est choisi. */
		currentId?: number | null;
		currentLabel?: string;
		emptyLabel?: string;
		'data-testid'?: string;
	}

	let {
		id,
		value = $bindable(null),
		currentId = null,
		currentLabel = '',
		emptyLabel = 'Aucun',
		'data-testid': testId
	}: Props = $props();

	const canPick = canAny(getStoredPermissions(), ['staff.read']);
	let search = $state('');
	let options = $state<StaffProfile[]>([]);
	let error = $state('');

	async function load() {
		error = '';
		try {
			const page = await listStaff({
				search: search.trim() || undefined,
				active: 'true',
				limit: 20
			});
			options = page.items;
		} catch {
			error = 'Liste du personnel indisponible.';
		}
	}

	onMount(() => {
		if (canPick) void load();
	});

	function select(e: Event) {
		const raw = (e.currentTarget as HTMLSelectElement).value;
		value = raw ? Number(raw) : null;
	}
</script>

{#if canPick}
	<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
		<Input
			id={`${id}-search`}
			bind:value={search}
			placeholder="Rechercher un membre du personnel"
			data-testid={testId ? `${testId}-search` : undefined}
		/>
		<Button variant="secondary" onclick={load}>Rechercher</Button>
	</div>
	<select
		{id}
		class="mt-2 min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
		value={value ?? ''}
		onchange={select}
		data-testid={testId}
	>
		<option value="">{emptyLabel}</option>
		{#if currentId !== null && currentLabel && !options.some((p) => p.id === currentId)}
			<option value={currentId}>{currentLabel}</option>
		{/if}
		{#each options as profile (profile.id)}
			<option value={profile.id}>{profile.name} · {profile.employeeCode}</option>
		{/each}
	</select>
	{#if error}<p class="mt-1 text-xs text-danger">{error}</p>{/if}
{:else}
	<p class="text-sm text-foreground" data-testid={testId ? `${testId}-readonly` : undefined}>
		{currentLabel || 'Non renseigné'}
	</p>
	<p class="text-xs text-muted-foreground">
		Ce choix nécessite l’accès à la liste du personnel ; la valeur actuelle est conservée.
	</p>
{/if}
