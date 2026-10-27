<script lang="ts">
	import { untrack } from 'svelte';
	import {
		listGrcImplementations,
		saveGrcAction,
		searchGrcFindings,
		searchGrcRisks
	} from '$lib/api/grc';
	import type { GrcAction } from '$lib/types/grc';
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
		ACTION_REFERENCE_MAX,
		ACTION_TITLE_MAX,
		actionAccess,
		actionFormFrom,
		actionPayload,
		actionPriorityLabel,
		actionStatusLabel,
		actionTargets,
		emptyActionForm,
		findingStatusLabel,
		labelOf,
		validateActionForm,
		type ActionForm,
		type ActionFormErrors
	} from './action-state';

	interface Props {
		open?: boolean;
		action?: GrcAction | null;
		/** Cibles proposées à la création (depuis un filtre). */
		preset?: Partial<ActionForm>;
		onsaved?: (action: GrcAction) => void;
	}

	let { open = $bindable(false), action = null, preset = {}, onsaved }: Props = $props();

	const access = actionAccess(getStoredPermissions());
	let form = $state<ActionForm>(emptyActionForm());
	let submitted = $state(false);
	const errors: ActionFormErrors = $derived(submitted ? validateActionForm(form) : {});
	let serverError = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		const source = action;
		const initial = preset;
		untrack(() => {
			form = source ? actionFormFrom(source) : emptyActionForm(initial);
			submitted = false;
			serverError = '';
		});
	});

	const implementationLabel = $derived(
		action ? (actionTargets({ ...action, riskId: null, findingId: null })[0] ?? '') : ''
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateActionForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcAction(actionPayload(form), action?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer l’action.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={action ? `Modifier l’action ${action.reference}` : 'Nouvelle action'}
	description="Action du plan de remédiation : au moins une cible (implémentation, risque ou constat)."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="action-reference"
			label="Référence"
			required
			error={errors.reference}
			helper="Mise en majuscules par le serveur."
		>
			<Input
				id="action-reference"
				bind:value={form.reference}
				maxlength={ACTION_REFERENCE_MAX}
				invalid={!!errors.reference}
				data-testid="action-form-reference"
			/>
		</FormField>
		<FormField id="action-title" label="Titre" required error={errors.title}>
			<Input
				id="action-title"
				bind:value={form.title}
				maxlength={ACTION_TITLE_MAX}
				invalid={!!errors.title}
				data-testid="action-form-title"
			/>
		</FormField>

		<fieldset class="grid gap-4 rounded-lg border border-border p-4 sm:col-span-2">
			<legend class="px-1 text-sm font-medium text-foreground">Cibles</legend>
			{#if errors.targets}<p class="text-sm text-danger" data-testid="action-form-targets-error">
					{errors.targets}
				</p>{/if}
			<FormField
				id="action-finding"
				label="Constat"
				helper="Un constat clôturé ou accepté ne peut plus recevoir de nouvelle action."
			>
				<TargetPicker
					id="action-finding"
					bind:value={form.findingId}
					allowed={access.readFindings}
					search={async (term) =>
						(await searchGrcFindings(term)).items.map((f) => ({
							id: f.id,
							label: `${f.reference} — ${f.title} (${labelOf(findingStatusLabel, f.status)})`
						}))}
					currentId={action?.findingId ?? null}
					currentLabel={action?.finding
						? `${action.finding.reference} — ${action.finding.title}`
						: ''}
					emptyLabel="Aucun constat"
					deniedText="Ce choix nécessite la lecture des constats ; la valeur actuelle est conservée."
					data-testid="action-form-finding"
				/>
			</FormField>
			<FormField id="action-risk" label="Risque">
				<TargetPicker
					id="action-risk"
					bind:value={form.riskId}
					allowed={access.readRisks}
					search={async (term) =>
						(await searchGrcRisks(term)).items.map((r) => ({
							id: r.id,
							label: `${r.reference} — ${r.title}`
						}))}
					currentId={action?.riskId ?? null}
					currentLabel={action?.risk ? `${action.risk.reference} — ${action.risk.title}` : ''}
					emptyLabel="Aucun risque"
					deniedText="Ce choix nécessite la lecture des risques ; la valeur actuelle est conservée."
					data-testid="action-form-risk"
				/>
			</FormField>
			<FormField
				id="action-implementation"
				label="Implémentation de contrôle"
				helper="Avec un risque, le contrôle doit être lié à ce risque."
			>
				<TargetPicker
					id="action-implementation"
					bind:value={form.controlImplementationId}
					allowed={access.readImplementations}
					searchable={false}
					search={async () =>
						(await listGrcImplementations({ limit: 100 })).items.map((i) => ({
							id: i.id,
							label: `${i.control?.code ?? `Contrôle n° ${i.controlId}`} sur ${i.asset?.code ?? `actif n° ${i.assetId}`}`
						}))}
					currentId={action?.controlImplementationId ?? null}
					currentLabel={implementationLabel}
					emptyLabel="Aucune implémentation"
					deniedText="Ce choix nécessite la lecture des implémentations ; la valeur actuelle est conservée."
					data-testid="action-form-implementation"
				/>
			</FormField>
		</fieldset>

		<FormField id="action-priority" label="Priorité" required error={errors.priority}>
			<Select
				id="action-priority"
				bind:value={form.priority}
				invalid={!!errors.priority}
				data-testid="action-form-priority"
			>
				<option value="">Choisir…</option>
				{#each Object.entries(actionPriorityLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField
			id="action-status"
			label="Statut"
			required
			error={errors.status}
			helper="« Terminée » enregistre la date de réalisation côté serveur."
		>
			<Select
				id="action-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="action-form-status"
			>
				{#each Object.entries(actionStatusLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
		</FormField>
		<FormField id="action-due" label="Échéance" error={errors.dueDate}>
			<Input id="action-due" type="date" bind:value={form.dueDate} data-testid="action-form-due" />
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
		<FormField id="action-assignee" label="Responsable" class="sm:col-span-2">
			<ProfilePicker
				id="action-assignee"
				bind:value={form.assigneeProfileId}
				currentId={action?.assigneeProfileId ?? null}
				currentLabel={action?.assigneeProfile ? ownerLabel(action.assigneeProfile) : ''}
				emptyLabel="Aucun responsable"
				data-testid="action-form-assignee"
			/>
		</FormField>
		<FormField id="action-description" label="Description" class="sm:col-span-2">
			<Textarea id="action-description" rows={3} bind:value={form.description} />
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="action-form-submit">
				{action ? 'Enregistrer' : 'Créer l’action'}
			</Button>
		</div>
	</form>
</Modal>
