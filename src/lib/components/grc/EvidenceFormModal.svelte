<script lang="ts">
	import { untrack } from 'svelte';
	import { listGrcImplementations, saveGrcEvidence } from '$lib/api/grc';
	import type { GrcControlImplementation, GrcEvidence } from '$lib/types/grc';
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
	import { ownerLabel } from './asset-state';
	import {
		EVIDENCE_EXTERNAL_REFERENCE_MAX,
		EVIDENCE_REFERENCE_MAX,
		EVIDENCE_TITLE_MAX,
		emptyEvidenceForm,
		evidenceAccess,
		evidenceFormFrom,
		evidencePayload,
		evidenceStatusLabel,
		evidenceTypeLabel,
		implementationLabel,
		validateEvidenceForm,
		type EvidenceForm,
		type EvidenceFormErrors
	} from './evidence-state';

	interface Props {
		open?: boolean;
		evidence?: GrcEvidence | null;
		/** Implémentation proposée à la création (depuis un filtre). */
		presetImplementationId?: number | null;
		onsaved?: (evidence: GrcEvidence) => void;
	}

	let {
		open = $bindable(false),
		evidence = null,
		presetImplementationId = null,
		onsaved
	}: Props = $props();

	let form = $state<EvidenceForm>(emptyEvidenceForm());
	let submitted = $state(false);
	const errors: EvidenceFormErrors = $derived(submitted ? validateEvidenceForm(form) : {});
	let serverError = $state('');
	let saving = $state(false);

	// Choisir l'implémentation prouvée liste les implémentations (grc.control.implementation.read).
	const canPickImplementation = evidenceAccess(getStoredPermissions()).readImplementations;
	let implementations = $state<GrcControlImplementation[]>([]);
	let implementationsError = $state('');

	$effect(() => {
		if (!open) return;
		const source = evidence;
		const preset = presetImplementationId;
		untrack(() => {
			form = source ? evidenceFormFrom(source) : emptyEvidenceForm(preset);
			submitted = false;
			serverError = '';
			if (canPickImplementation) void loadImplementations();
		});
	});

	async function loadImplementations() {
		implementationsError = '';
		try {
			implementations = (await listGrcImplementations({ limit: 100 })).items;
		} catch {
			implementationsError = 'Implémentations indisponibles.';
		}
	}

	const optionLabel = (i: GrcControlImplementation) =>
		`${i.control?.code ?? `Contrôle n° ${i.controlId}`} sur ${i.asset?.code ?? `actif n° ${i.assetId}`}`;
	const currentMissing = $derived(
		evidence && !implementations.some((i) => i.id === evidence?.controlImplementationId)
			? evidence
			: null
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateEvidenceForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcEvidence(evidencePayload(form), evidence?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer la preuve.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={evidence ? `Modifier la preuve ${evidence.reference}` : 'Nouvelle preuve'}
	description="Métadonnées et référence documentaire : aucun fichier n’est déposé dans MedCore."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="evidence-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="evidence-reference"
				bind:value={form.reference}
				maxlength={EVIDENCE_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="evidence-form-reference"
			/>
		</FormField>
		<FormField id="evidence-title" label="Titre" required error={errors.title}>
			<Input
				id="evidence-title"
				bind:value={form.title}
				maxlength={EVIDENCE_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="evidence-form-title"
			/>
		</FormField>
		<FormField
			id="evidence-implementation"
			label="Implémentation prouvée"
			required
			error={errors.controlImplementationId}
			class="sm:col-span-2"
		>
			{#if canPickImplementation}
				<select
					id="evidence-implementation"
					class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
					value={form.controlImplementationId ?? ''}
					onchange={(e) => {
						const raw = (e.currentTarget as HTMLSelectElement).value;
						form.controlImplementationId = raw ? Number(raw) : null;
					}}
					aria-invalid={!!errors.controlImplementationId || undefined}
					data-testid="evidence-form-implementation"
				>
					<option value="">Choisir une implémentation…</option>
					{#if currentMissing}
						<option value={currentMissing.controlImplementationId}
							>{implementationLabel(currentMissing)}</option
						>
					{/if}
					{#each implementations as implementation (implementation.id)}
						<option value={implementation.id}>{optionLabel(implementation)}</option>
					{/each}
				</select>
				{#if implementationsError}<p class="mt-1 text-xs text-danger">
						{implementationsError}
					</p>{/if}
			{:else}
				<p class="text-sm text-foreground">
					{evidence ? implementationLabel(evidence) : 'Non renseignée'}
				</p>
				<p class="text-xs text-muted-foreground">
					Ce choix nécessite la lecture des implémentations de contrôles ; la valeur actuelle est
					conservée.
				</p>
			{/if}
		</FormField>
		<FormField id="evidence-type" label="Type" required error={errors.type}>
			<Select
				id="evidence-type"
				bind:value={form.type}
				invalid={!!errors.type}
				data-testid="evidence-form-type"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(evidenceTypeLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField
			id="evidence-status"
			label="Statut"
			required
			error={errors.status}
			helper="Une preuve révoquée ne peut plus être modifiée."
		>
			<Select
				id="evidence-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="evidence-form-status"
			>
				{#each Object.entries(evidenceStatusLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField
			id="evidence-external"
			label="Référence documentaire"
			error={errors.externalReference}
			helper="Identifiant GED ou URL sans identifiants, paramètres ni fragment."
			class="sm:col-span-2"
		>
			<Input
				id="evidence-external"
				bind:value={form.externalReference}
				maxlength={EVIDENCE_EXTERNAL_REFERENCE_MAX}
				data-testid="evidence-form-external"
			/>
		</FormField>
		<FormField id="evidence-collected" label="Collectée le">
			<Input id="evidence-collected" type="date" bind:value={form.collectedDate} />
		</FormField>
		<FormField id="evidence-valid-from" label="Valide à partir du">
			<Input id="evidence-valid-from" type="date" bind:value={form.validFromDate} />
		</FormField>
		<FormField id="evidence-expires" label="Expire le" error={errors.expiresDate}>
			<Input
				id="evidence-expires"
				type="date"
				bind:value={form.expiresDate}
				data-testid="evidence-form-expires"
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
		<FormField id="evidence-owner" label="Propriétaire" class="sm:col-span-2">
			<ProfilePicker
				id="evidence-owner"
				bind:value={form.ownerProfileId}
				currentId={evidence?.ownerProfileId ?? null}
				currentLabel={evidence?.ownerProfile ? ownerLabel(evidence.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="evidence-form-owner"
			/>
		</FormField>
		<FormField id="evidence-description" label="Description" class="sm:col-span-2">
			<Textarea id="evidence-description" rows={3} bind:value={form.description} />
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="evidence-form-submit">
				{evidence ? 'Enregistrer' : 'Créer la preuve'}
			</Button>
		</div>
	</form>
</Modal>
