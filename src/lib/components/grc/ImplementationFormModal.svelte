<script lang="ts">
	import { untrack } from 'svelte';
	import { listGrcAssets, saveGrcImplementation } from '$lib/api/grc';
	import type { GrcAsset, GrcControlImplementation } from '$lib/types/grc';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';
	import { getStoredPermissions, resolveUserErrorMessage } from '$lib/rbac/permissions';
	import ProfilePicker from './ProfilePicker.svelte';
	import { assetStatusLabel, canReadAssets, ownerLabel } from './asset-state';
	import {
		emptyImplementationForm,
		implementationFormFrom,
		implementationPayload,
		implementationStatusLabel,
		labelOf,
		validateImplementationForm,
		type ImplementationForm,
		type ImplementationFormErrors
	} from './control-state';

	interface Props {
		open?: boolean;
		/** Contrôle mis en œuvre (fixe dans ce formulaire). */
		controlId: number;
		controlLabel: string;
		implementation?: GrcControlImplementation | null;
		onsaved?: (implementation: GrcControlImplementation) => void;
	}

	let {
		open = $bindable(false),
		controlId,
		controlLabel,
		implementation = null,
		onsaved
	}: Props = $props();

	let form = $state<ImplementationForm>(emptyImplementationForm(0));
	let submitted = $state(false);
	const errors: ImplementationFormErrors = $derived(
		submitted ? validateImplementationForm(form) : {}
	);
	let serverError = $state('');
	let saving = $state(false);

	// Choisir l'actif liste le registre des actifs (grc.asset.read) ; seuls les actifs actifs sont assignables.
	const canPickAsset = canReadAssets(getStoredPermissions());
	let assets = $state<GrcAsset[]>([]);
	let assetsError = $state('');

	$effect(() => {
		if (!open) return;
		const source = implementation;
		const id = controlId;
		untrack(() => {
			form = source ? implementationFormFrom(source) : emptyImplementationForm(id);
			submitted = false;
			serverError = '';
			if (canPickAsset) void loadAssets();
		});
	});

	async function loadAssets() {
		assetsError = '';
		try {
			assets = (await listGrcAssets({ status: 'ACTIVE', limit: 100 })).items;
		} catch {
			assetsError = 'Registre des actifs indisponible.';
		}
	}

	const currentAsset = $derived(
		implementation?.asset && !assets.some((a) => a.id === implementation?.asset?.id)
			? implementation.asset
			: null
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateImplementationForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcImplementation(implementationPayload(form), implementation?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer l’implémentation.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={implementation ? 'Modifier l’implémentation' : 'Nouvelle implémentation'}
	description={`Mise en œuvre du contrôle ${controlLabel} sur un actif.`}
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="impl-asset"
			label="Actif"
			required
			error={errors.assetId}
			helper="Seul un actif actif peut être nouvellement associé."
		>
			{#if canPickAsset}
				<select
					id="impl-asset"
					class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
					value={form.assetId ?? ''}
					onchange={(e) => {
						const raw = (e.currentTarget as HTMLSelectElement).value;
						form.assetId = raw ? Number(raw) : null;
					}}
					aria-invalid={!!errors.assetId || undefined}
					data-testid="impl-form-asset"
				>
					<option value="">Choisir un actif…</option>
					{#if currentAsset}
						<option value={currentAsset.id}>
							{currentAsset.code} — {currentAsset.name} ({labelOf(
								assetStatusLabel,
								currentAsset.status
							)})
						</option>
					{/if}
					{#each assets as asset (asset.id)}
						<option value={asset.id}>{asset.code} — {asset.name}</option>
					{/each}
				</select>
				{#if assetsError}<p class="mt-1 text-xs text-danger">{assetsError}</p>{/if}
			{:else}
				<p class="text-sm text-foreground">
					{implementation?.asset
						? `${implementation.asset.code} — ${implementation.asset.name}`
						: 'Non renseigné'}
				</p>
				<p class="text-xs text-muted-foreground">
					Ce choix nécessite la lecture du registre des actifs ; la valeur actuelle est conservée.
				</p>
			{/if}
		</FormField>
		<FormField id="impl-status" label="Statut" required error={errors.status}>
			<Select
				id="impl-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="impl-form-status"
			>
				{#each Object.entries(implementationStatusLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="impl-implemented" label="Mise en œuvre le" error={errors.implementedDate}>
			<Input id="impl-implemented" type="date" bind:value={form.implementedDate} />
		</FormField>
		<FormField id="impl-reviewed" label="Dernière revue le" error={errors.lastReviewedDate}>
			<Input id="impl-reviewed" type="date" bind:value={form.lastReviewedDate} />
		</FormField>
		<FormField
			label="Service propriétaire"
			helper="Un service inactif ne peut pas être nouvellement affecté."
		>
			<ServiceSelect
				bind:value={form.owningServiceId}
				includeInactive
				placeholder="Aucun service"
			/>
		</FormField>
		<FormField id="impl-owner" label="Propriétaire">
			<ProfilePicker
				id="impl-owner"
				bind:value={form.ownerProfileId}
				currentId={implementation?.ownerProfileId ?? null}
				currentLabel={implementation?.ownerProfile ? ownerLabel(implementation.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="impl-form-owner"
			/>
		</FormField>
		<FormField id="impl-details" label="Détails de mise en œuvre" class="sm:col-span-2">
			<Textarea
				id="impl-details"
				rows={3}
				bind:value={form.implementationDetails}
				data-testid="impl-form-details"
			/>
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="impl-form-submit">
				{implementation ? 'Enregistrer' : 'Créer l’implémentation'}
			</Button>
		</div>
	</form>
</Modal>
