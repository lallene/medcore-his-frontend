<script lang="ts">
	import { untrack } from 'svelte';
	import {
		createGrcIncident,
		listGrcAssets,
		searchGrcRisks,
		updateGrcIncident
	} from '$lib/api/grc';
	import type {
		GrcSecurityIncident,
		GrcSecurityIncidentPayload,
		GrcSecurityIncidentUpdatePayload
	} from '$lib/types/grc';
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
	import TargetPicker from './TargetPicker.svelte';
	import { ownerLabel } from './asset-state';
	import {
		INCIDENT_REFERENCE_MAX,
		INCIDENT_TITLE_MAX,
		incidentAccess,
		incidentFormFrom,
		incidentPayload,
		incidentSeverityLabel,
		incidentStatusLabel,
		incidentStatusOptions,
		emptyIncidentForm,
		labelOf,
		validateIncidentForm,
		type IncidentForm,
		type IncidentFormErrors
	} from './incident-state';

	interface Props {
		open?: boolean;
		incident?: GrcSecurityIncident | null;
		onsaved?: (incident: GrcSecurityIncident) => void;
	}

	let { open = $bindable(false), incident = null, onsaved }: Props = $props();

	let form = $state<IncidentForm>(emptyIncidentForm());
	let submitted = $state(false);
	const access = incidentAccess(getStoredPermissions());
	const errors: IncidentFormErrors = $derived(
		submitted ? validateIncidentForm(form, !!incident, new Date(), incident?.status) : {}
	);
	let serverError = $state('');
	let saving = $state(false);
	const statusOptions = $derived(incidentStatusOptions(incident?.status));

	$effect(() => {
		if (!open) return;
		const source = incident;
		untrack(() => {
			form = source ? incidentFormFrom(source) : emptyIncidentForm();
			submitted = false;
			serverError = '';
		});
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateIncidentForm(form, !!incident, new Date(), incident?.status)).length)
			return;
		saving = true;
		serverError = '';
		try {
			const saved = incident
				? await updateGrcIncident(
						incident.id,
						incidentPayload(form, true) as GrcSecurityIncidentUpdatePayload
					)
				: await createGrcIncident(incidentPayload(form, false) as GrcSecurityIncidentPayload);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer l’incident.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={incident ? `Modifier l’incident ${incident.reference}` : 'Nouvel incident'}
	description="La clôture passe par l’action « Clôturer l’incident », pas par ce formulaire."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="incident-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="incident-reference"
				bind:value={form.reference}
				maxlength={INCIDENT_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="incident-form-reference"
			/>
		</FormField>
		<FormField id="incident-title" label="Titre" required error={errors.title}>
			<Input
				id="incident-title"
				bind:value={form.title}
				maxlength={INCIDENT_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="incident-form-title"
			/>
		</FormField>
		<FormField
			id="incident-severity"
			label="Sévérité"
			required
			error={errors.severity}
			class="sm:col-span-2"
		>
			<Select
				id="incident-severity"
				bind:value={form.severity}
				invalid={!!errors.severity}
				data-testid="incident-form-severity"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(incidentSeverityLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		{#if incident}
			<FormField
				id="incident-status"
				label="Statut"
				required
				error={errors.status}
				helper="La clôture n’est pas proposée ici."
				class="sm:col-span-2"
			>
				<Select
					id="incident-status"
					bind:value={form.status}
					invalid={!!errors.status}
					data-testid="incident-form-status"
				>
					{#each statusOptions as value (value)}
						<option {value}>{labelOf(incidentStatusLabel, value)}</option>
					{/each}
				</Select>
			</FormField>
		{/if}
		<FormField id="incident-detected" label="Détecté le" required error={errors.detectedAt}>
			<Input
				id="incident-detected"
				type="datetime-local"
				bind:value={form.detectedAt}
				invalid={!!errors.detectedAt}
				data-testid="incident-form-detected"
			/>
		</FormField>
		<FormField id="incident-occurred" label="Survenu le" error={errors.occurredAt}>
			<Input
				id="incident-occurred"
				type="datetime-local"
				bind:value={form.occurredAt}
				invalid={!!errors.occurredAt}
				data-testid="incident-form-occurred"
			/>
		</FormField>
		<FormField id="incident-description" label="Description" class="sm:col-span-2">
			<Textarea
				id="incident-description"
				bind:value={form.description}
				rows={4}
				data-testid="incident-form-description"
			/>
		</FormField>
		<FormField id="incident-risk" label="Risque">
			<TargetPicker
				id="incident-risk"
				bind:value={form.riskId}
				allowed={access.readRisks}
				search={async (term) =>
					(await searchGrcRisks(term)).items.map((risk) => ({
						id: risk.id,
						label: `${risk.reference} — ${risk.title}`
					}))}
				currentId={incident?.riskId ?? null}
				currentLabel={incident?.risk ? `${incident.risk.reference} — ${incident.risk.title}` : ''}
				emptyLabel="Aucun risque"
				deniedText="La lecture des risques est nécessaire pour changer ce lien."
				data-testid="incident-form-risk"
			/>
		</FormField>
		<FormField id="incident-asset" label="Actif">
			<TargetPicker
				id="incident-asset"
				bind:value={form.assetId}
				allowed={access.readAssets}
				search={async (term) =>
					(await listGrcAssets({ search: term, limit: 20 })).items.map((asset) => ({
						id: asset.id,
						label: `${asset.code} — ${asset.name}`
					}))}
				currentId={incident?.assetId ?? null}
				currentLabel={incident?.asset ? `${incident.asset.code} — ${incident.asset.name}` : ''}
				emptyLabel="Aucun actif"
				deniedText="La lecture des actifs est nécessaire pour changer ce lien."
				data-testid="incident-form-asset"
			/>
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
		<FormField id="incident-owner" label="Propriétaire">
			<ProfilePicker
				id="incident-owner"
				bind:value={form.ownerProfileId}
				currentId={incident?.ownerProfileId ?? null}
				currentLabel={incident?.ownerProfile ? ownerLabel(incident.ownerProfile) : ''}
			/>
		</FormField>
		<div class="flex justify-end gap-2 sm:col-span-2">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="incident-form-submit">
				{incident ? 'Enregistrer' : 'Créer l’incident'}
			</Button>
		</div>
	</form>
</Modal>
