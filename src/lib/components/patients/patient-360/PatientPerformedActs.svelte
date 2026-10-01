<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createPerformedAct,
		listPerformedActs,
		voidPerformedAct
	} from '$lib/api/performed-acts';
	import { listActCatalog } from '$lib/api/act-catalog';
	import type { ActCatalogEntry } from '$lib/types/act-catalog';
	import type { PerformedAct } from '$lib/types/performed-acts';
	import {
		ACTIVE_INVOICE_VOID_MESSAGE,
		BASE_PRICE_HINT,
		BASE_PRICE_LABEL,
		actCategoryLabel,
		canCreatePerformedActs,
		canVoidPerformedAct,
		formatCatalogPrice,
		normalizeVoidReason,
		originBadgeLabel,
		performedActStatusLabel,
		resolveVoidErrorMessage
	} from '$lib/components/performed-acts/state';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		patientId: number;
	}

	let { patientId }: Props = $props();

	let permissions = $state<string[]>([]);
	let loading = $state(true);
	let error = $state('');
	let acts = $state<PerformedAct[]>([]);
	let selected = $state<PerformedAct | null>(null);
	let createOpen = $state(false);
	let voidOpen = $state(false);
	let voidReason = $state('');
	let voidError = $state('');
	let voidBusy = $state(false);
	let createBusy = $state(false);
	let createError = $state('');
	let catalogOptions = $state<ActCatalogEntry[]>([]);
	let catalogEntryId = $state(0);
	let quantity = $state(1);
	let performedAt = $state('');

	const canCreate = $derived(canCreatePerformedActs(permissions));
	const selectedCatalog = $derived(catalogOptions.find((e) => e.id === catalogEntryId) ?? null);

	async function loadActs() {
		error = '';
		loading = true;
		try {
			const page = await listPerformedActs({ patientId, limit: 100 });
			acts = page.data ?? [];
			if (selected) {
				selected = acts.find((a) => a.id === selected?.id) ?? selected;
			}
		} catch (e) {
			if (isAccessDeniedError(e)) {
				error = 'Accès refusé à la lecture des actes réalisés.';
			} else {
				error = resolveUserErrorMessage(e, 'Impossible de charger les actes réalisés.');
			}
		} finally {
			loading = false;
		}
	}

	async function openCreate() {
		createError = '';
		quantity = 1;
		performedAt = '';
		catalogEntryId = 0;
		createOpen = true;
		try {
			const page = await listActCatalog({ active: true, limit: 100 });
			catalogOptions = (page.data ?? []).filter((e) => e.isActive);
		} catch (e) {
			createError = resolveUserErrorMessage(e, 'Impossible de charger le catalogue.');
		}
	}

	async function submitCreate() {
		createError = '';
		if (!catalogEntryId) {
			createError = 'Sélectionnez un acte catalogue.';
			return;
		}
		createBusy = true;
		try {
			const payload: {
				patientId: number;
				actCatalogEntryId: number;
				quantity: number;
				performedAt?: string;
			} = {
				patientId,
				actCatalogEntryId: catalogEntryId,
				quantity: Number(quantity) || 1
			};
			if (performedAt.trim()) {
				payload.performedAt = new Date(performedAt).toISOString();
			}
			const created = await createPerformedAct(payload);
			createOpen = false;
			await loadActs();
			selected = created;
		} catch (e) {
			createError = resolveUserErrorMessage(e, "Impossible de créer l'acte réalisé.");
		} finally {
			createBusy = false;
		}
	}

	function openVoid(act: PerformedAct) {
		selected = act;
		voidReason = '';
		voidError = '';
		voidOpen = true;
	}

	async function submitVoid() {
		if (!selected) return;
		const reason = normalizeVoidReason(voidReason);
		if (!reason) {
			voidError = "Le motif d'annulation est obligatoire.";
			return;
		}
		voidBusy = true;
		voidError = '';
		try {
			const updated = await voidPerformedAct(selected.id, { reason });
			voidOpen = false;
			await loadActs();
			selected = updated;
		} catch (e) {
			voidError = resolveVoidErrorMessage(e);
		} finally {
			voidBusy = false;
		}
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleString('fr-FR');
	}

	onMount(async () => {
		permissions = getStoredPermissions();
		await loadActs();
	});
</script>

<div class="space-y-4" data-testid="patient-performed-acts">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-black text-slate-900">Actes réalisés</h2>
			<p class="text-sm text-slate-500">Registre clinique des actes effectués pour ce patient.</p>
		</div>
		{#if canCreate}
			<Button data-testid="performed-act-create" onclick={() => void openCreate()}
				>Nouvel acte</Button
			>
		{/if}
	</header>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	{#if loading}
		<LoadingState label="Chargement des actes réalisés…" />
	{:else if acts.length === 0}
		<div
			class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500"
			data-testid="performed-acts-empty"
		>
			Aucun acte réalisé pour ce patient.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
			<table class="min-w-full text-left text-sm" data-testid="performed-acts-table">
				<thead class="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
					<tr>
						<th class="px-4 py-3">Acte</th>
						<th class="px-4 py-3">Catégorie</th>
						<th class="px-4 py-3">Qté</th>
						<th class="px-4 py-3">Réalisé le</th>
						<th class="px-4 py-3">Statut</th>
						<th class="px-4 py-3">Origine</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each acts as act (act.id)}
						{@const origin = originBadgeLabel(act.sourceType)}
						<tr class="border-t border-slate-100" data-testid={`performed-act-row-${act.id}`}>
							<td class="px-4 py-3">
								<div class="font-mono text-xs font-semibold text-violet-800">{act.actCode}</div>
								<div class="font-medium text-slate-900">{act.actLabel}</div>
							</td>
							<td class="px-4 py-3"
								>{actCategoryLabel[act.actCategory] ?? act.actCategory}</td
							>
							<td class="px-4 py-3">{act.quantity}</td>
							<td class="px-4 py-3">{formatDate(act.performedAt)}</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full px-2 py-0.5 text-xs font-bold {act.status === 'VOIDED'
										? 'bg-rose-50 text-rose-700'
										: 'bg-emerald-50 text-emerald-700'}"
								>
									{performedActStatusLabel[act.status]}
								</span>
							</td>
							<td class="px-4 py-3">
								{#if origin}
									<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
										>{origin}</span
									>
								{:else}
									<span class="text-slate-400">—</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<Button
									size="sm"
									variant="ghost"
									data-testid={`performed-act-open-${act.id}`}
									onclick={() => (selected = act)}>Détail</Button
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if selected}
	<div
		class="fixed inset-0 z-40 flex justify-end bg-slate-950/30"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) selected = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') selected = null;
		}}
	>
		<div
			class="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="performed-act-drawer-title"
			tabindex="-1"
			data-testid="performed-act-drawer"
		>
			<header class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
				<div>
					<p class="text-xs font-bold tracking-wide text-violet-700 uppercase">{selected.actCode}</p>
					<h3 id="performed-act-drawer-title" class="text-xl font-black text-slate-900">
						{selected.actLabel}
					</h3>
					<p class="mt-1 text-sm text-slate-500">
						{performedActStatusLabel[selected.status]} · {actCategoryLabel[selected.actCategory] ??
							selected.actCategory}
					</p>
				</div>
				<Button variant="ghost" size="sm" onclick={() => (selected = null)}>Fermer</Button>
			</header>
			<div class="space-y-4 px-5 py-4 text-sm">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-xs font-semibold text-slate-500">Quantité</p>
						<p class="font-medium text-slate-900">{selected.quantity}</p>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-500">Réalisé le</p>
						<p class="font-medium text-slate-900">{formatDate(selected.performedAt)}</p>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-500">Réalisé par</p>
						<p class="font-medium text-slate-900">#{selected.performedBy}</p>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-500">Origine</p>
						<p class="font-medium text-slate-900"
							>{originBadgeLabel(selected.sourceType) ?? 'Saisie manuelle'}</p
						>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-500">Facturable</p>
						<p class="font-medium text-slate-900">{selected.billable ? 'Oui' : 'Non'}</p>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-500">Éligible PEC</p>
						<p class="font-medium text-slate-900"
							>{selected.insuranceEligible ? 'Oui' : 'Non'}</p
						>
					</div>
				</div>

				<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4" data-testid="performed-act-base-price">
					<p class="text-xs font-bold tracking-wide text-amber-800 uppercase">{BASE_PRICE_LABEL}</p>
					<p class="mt-1 text-lg font-black text-amber-950">
						{formatCatalogPrice(selected.basePrice, selected.currency)}
					</p>
					<p class="mt-1 text-xs text-amber-800">{BASE_PRICE_HINT}</p>
				</div>

				{#if selected.status === 'VOIDED'}
					<div class="rounded-2xl border border-rose-100 bg-rose-50 p-4" data-testid="performed-act-void-meta">
						<p class="text-xs font-bold tracking-wide text-rose-700 uppercase">Annulation</p>
						<p class="mt-1 font-medium text-rose-950">{selected.voidReason || '—'}</p>
						<p class="mt-1 text-xs text-rose-700">
							{formatDate(selected.voidedAt)}{#if selected.voidedBy}
								· par #{selected.voidedBy}{/if}
						</p>
					</div>
				{/if}

				{#if canVoidPerformedAct(selected, permissions)}
					<Button
						variant="danger"
						data-testid="performed-act-void"
						onclick={() => openVoid(selected!)}>Annuler l'acte (VOID)</Button
					>
				{/if}
			</div>
		</div>
	</div>
{/if}

<Modal bind:open={createOpen} title="Nouvel acte réalisé" size="lg">
	{#if createError}
		<Alert tone="danger">{createError}</Alert>
	{/if}
	<div class="space-y-3">
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
			Acte catalogue
			<select
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={catalogEntryId}
				data-testid="performed-act-catalog-select"
			>
				<option value={0}>Sélectionner…</option>
				{#each catalogOptions as entry (entry.id)}
					<option value={entry.id}
						>{entry.code} — {entry.label} ({formatCatalogPrice(entry.basePrice, entry.currency)})</option
					>
				{/each}
			</select>
		</label>
		{#if selectedCatalog}
			<div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
				<p>
					{actCategoryLabel[selectedCatalog.category]} · Facturable:
					{selectedCatalog.billable ? 'oui' : 'non'} · Éligible PEC:
					{selectedCatalog.insuranceEligible ? 'oui' : 'non'}
				</p>
				<p class="mt-1">{BASE_PRICE_LABEL}: {formatCatalogPrice(selectedCatalog.basePrice)}</p>
			</div>
		{/if}
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
			Quantité
			<input
				type="number"
				min="0.01"
				step="0.01"
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={quantity}
				data-testid="performed-act-quantity"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
			Date de réalisation (optionnel)
			<input
				type="datetime-local"
				class="rounded-xl border border-slate-200 px-3 py-2"
				bind:value={performedAt}
				data-testid="performed-act-performed-at"
			/>
		</label>
	</div>
	{#snippet footer()}
		<Button variant="ghost" disabled={createBusy} onclick={() => (createOpen = false)}
			>Annuler</Button
		>
		<Button
			data-testid="performed-act-create-submit"
			loading={createBusy}
			onclick={() => void submitCreate()}>Créer</Button
		>
	{/snippet}
</Modal>

<Modal bind:open={voidOpen} title="Annuler l'acte réalisé" description="Action irréversible." size="md">
	{#if voidError}
		<div data-testid="performed-act-void-error">
			<Alert tone="danger">{voidError}</Alert>
		</div>
	{/if}
	{#if voidError === ACTIVE_INVOICE_VOID_MESSAGE}
		<p class="mb-3 text-sm text-slate-600" data-testid="performed-act-void-billing-hint">
			Ouvrez la facturation pour résoudre la facture active, puis réessayez.
		</p>
	{/if}
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Motif d'annulation
		<textarea
			class="min-h-[5rem] rounded-xl border border-slate-200 px-3 py-2"
			bind:value={voidReason}
			maxlength={240}
			required
			data-testid="performed-act-void-reason"
		></textarea>
	</label>
	{#snippet footer()}
		<Button variant="ghost" disabled={voidBusy} onclick={() => (voidOpen = false)}>Fermer</Button>
		<Button
			variant="danger"
			data-testid="performed-act-void-confirm"
			loading={voidBusy}
			onclick={() => void submitVoid()}>Confirmer l'annulation</Button
		>
	{/snippet}
</Modal>
