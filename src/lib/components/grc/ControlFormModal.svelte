<script lang="ts">
	import { untrack } from 'svelte';
	import { saveGrcControl } from '$lib/api/grc';
	import type { GrcControl } from '$lib/types/grc';
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
		CONTROL_CATEGORY_MAX,
		CONTROL_CODE_MAX,
		CONTROL_NAME_MAX,
		controlFormFrom,
		controlPayload,
		controlStatusLabel,
		emptyControlForm,
		validateControlForm,
		type ControlForm,
		type ControlFormErrors
	} from './control-state';

	interface Props {
		open?: boolean;
		control?: GrcControl | null;
		onsaved?: (control: GrcControl) => void;
	}

	let { open = $bindable(false), control = null, onsaved }: Props = $props();

	let form = $state<ControlForm>(emptyControlForm());
	let submitted = $state(false);
	const errors: ControlFormErrors = $derived(submitted ? validateControlForm(form) : {});
	let serverError = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		const source = control;
		untrack(() => {
			form = source ? controlFormFrom(source) : emptyControlForm();
			submitted = false;
			serverError = '';
		});
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(validateControlForm(form)).length) return;
		saving = true;
		serverError = '';
		try {
			const saved = await saveGrcControl(controlPayload(form), control?.id);
			open = false;
			onsaved?.(saved);
		} catch (err) {
			serverError = resolveUserErrorMessage(err, 'Impossible d’enregistrer le contrôle.');
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	bind:open
	size="lg"
	title={control ? `Modifier le contrôle ${control.code}` : 'Nouveau contrôle'}
	description="Définition du contrôle dans le catalogue ; ses mises en œuvre sont gérées séparément."
>
	<form class="grid gap-4 sm:grid-cols-2" onsubmit={submit} novalidate>
		{#if serverError}
			<Alert tone="danger" class="sm:col-span-2">{serverError}</Alert>
		{/if}
		<FormField
			id="control-code"
			label="Code"
			required
			error={errors.code}
			helper="Mis en majuscules par le serveur."
		>
			<Input
				id="control-code"
				bind:value={form.code}
				maxlength={CONTROL_CODE_MAX}
				invalid={!!errors.code}
				data-testid="control-form-code"
			/>
		</FormField>
		<FormField id="control-name" label="Nom" required error={errors.name}>
			<Input
				id="control-name"
				bind:value={form.name}
				maxlength={CONTROL_NAME_MAX}
				invalid={!!errors.name}
				data-testid="control-form-name"
			/>
		</FormField>
		<FormField
			id="control-category"
			label="Catégorie"
			error={errors.category}
			helper="Texte libre, ex. Continuité."
		>
			<Input
				id="control-category"
				bind:value={form.category}
				maxlength={CONTROL_CATEGORY_MAX}
				data-testid="control-form-category"
			/>
		</FormField>
		<FormField id="control-status" label="Statut" required error={errors.status}>
			<Select
				id="control-status"
				bind:value={form.status}
				invalid={!!errors.status}
				data-testid="control-form-status"
			>
				{#each Object.entries(controlStatusLabel) as [value, label] (value)}
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
		<FormField id="control-owner" label="Propriétaire">
			<ProfilePicker
				id="control-owner"
				bind:value={form.ownerProfileId}
				currentId={control?.ownerProfileId ?? null}
				currentLabel={control?.ownerProfile ? ownerLabel(control.ownerProfile) : ''}
				emptyLabel="Aucun propriétaire"
				data-testid="control-form-owner"
			/>
		</FormField>
		<FormField id="control-description" label="Description" class="sm:col-span-2">
			<Textarea id="control-description" rows={3} bind:value={form.description} />
		</FormField>
		<div class="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
			<Button variant="secondary" onclick={() => (open = false)} disabled={saving}>Annuler</Button>
			<Button type="submit" loading={saving} data-testid="control-form-submit">
				{control ? 'Enregistrer' : 'Créer le contrôle'}
			</Button>
		</div>
	</form>
</Modal>
