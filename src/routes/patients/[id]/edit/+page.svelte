<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Save } from 'lucide-svelte';

	import { getPatient, updatePatient } from '$lib/api/patients';
	import PatientForm from '$lib/components/patients/PatientForm.svelte';
	import {
		buildUpdatePatientPayload,
		emptyPatientFormValues,
		patientToFormValues,
		type PatientFormValues
	} from '$lib/components/patients/patient-form';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import {
		can,
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let permissions = $state<string[]>([]);
	let accessDenied = $state(false);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');
	let loadError = $state('');
	let patientId = $state(0);
	let values = $state<PatientFormValues>(emptyPatientFormValues());
	let ready = $state(false);

	onMount(async () => {
		permissions = getStoredPermissions();
		if (!can(permissions, 'patients:update')) {
			accessDenied = true;
			loading = false;
			return;
		}

		patientId = Number(page.params.id);
		if (!Number.isFinite(patientId) || patientId <= 0) {
			loadError = 'Identifiant patient invalide.';
			loading = false;
			return;
		}

		try {
			const patient = await getPatient(patientId);
			values = patientToFormValues(patient);
			ready = true;
		} catch (err) {
			if (isAccessDeniedError(err)) {
				accessDenied = true;
			} else {
				loadError = resolveUserErrorMessage(err, 'Impossible de charger le patient.');
			}
		} finally {
			loading = false;
		}
	});

	async function submit(event: Event) {
		event.preventDefault();
		if (submitting || accessDenied || !ready) return;

		const nom = values.nom.trim();
		if (nom.length < 2) {
			error = 'Le nom doit contenir au moins 2 caractères.';
			return;
		}

		submitting = true;
		error = '';

		try {
			const updated = await updatePatient(patientId, buildUpdatePatientPayload(values));
			await goto(resolve(`/patients/${updated.id}`));
		} catch (err) {
			if (isAccessDeniedError(err)) {
				accessDenied = true;
				return;
			}
			error = resolveUserErrorMessage(err, 'Impossible d’enregistrer le patient.');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier patient | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Modification patient non autorisée"
		description="Vous ne disposez pas de la permission patients:update."
	/>
{:else if loading}
	<LoadingState label="Chargement du patient…" />
{:else if loadError}
	<Alert tone="danger">{loadError}</Alert>
	<div class="mt-4">
		<Button variant="secondary" onclick={() => goto(resolve('/patients'))}>
			Retour aux patients
		</Button>
	</div>
{:else if ready}
	<div class="space-y-6">
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>

			<div class="relative">
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Patients</p>
				<h1 class="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Modifier le patient</h1>
				<p class="mt-3 max-w-2xl text-lg text-blue-50">
					Mettre à jour l’identité et les coordonnées de contact.
				</p>
			</div>
		</section>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<Card
			title="Identité et contact"
			subtitle="Les champs vides d’email effacent l’adresse enregistrée"
		>
			<form onsubmit={submit} class="space-y-6" data-testid="qa-patient-edit-form">
				<PatientForm bind:values disabled={submitting} idPrefix="edit" />

				<div class="flex flex-wrap gap-3">
					<Button type="submit" loading={submitting} data-testid="qa-patient-edit-submit">
						<Save size={16} />
						Enregistrer
					</Button>

					<Button
						type="button"
						variant="secondary"
						disabled={submitting}
						onclick={() => goto(resolve(`/patients/${patientId}`))}
					>
						Annuler
					</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
