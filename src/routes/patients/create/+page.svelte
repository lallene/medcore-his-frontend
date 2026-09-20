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
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>

			<div class="relative">
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Patients</p>
				<h1 class="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Nouveau patient</h1>
				<p class="mt-3 max-w-2xl text-lg text-blue-50">
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
