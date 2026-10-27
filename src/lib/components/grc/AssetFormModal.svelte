<script lang="ts">
	import { untrack } from 'svelte';
	import { saveGrcAsset } from '$lib/api/grc';
	import type { GrcAsset } from '$lib/types/grc';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';
	import ProfilePicker from './ProfilePicker.svelte';
	import {
		ASSET_CODE_MAX,
		ASSET_NAME_MAX,
		assetCriticalityLabel,
		assetFormFrom,
		assetPayload,
		assetStatusLabel,
		assetTypeLabel,
		emptyAssetForm,
		ownerLabel,
		validateAssetForm,
		type AssetForm,
		type AssetFormErrors
	} from './asset-state';

	interface Props {
		open?: boolean;
		/** Actif à modifier ; absent en création. */
		asset?: GrcAsset | null;
		onsaved?: (asset: GrcAsset) => void;
	}

	let { open = $bindable(false), asset = null, onsaved }: Props = $props();

	let form = $state<AssetForm>(emptyAssetForm());
	// Validation affichée après une première tentative, puis recalculée à chaque saisie.
	let submitted = $state(false);
	const errors: AssetFormErrors = $derived(submitted ? validateAssetForm(form) : {});
	let serverError = $state('');
	let saving = $state(false);

	// Réinitialise le formulaire à chaque ouverture ; seuls `open` et `asset` sont suivis.
	$effect(() => {
		if (!open) return;
		const source = asset;
		untrack(() => {
			form = source ? assetFormFrom(source) : emptyAssetForm();
			submitted = false;
			serverError = '';
		});
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateAssetForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcAsset(assetPayload(form), asset?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer l’actif.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={asset ? `Modifier l’actif ${asset.code}` : 'Nouvel actif'}
	description="Les identifiants, auteurs et dates sont gérés par le serveur."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="asset-code"
			label="Code"
			required
			error={errors.code}
			helper="Mis en majuscules par le serveur."
		>
			<Input
				id="asset-code"
				bind:value={form.code}
				maxlength={ASSET_CODE_MAX}
				invalid={!!errors.code}
				data-testid="asset-form-code"
			/>
		</FormField>
		<FormField id="asset-name" label="Nom" required error={errors.name}>
			<Input
				id="asset-name"
				bind:value={form.name}
				maxlength={ASSET_NAME_MAX}
				invalid={!!errors.name}
				data-testid="asset-form-name"
			/>
		</FormField>
		<FormField id="asset-type" label="Type" required error={errors.type}>
			<Select
				id="asset-type"
				bind:value={form.type}
				invalid={!!errors.type}
				data-testid="asset-form-type"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(assetTypeLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="asset-criticality" label="Criticité" required error={errors.criticality}>
			<Select
				id="asset-criticality"
				bind:value={form.criticality}
				invalid={!!errors.criticality}
				data-testid="asset-form-criticality"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(assetCriticalityLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="asset-status" label="Statut" required error={errors.status}>
			<Select
				id="asset-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="asset-form-status"
			>
				{#each Object.entries(assetStatusLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
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
		<FormField id="asset-owner" label="Propriétaire" class="sm:col-span-2">
			<ProfilePicker
				id="asset-owner"
				bind:value={form.ownerProfileId}
				currentId={asset?.ownerProfileId ?? null}
				currentLabel={asset?.ownerProfile ? ownerLabel(asset.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="asset-form-owner"
			/>
		</FormField>
		<FormField id="asset-description" label="Description" class="sm:col-span-2">
			<Textarea
				id="asset-description"
				rows={3}
				bind:value={form.description}
				data-testid="asset-form-description"
			/>
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="asset-form-submit">
				{asset ? 'Enregistrer' : 'Créer l’actif'}
			</Button>
		</div>
	</form>
</Modal>
