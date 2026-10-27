<script lang="ts">
	import { untrack } from 'svelte';
	import {
		listGrcControls,
		listGrcFrameworks,
		createGrcPolicy,
		updateGrcPolicy
	} from '$lib/api/grc';
	import type { GrcGovernancePolicy } from '$lib/types/grc';
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
	import PolicyRelationPicker from './PolicyRelationPicker.svelte';
	import { ownerLabel } from './asset-state';
	import {
		POLICY_REFERENCE_MAX,
		POLICY_TITLE_MAX,
		POLICY_VERSION_MAX,
		emptyPolicyForm,
		labelOf,
		policyAccess,
		policyFormFrom,
		policyPayload,
		policyStatusLabel,
		policyStatusOptions,
		validatePolicyForm,
		type PolicyForm,
		type PolicyFormErrors
	} from './policy-state';

	interface Props {
		open?: boolean;
		policy?: GrcGovernancePolicy | null;
		onsaved?: (policy: GrcGovernancePolicy) => void;
	}

	let { open = $bindable(false), policy = null, onsaved }: Props = $props();

	let form = $state<PolicyForm>(emptyPolicyForm());
	let submitted = $state(false);
	const access = policyAccess(getStoredPermissions());
	const errors: PolicyFormErrors = $derived(
		submitted ? validatePolicyForm(form, !!policy, policy?.status) : {}
	);
	let serverError = $state('');
	let saving = $state(false);
	const statusOptions = $derived(policyStatusOptions(policy?.status));

	$effect(() => {
		if (!open) return;
		const source = policy;
		untrack(() => {
			form = source ? policyFormFrom(source) : emptyPolicyForm();
			submitted = false;
			serverError = '';
		});
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitted = true;
		if (Object.keys(validatePolicyForm(form, !!policy, policy?.status)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = policy
				? await updateGrcPolicy(policy.id, policyPayload(form, true, access))
				: await createGrcPolicy(policyPayload(form, false, access));
			onsaved?.(saved);
			open = false;
		} catch (cause) {
			serverError = resolveUserErrorMessage(cause, 'Enregistrement impossible.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title={policy ? 'Modifier la politique' : 'Nouvelle politique'} size="lg">
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} data-testid="policy-form">
		{#if serverError}
			<div class="sm:col-span-2"><Alert tone="danger">{serverError}</Alert></div>
		{/if}
		<FormField id="policy-reference" label="Référence" required error={errors.reference}>
			<Input
				id="policy-reference"
				bind:value={form.reference}
				maxlength={POLICY_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="policy-form-reference"
			/>
		</FormField>
		<FormField id="policy-version" label="Version" required error={errors.version}>
			<Input
				id="policy-version"
				bind:value={form.version}
				maxlength={POLICY_VERSION_MAX}
				invalid={!!errors.version}
				data-testid="policy-form-version"
			/>
		</FormField>
		<FormField id="policy-title" label="Titre" required error={errors.title} class="sm:col-span-2">
			<Input
				id="policy-title"
				bind:value={form.title}
				maxlength={POLICY_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="policy-form-title"
			/>
		</FormField>
		{#if policy && statusOptions.length}
			<FormField
				id="policy-status"
				label="Statut"
				error={errors.status}
				helper="Approbation, publication et retrait ne sont pas proposés ici."
				class="sm:col-span-2"
			>
				<Select id="policy-status" bind:value={form.status} invalid={!!errors.status}>
					{#if policy.status === 'APPROVED'}
						<option value="">Conserver le statut actuel</option>
					{/if}
					{#each statusOptions as value (value)}
						<option {value}>{labelOf(policyStatusLabel, value)}</option>
					{/each}
				</Select>
			</FormField>
		{/if}
		<FormField id="policy-from" label="Début d’effet" error={errors.effectiveFrom}>
			<Input
				id="policy-from"
				type="date"
				bind:value={form.effectiveFrom}
				invalid={!!errors.effectiveFrom}
			/>
		</FormField>
		<FormField id="policy-to" label="Fin d’effet" error={errors.effectiveTo}>
			<Input
				id="policy-to"
				type="date"
				bind:value={form.effectiveTo}
				invalid={!!errors.effectiveTo}
			/>
		</FormField>
		<FormField id="policy-description" label="Description" class="sm:col-span-2">
			<Textarea id="policy-description" bind:value={form.description} rows={4} />
		</FormField>
		<FormField label="Référentiels" class="sm:col-span-2">
			<PolicyRelationPicker
				id="policy-frameworks"
				bind:selected={form.frameworkIds}
				allowed={access.readFrameworks}
				current={(policy?.frameworks ?? []).map((link) => ({
					id: link.id,
					label: `${link.code} — ${link.name}`
				}))}
				search={async (term) =>
					(await listGrcFrameworks({ search: term, limit: 20 })).items.map((item) => ({
						id: item.id,
						label: `${item.code} — ${item.name}`
					}))}
				deniedText="La lecture des référentiels est nécessaire pour changer ce lien."
				data-testid="policy-form-frameworks"
			/>
		</FormField>
		<FormField label="Contrôles" class="sm:col-span-2">
			<PolicyRelationPicker
				id="policy-controls"
				bind:selected={form.controlIds}
				allowed={access.readControls}
				current={(policy?.controls ?? []).map((link) => ({
					id: link.id,
					label: `${link.code} — ${link.name}`
				}))}
				search={async (term) =>
					(await listGrcControls({ search: term, limit: 20 })).items.map((item) => ({
						id: item.id,
						label: `${item.code} — ${item.name}`
					}))}
				deniedText="La lecture des contrôles est nécessaire pour changer ce lien."
				data-testid="policy-form-controls"
			/>
		</FormField>
		<FormField label="Service propriétaire">
			<ServiceSelect
				bind:value={form.owningServiceId}
				includeInactive
				placeholder="Aucun service"
			/>
		</FormField>
		<FormField id="policy-owner" label="Propriétaire">
			<ProfilePicker
				id="policy-owner"
				bind:value={form.ownerProfileId}
				currentId={policy?.ownerProfileId ?? null}
				currentLabel={policy?.ownerProfile ? ownerLabel(policy.ownerProfile) : ''}
			/>
		</FormField>
		<FormField id="policy-approver" label="Approbateur" class="sm:col-span-2">
			<ProfilePicker
				id="policy-approver"
				bind:value={form.approverProfileId}
				currentId={policy?.approverProfileId ?? null}
				currentLabel={policy?.approverProfile ? ownerLabel(policy.approverProfile) : ''}
			/>
		</FormField>
		<div class="flex justify-end gap-2 sm:col-span-2">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="policy-form-submit">
				{policy ? 'Enregistrer' : 'Créer la politique'}
			</Button>
		</div>
	</form>
</Modal>
