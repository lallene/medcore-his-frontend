<script lang="ts">
	import { untrack } from 'svelte';
	import { listGrcAssets, saveGrcRisk } from '$lib/api/grc';
	import type { GrcAsset, GrcRisk } from '$lib/types/grc';
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
	import { canReadAssets, labelOf, assetStatusLabel, ownerLabel } from './asset-state';
	import {
		RISK_REFERENCE_MAX,
		RISK_SCALE,
		RISK_TITLE_MAX,
		emptyRiskForm,
		productPreview,
		riskFormFrom,
		riskPayload,
		riskStatusLabel,
		riskTreatmentLabel,
		validateRiskForm,
		type RiskForm,
		type RiskFormErrors
	} from './risk-state';

	interface Props {
		open?: boolean;
		/** Risque à modifier ; absent en création. */
		risk?: GrcRisk | null;
		onsaved?: (risk: GrcRisk) => void;
	}

	let { open = $bindable(false), risk = null, onsaved }: Props = $props();

	let form = $state<RiskForm>(emptyRiskForm());
	// Validation affichée après une première tentative, puis recalculée à chaque saisie.
	let submitted = $state(false);
	const errors: RiskFormErrors = $derived(submitted ? validateRiskForm(form) : {});
	let serverError = $state('');
	let saving = $state(false);

	// Le choix de l'actif liste le registre des actifs : il requiert grc.asset.read.
	const canPickAsset = canReadAssets(getStoredPermissions());
	let assets = $state<GrcAsset[]>([]);
	let assetsError = $state('');

	$effect(() => {
		if (!open) return;
		const source = risk;
		untrack(() => {
			form = source ? riskFormFrom(source) : emptyRiskForm();
			submitted = false;
			serverError = '';
			if (canPickAsset) void loadAssets();
		});
	});

	async function loadAssets() {
		assetsError = '';
		try {
			// Seul un actif ACTIF peut être nouvellement associé (règle serveur).
			assets = (await listGrcAssets({ status: 'ACTIVE', limit: 100 })).items;
		} catch {
			assetsError = 'Registre des actifs indisponible.';
		}
	}

	const scale = RISK_SCALE.map((v) => ({ value: String(v), label: String(v) }));
	const scaleValue = (v: number | null) => (v === null ? '' : String(v));
	const toScale = (e: Event) => {
		const raw = (e.currentTarget as HTMLSelectElement).value;
		return raw ? Number(raw) : null;
	};
	const selectAsset = (e: Event) => {
		const raw = (e.currentTarget as HTMLSelectElement).value;
		form.assetId = raw ? Number(raw) : null;
	};
	const currentAsset = $derived(
		risk?.asset && !assets.some((a) => a.id === risk?.asset?.id) ? risk.asset : null
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateRiskForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcRisk(riskPayload(form), risk?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer le risque.');
		} finally {
			saving = false;
		}
	}
</script>

{#snippet scaleSelect(
	id: string,
	label: string,
	field: 'likelihood' | 'impact' | 'residualLikelihood' | 'residualImpact'
)}
	<FormField {id} {label} required error={errors[field]}>
		<select
			{id}
			class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
			value={scaleValue(form[field])}
			onchange={(e) => (form[field] = toScale(e))}
			aria-invalid={!!errors[field] || undefined}
			data-testid={`risk-form-${field}`}
		>
			<option value="">Choisir…</option>
			{#each scale as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</FormField>
{/snippet}

<Modal
	bind:open
	size="lg"
	title={risk ? `Modifier le risque ${risk.reference}` : 'Nouveau risque'}
	description="Les scores et niveaux sont calculés par le serveur à partir de la probabilité et de l’impact."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="risk-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="risk-reference"
				bind:value={form.reference}
				maxlength={RISK_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="risk-form-reference"
			/>
		</FormField>
		<FormField id="risk-title" label="Titre" required error={errors.title}>
			<Input
				id="risk-title"
				bind:value={form.title}
				maxlength={RISK_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="risk-form-title"
			/>
		</FormField>
		<FormField id="risk-description" label="Description" class="sm:col-span-2">
			<Textarea id="risk-description" rows={3} bind:value={form.description} />
		</FormField>
		<FormField id="risk-threat" label="Menace">
			<Textarea id="risk-threat" rows={2} bind:value={form.threat} />
		</FormField>
		<FormField id="risk-vulnerability" label="Vulnérabilité">
			<Textarea id="risk-vulnerability" rows={2} bind:value={form.vulnerability} />
		</FormField>

		<fieldset class="grid gap-4 rounded-lg border border-border p-4 sm:col-span-2 sm:grid-cols-3">
			<legend class="px-1 text-sm font-medium text-foreground">Risque inhérent</legend>
			{@render scaleSelect('risk-likelihood', 'Probabilité', 'likelihood')}
			{@render scaleSelect('risk-impact', 'Impact', 'impact')}
			<p class="self-end text-sm text-muted-foreground" data-testid="risk-form-inherent-preview">
				Probabilité × impact : {productPreview(form.likelihood, form.impact)}
			</p>
		</fieldset>
		<fieldset class="grid gap-4 rounded-lg border border-border p-4 sm:col-span-2 sm:grid-cols-3">
			<legend class="px-1 text-sm font-medium text-foreground">Risque résiduel</legend>
			{@render scaleSelect('risk-residual-likelihood', 'Probabilité', 'residualLikelihood')}
			{@render scaleSelect('risk-residual-impact', 'Impact', 'residualImpact')}
			<p class="self-end text-sm text-muted-foreground" data-testid="risk-form-residual-preview">
				Probabilité × impact : {productPreview(form.residualLikelihood, form.residualImpact)}
			</p>
		</fieldset>

		<FormField id="risk-treatment" label="Traitement" required error={errors.treatment}>
			<Select
				id="risk-treatment"
				bind:value={form.treatment}
				invalid={!!errors.treatment}
				data-testid="risk-form-treatment"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(riskTreatmentLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="risk-due" label="Échéance du traitement" error={errors.treatmentDueDate}>
			<Input
				id="risk-due"
				type="date"
				bind:value={form.treatmentDueDate}
				data-testid="risk-form-due"
			/>
		</FormField>
		<FormField id="risk-status" label="Statut" required error={errors.status}>
			<Select
				id="risk-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="risk-form-status"
			>
				{#each Object.entries(riskStatusLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField
			id="risk-asset"
			label="Actif concerné"
			helper="Seul un actif actif peut être nouvellement associé."
		>
			{#if canPickAsset}
				<select
					id="risk-asset"
					class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
					value={form.assetId ?? ''}
					onchange={selectAsset}
					data-testid="risk-form-asset"
				>
					<option value="">Aucun actif</option>
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
					{risk?.asset ? `${risk.asset.code} — ${risk.asset.name}` : 'Non renseigné'}
				</p>
				<p class="text-xs text-muted-foreground">
					Ce choix nécessite la lecture du registre des actifs ; la valeur actuelle est conservée.
				</p>
			{/if}
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
		<FormField id="risk-owner" label="Propriétaire">
			<ProfilePicker
				id="risk-owner"
				bind:value={form.ownerProfileId}
				currentId={risk?.ownerProfileId ?? null}
				currentLabel={risk?.ownerProfile ? ownerLabel(risk.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="risk-form-owner"
			/>
		</FormField>
		<FormField id="risk-approver" label="Approbateur">
			<ProfilePicker
				id="risk-approver"
				bind:value={form.approverProfileId}
				currentId={risk?.approverProfileId ?? null}
				currentLabel={risk?.approverProfile ? ownerLabel(risk.approverProfile) : ''}
				emptyLabel="Aucun approbateur"
				data-testid="risk-form-approver"
			/>
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="risk-form-submit">
				{risk ? 'Enregistrer' : 'Créer le risque'}
			</Button>
		</div>
	</form>
</Modal>
