<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { UserPlus } from 'lucide-svelte';

	import { createPatient } from '$lib/api/patients';
	import PatientForm from '$lib/components/patients/PatientForm.svelte';
	import {
		buildCreatePatientPayload,
		emptyPatientFormValues,
		type PatientFormValues
	} from '$lib/components/patients/patient-form';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import {
		can,
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let permissions = $state<string[]>([]);
	let accessDenied = $state(false);
	let values = $state<PatientFormValues>(emptyPatientFormValues());
	let submitting = $state(false);
	let error = $state('');

	onMount(() => {
		permissions = getStoredPermissions();
		accessDenied = !can(permissions, 'patients:create');
	});

	async function submit(event: Event) {
		event.preventDefault();
		if (submitting || accessDenied) return;

		const nom = values.nom.trim();
		if (nom.length < 2) {
			error = 'Le nom doit contenir au moins 2 caractères.';
			return;
		}

		submitting = true;
		error = '';

		try {
			const created = await createPatient(buildCreatePatientPayload(values));
			await goto(resolve(`/patients/${created.id}`));
		} catch (err) {
			if (isAccessDeniedError(err)) {
				accessDenied = true;
				return;
			}
			error = resolveUserErrorMessage(err, 'Impossible de créer le patient.');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouveau patient | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Création patient non autorisée"
		description="Vous ne disposez pas de la permission patients:create."
	/>
{:else}
	<div class="space-y-6">
		<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<div class="relative">
				<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">Patients</p>
				<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
					Nouveau patient
				</h1>
				<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
					Enregistrer l’identité et les coordonnées de contact du patient.
				</p>
			</div>
		</section>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<Card title="Identité et contact" subtitle="Champs nécessaires à la création du dossier">
			<form onsubmit={submit} class="space-y-6" data-testid="qa-patient-create-form">
				<PatientForm bind:values disabled={submitting} idPrefix="create" />

				<div class="flex flex-wrap gap-3">
					<Button type="submit" loading={submitting} data-testid="qa-patient-create-submit">
						<UserPlus size={16} />
						Créer le patient
					</Button>

					<Button
						type="button"
						variant="secondary"
						disabled={submitting}
						onclick={() => goto(resolve('/patients'))}
					>
						Annuler
					</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
