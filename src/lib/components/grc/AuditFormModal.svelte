<script lang="ts">
	import { untrack } from 'svelte';
	import { saveGrcAudit } from '$lib/api/grc';
	import type { GrcAudit } from '$lib/types/grc';
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
	import { ownerLabel } from './asset-state';
	import {
		AUDIT_REFERENCE_MAX,
		AUDIT_TITLE_MAX,
		auditFormFrom,
		auditPayload,
		auditStatusLabel,
		auditStatusOptions,
		auditTypeLabel,
		emptyAuditForm,
		labelOf,
		validateAuditForm,
		type AuditForm,
		type AuditFormErrors
	} from './audit-state';

	interface Props {
		open?: boolean;
		audit?: GrcAudit | null;
		onsaved?: (audit: GrcAudit) => void;
	}

	let { open = $bindable(false), audit = null, onsaved }: Props = $props();

	let form = $state<AuditForm>(emptyAuditForm());
	let submitted = $state(false);
	const errors: AuditFormErrors = $derived(submitted ? validateAuditForm(form, audit?.status) : {});
	let serverError = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		const source = audit;
		untrack(() => {
			form = source ? auditFormFrom(source) : emptyAuditForm();
			submitted = false;
			serverError = '';
		});
	});

	const statusOptions = $derived(auditStatusOptions(audit?.status));

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateAuditForm(form, audit?.status)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcAudit(auditPayload(form), audit?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer l’audit.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={audit ? `Modifier l’audit ${audit.reference}` : 'Nouvel audit'}
	description="La clôture d’un audit passe par l’action « Terminer l’audit »."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="audit-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="audit-reference"
				bind:value={form.reference}
				maxlength={AUDIT_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="audit-form-reference"
			/>
		</FormField>
		<FormField id="audit-title" label="Titre" required error={errors.title}>
			<Input
				id="audit-title"
				bind:value={form.title}
				maxlength={AUDIT_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="audit-form-title"
			/>
		</FormField>
		<FormField id="audit-type" label="Type" required error={errors.type}>
			<Select
				id="audit-type"
				bind:value={form.type}
				invalid={!!errors.type}
				data-testid="audit-form-type"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(auditTypeLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField
			id="audit-status"
			label="Statut"
			required
			error={errors.status}
			helper="« En cours » enregistre la date de début réelle côté serveur."
		>
			<Select
				id="audit-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="audit-form-status"
			>
				{#each statusOptions as value (value)}
					<option {value}>{labelOf(auditStatusLabel, value)}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="audit-planned-start" label="Début prévu">
			<Input
				id="audit-planned-start"
				type="date"
				bind:value={form.plannedStartDate}
				data-testid="audit-form-planned-start"
			/>
		</FormField>
		<FormField id="audit-planned-end" label="Fin prévue" error={errors.plannedEndDate}>
			<Input
				id="audit-planned-end"
				type="date"
				bind:value={form.plannedEndDate}
				data-testid="audit-form-planned-end"
			/>
		</FormField>
		<FormField id="audit-lead" label="Responsable de l’audit">
			<ProfilePicker
				id="audit-lead"
				bind:value={form.leadAuditorProfileId}
				currentId={audit?.leadAuditorProfileId ?? null}
				currentLabel={audit?.leadAuditorProfile ? ownerLabel(audit.leadAuditorProfile) : ''}
				emptyLabel="Aucun responsable"
				data-testid="audit-form-lead"
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
		<FormField id="audit-scope" label="Périmètre" class="sm:col-span-2">
			<Textarea id="audit-scope" rows={2} bind:value={form.scope} data-testid="audit-form-scope" />
		</FormField>
		<FormField id="audit-description" label="Description" class="sm:col-span-2">
			<Textarea id="audit-description" rows={3} bind:value={form.description} />
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="audit-form-submit"
				>{audit ? 'Enregistrer' : 'Créer l’audit'}</Button
			>
		</div>
	</form>
</Modal>
