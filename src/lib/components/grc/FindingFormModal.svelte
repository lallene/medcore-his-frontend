<script lang="ts">
	import { untrack } from 'svelte';
	import { listGrcImplementations, saveGrcFinding, searchGrcRisks } from '$lib/api/grc';
	import type { GrcFinding } from '$lib/types/grc';
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
		AUDIT_REFERENCE_MAX,
		AUDIT_TITLE_MAX,
		auditAccess,
		emptyFindingForm,
		findingCategoryLabel,
		findingFormFrom,
		findingPayload,
		findingSeverityLabel,
		findingStatusLabel,
		findingStatusOptions,
		labelOf,
		validateFindingForm,
		type FindingForm,
		type FindingFormErrors
	} from './audit-state';

	interface Props {
		open?: boolean;
		/** Audit source d'un nouveau constat (fixe). */
		auditId: number;
		auditLabel: string;
		finding?: GrcFinding | null;
		onsaved?: (finding: GrcFinding) => void;
	}

	let { open = $bindable(false), auditId, auditLabel, finding = null, onsaved }: Props = $props();

	const access = auditAccess(getStoredPermissions());
	let form = $state<FindingForm>(emptyFindingForm(0));
	let submitted = $state(false);
	const errors: FindingFormErrors = $derived(
		submitted ? validateFindingForm(form, finding?.status) : {}
	);
	let serverError = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		const source = finding;
		const id = auditId;
		untrack(() => {
			form = source ? findingFormFrom(source) : emptyFindingForm(id);
			submitted = false;
			serverError = '';
		});
	});

	const statusOptions = $derived(findingStatusOptions(finding?.status));
	const implementationLabel = $derived(
		finding?.controlImplementation
			? `${finding.controlImplementation.control?.code ?? 'Contrôle'} sur ${finding.controlImplementation.asset?.code ?? 'actif'}`
			: ''
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateFindingForm(form, finding?.status)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcFinding(findingPayload(form), finding?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer le constat.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={finding ? `Modifier le constat ${finding.reference}` : 'Nouveau constat'}
	description={`Source : ${auditLabel} (non modifiable). Clôture et acceptation ont leurs actions dédiées.`}
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="finding-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="finding-reference"
				bind:value={form.reference}
				maxlength={AUDIT_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="finding-form-reference"
			/>
		</FormField>
		<FormField id="finding-title" label="Titre" required error={errors.title}>
			<Input
				id="finding-title"
				bind:value={form.title}
				maxlength={AUDIT_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="finding-form-title"
			/>
		</FormField>
		<FormField id="finding-category" label="Catégorie" required error={errors.category}>
			<Select
				id="finding-category"
				bind:value={form.category}
				invalid={!!errors.category}
				data-testid="finding-form-category"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(findingCategoryLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="finding-severity" label="Sévérité" required error={errors.severity}>
			<Select
				id="finding-severity"
				bind:value={form.severity}
				invalid={!!errors.severity}
				data-testid="finding-form-severity"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(findingSeverityLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="finding-status" label="Statut" required error={errors.status}>
			<Select
				id="finding-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="finding-form-status"
			>
				{#each statusOptions as value (value)}
					<option {value}>{labelOf(findingStatusLabel, value)}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="finding-due" label="Échéance">
			<Input
				id="finding-due"
				type="date"
				bind:value={form.dueDate}
				data-testid="finding-form-due"
			/>
		</FormField>
		<FormField
			id="finding-risk"
			label="Risque"
			helper="Avec une implémentation, son contrôle doit être lié à ce risque."
		>
			<TargetPicker
				id="finding-risk"
				bind:value={form.riskId}
				allowed={access.readRisks}
				search={async (term) =>
					(await searchGrcRisks(term)).items.map((r) => ({
						id: r.id,
						label: `${r.reference} — ${r.title}`
					}))}
				currentId={finding?.riskId ?? null}
				currentLabel={finding?.risk ? `${finding.risk.reference} — ${finding.risk.title}` : ''}
				emptyLabel="Aucun risque"
				deniedText="Ce choix nécessite la lecture des risques ; la valeur actuelle est conservée."
				data-testid="finding-form-risk"
			/>
		</FormField>
		<FormField id="finding-implementation" label="Implémentation de contrôle">
			<TargetPicker
				id="finding-implementation"
				bind:value={form.controlImplementationId}
				allowed={access.readImplementations}
				searchable={false}
				search={async () =>
					(await listGrcImplementations({ limit: 100 })).items.map((i) => ({
						id: i.id,
						label: `${i.control?.code ?? `Contrôle n° ${i.controlId}`} sur ${i.asset?.code ?? `actif n° ${i.assetId}`}`
					}))}
				currentId={finding?.controlImplementationId ?? null}
				currentLabel={implementationLabel}
				emptyLabel="Aucune implémentation"
				deniedText="Ce choix nécessite la lecture des implémentations ; la valeur actuelle est conservée."
				data-testid="finding-form-implementation"
			/>
		</FormField>
		<FormField id="finding-owner" label="Propriétaire">
			<ProfilePicker
				id="finding-owner"
				bind:value={form.ownerProfileId}
				currentId={finding?.ownerProfileId ?? null}
				currentLabel={finding?.ownerProfile ? ownerLabel(finding.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="finding-form-owner"
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
		<FormField id="finding-description" label="Description" class="sm:col-span-2">
			<Textarea id="finding-description" rows={3} bind:value={form.description} />
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="finding-form-submit"
				>{finding ? 'Enregistrer' : 'Créer le constat'}</Button
			>
		</div>
	</form>
</Modal>
