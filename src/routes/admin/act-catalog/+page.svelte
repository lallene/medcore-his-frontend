<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createActCatalogEntry,
		listActCatalog,
		updateActCatalogEntry
	} from '$lib/api/act-catalog';
	import {
		ACT_CATEGORIES,
		type ActCatalogEntry,
		type ActCategory
	} from '$lib/types/act-catalog';
	import {
		BASE_PRICE_HINT,
		BASE_PRICE_LABEL,
		actCategoryLabel,
		canManageActCatalog,
		canReadActCatalog,
		formatCatalogPrice
	} from '$lib/components/performed-acts/state';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';

	let permissions = $state<string[]>([]);
	let loading = $state(true);
	let accessDenied = $state(false);
	let error = $state('');
	let entries = $state<ActCatalogEntry[]>([]);
	let search = $state('');
	let categoryFilter = $state<ActCategory | ''>('');
	let modalOpen = $state(false);
	let editing = $state<ActCatalogEntry | null>(null);
	let saving = $state(false);
	let formError = $state('');
	let form = $state({
		code: '',
		label: '',
		description: '',
		category: 'OTHER' as ActCategory,
		basePrice: 0,
		currency: 'XOF',
		billable: true,
		insuranceEligible: true,
		isActive: true
	});

	const canManage = $derived(canManageActCatalog(permissions));

	async function load() {
		error = '';
		loading = true;
		try {
			const page = await listActCatalog({
				search: search.trim() || undefined,
				category: categoryFilter || undefined,
				limit: 100
			});
			entries = page.data ?? [];
		} catch (e) {
			if (isAccessDeniedError(e)) {
				accessDenied = true;
				return;
			}
			error = resolveUserErrorMessage(e, 'Impossible de charger le référentiel des actes.');
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editing = null;
		form = {
			code: '',
			label: '',
			description: '',
			category: 'OTHER',
			basePrice: 0,
			currency: 'XOF',
			billable: true,
			insuranceEligible: true,
			isActive: true
		};
		formError = '';
		modalOpen = true;
	}

	function openEdit(entry: ActCatalogEntry) {
		editing = entry;
		form = {
			code: entry.code,
			label: entry.label,
			description: entry.description ?? '',
			category: entry.category,
			basePrice: entry.basePrice,
			currency: entry.currency || 'XOF',
			billable: entry.billable,
			insuranceEligible: entry.insuranceEligible,
			isActive: entry.isActive
		};
		formError = '';
		modalOpen = true;
	}

	async function save() {
		if (!canManage) return;
		formError = '';
		saving = true;
		try {
			const basePrice = Number(form.basePrice);
			if (!Number.isFinite(basePrice) || basePrice < 0) {
				formError = 'Le prix catalogue de référence doit être un entier positif ou nul.';
				return;
			}
			if (editing) {
				await updateActCatalogEntry(editing.id, {
					label: form.label.trim(),
					description: form.description.trim(),
					category: form.category,
					basePrice: Math.round(basePrice),
					currency: form.currency || 'XOF',
					billable: form.billable,
					insuranceEligible: form.insuranceEligible,
					isActive: form.isActive
				});
			} else {
				await createActCatalogEntry({
					code: form.code.trim(),
					label: form.label.trim(),
					description: form.description.trim(),
					category: form.category,
					basePrice: Math.round(basePrice),
					currency: form.currency || 'XOF',
					billable: form.billable,
					insuranceEligible: form.insuranceEligible,
					isActive: form.isActive
				});
			}
			modalOpen = false;
			await load();
		} catch (e) {
			formError = resolveUserErrorMessage(e, "Impossible d'enregistrer l'acte catalogue.");
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		permissions = getStoredPermissions();
		if (!canReadActCatalog(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		await load();
	});
</script>

<svelte:head>
	<title>Référentiel des actes — MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Accès refusé"
		description="Permission act_catalog.read ou act_catalog.manage requise."
	/>
{:else}
	<div class="space-y-6 p-6" data-testid="act-catalog-page">
		<Breadcrumb
			items={[
				{ label: 'Administration', href: '/administration' },
				{ label: 'Référentiel des actes' }
			]}
		/>
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-2xl font-black text-slate-900">Référentiel des actes</h1>
				<p class="mt-1 text-sm text-slate-500">
					Catalogue clinique des actes — distinct des tarifs de facturation.
				</p>
			</div>
			{#if canManage}
				<Button data-testid="act-catalog-create" onclick={openCreate}>Nouvel acte</Button>
			{/if}
		</header>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<div class="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
			<label class="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
				Recherche
				<input
					class="rounded-xl border border-slate-200 px-3 py-2"
					bind:value={search}
					data-testid="act-catalog-search"
					placeholder="Code ou libellé"
				/>
			</label>
			<label class="flex min-w-[10rem] flex-col gap-1 text-sm font-medium text-slate-700">
				Catégorie
				<select class="rounded-xl border border-slate-200 px-3 py-2" bind:value={categoryFilter}>
					<option value="">Toutes</option>
					{#each ACT_CATEGORIES as category (category)}
						<option value={category}>{actCategoryLabel[category]}</option>
					{/each}
				</select>
			</label>
			<div class="flex items-end">
				<Button variant="secondary" onclick={() => void load()} data-testid="act-catalog-filter"
					>Filtrer</Button
				>
			</div>
		</div>

		{#if loading}
			<LoadingState label="Chargement du référentiel…" />
		{:else if entries.length === 0}
			<div
				class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500"
				data-testid="act-catalog-empty"
			>
				Aucun acte catalogue.
			</div>
		{:else}
			<div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
				<table class="min-w-full text-left text-sm" data-testid="act-catalog-table">
					<thead class="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
						<tr>
							<th class="px-4 py-3">Code</th>
							<th class="px-4 py-3">Libellé</th>
							<th class="px-4 py-3">Catégorie</th>
							<th class="px-4 py-3">{BASE_PRICE_LABEL}</th>
							<th class="px-4 py-3">Facturable</th>
							<th class="px-4 py-3">Éligible PEC</th>
							<th class="px-4 py-3">Actif</th>
							{#if canManage}<th class="px-4 py-3"></th>{/if}
						</tr>
					</thead>
					<tbody>
						{#each entries as entry (entry.id)}
							<tr class="border-t border-slate-100" data-testid={`act-catalog-row-${entry.id}`}>
								<td class="px-4 py-3 font-mono font-semibold text-violet-800">{entry.code}</td>
								<td class="px-4 py-3 font-medium text-slate-900">{entry.label}</td>
								<td class="px-4 py-3">{actCategoryLabel[entry.category] ?? entry.category}</td>
								<td class="px-4 py-3" data-testid="act-catalog-base-price">
									{formatCatalogPrice(entry.basePrice, entry.currency)}
								</td>
								<td class="px-4 py-3">{entry.billable ? 'Oui' : 'Non'}</td>
								<td class="px-4 py-3">{entry.insuranceEligible ? 'Oui' : 'Non'}</td>
								<td class="px-4 py-3">{entry.isActive ? 'Oui' : 'Non'}</td>
								{#if canManage}
									<td class="px-4 py-3 text-right">
										<Button
											size="sm"
											variant="ghost"
											data-testid={`act-catalog-edit-${entry.id}`}
											onclick={() => openEdit(entry)}>Modifier</Button
										>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-xs text-slate-500">{BASE_PRICE_HINT}</p>
		{/if}
	</div>
{/if}

<Modal
	bind:open={modalOpen}
	title={editing ? 'Modifier un acte catalogue' : 'Nouvel acte catalogue'}
	size="lg"
>
	{#if formError}
		<Alert tone="danger">{formError}</Alert>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		{#if !editing}
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				Code
				<input
					class="rounded-xl border border-slate-200 px-3 py-2"
					bind:value={form.code}
					required
					data-testid="act-catalog-form-code"
				/>
			</label>
		{:else}
			<div class="text-sm text-slate-600">
				Code <span class="font-mono font-semibold text-slate-900">{form.code}</span>
			</div>
		{/if}
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
			Libellé
			<input
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={form.label}
				required
				data-testid="act-catalog-form-label"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
			Description
			<textarea
				class="min-h-[4rem] rounded-xl border border-slate-200 px-3 py-2"
				bind:value={form.description}
			></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
			Catégorie
			<select
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={form.category}
				data-testid="act-catalog-form-category"
			>
				{#each ACT_CATEGORIES as category (category)}
					<option value={category}>{actCategoryLabel[category]}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
			{BASE_PRICE_LABEL}
			<input
				type="number"
				min="0"
				step="1"
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={form.basePrice}
				data-testid="act-catalog-form-base-price"
			/>
			<span class="text-xs font-normal text-slate-500">{BASE_PRICE_HINT}</span>
		</label>
		<label class="flex items-center gap-2 text-sm font-medium text-slate-700">
			<input type="checkbox" bind:checked={form.billable} /> Facturable
		</label>
		<label class="flex items-center gap-2 text-sm font-medium text-slate-700">
			<input type="checkbox" bind:checked={form.insuranceEligible} /> Éligible PEC
		</label>
		<label class="flex items-center gap-2 text-sm font-medium text-slate-700">
			<input type="checkbox" bind:checked={form.isActive} /> Actif
		</label>
	</div>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (modalOpen = false)} disabled={saving}>Annuler</Button>
		<Button data-testid="act-catalog-form-save" loading={saving} onclick={() => void save()}
			>Enregistrer</Button
		>
	{/snippet}
</Modal>
