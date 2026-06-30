<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import { createPatient, getPatients } from '$lib/api/patients';
	import type { Patient } from '$lib/types/patient';

	import DataTable from '$lib/components/table/DataTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	import type { TableAction, TableColumn, TableRow } from '$lib/types/table';

	interface PatientRow extends TableRow {
		id: number;
		numeroDossier: string;
		nom: string;
		prenoms: string;
		telephone: string;
	}

	let patients = $state<PatientRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showForm = $state(false);

	let nom = $state('');
	let prenoms = $state('');
	let sexe = $state('M');
	let telephone = $state('');
	let quartier = $state('');

	const columns: TableColumn[] = [
		{ key: 'numeroDossier', label: 'Dossier' },
		{ key: 'nom', label: 'Nom' },
		{ key: 'prenoms', label: 'Prénoms' },
		{ key: 'telephone', label: 'Téléphone' }
	];

	const actions: TableAction[] = [
		{
			label: 'Voir',
			onClick: (row) => {
				const patient = row as PatientRow;
				void goto(resolve(`/patients/${patient.id}`));
			}
		}
	];

	function toPatientRow(patient: Patient): PatientRow {
		return {
			id: patient.id,
			numeroDossier: patient.numeroDossier,
			nom: patient.nom,
			prenoms: patient.prenoms,
			telephone: patient.telephone
		};
	}

	async function loadPatients() {
		loading = true;
		error = '';

		try {
			const data = await getPatients();
			patients = data.map(toPatientRow);
		} catch {
			error = 'Impossible de charger les patients.';
		} finally {
			loading = false;
		}
	}

	async function submitPatient() {
		await createPatient({
			nom,
			prenoms,
			sexe,
			telephone,
			quartier
		});

		nom = '';
		prenoms = '';
		sexe = 'M';
		telephone = '';
		quartier = '';
		showForm = false;

		await loadPatients();
	}

	onMount(() => {
		void loadPatients();
	});
</script>

<svelte:head>
	<title>Patients | MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900">Patients</h1>
			<p class="text-slate-500">Gestion des dossiers patients</p>
		</div>

		<Button onclick={() => (showForm = !showForm)}>
			{showForm ? 'Fermer' : 'Nouveau patient'}
		</Button>
	</div>

	{#if showForm}
		<Card title="Nouveau patient" subtitle="Créer un dossier patient">
			<form
				class="grid gap-4 md:grid-cols-2"
				onsubmit={async (e) => {
					e.preventDefault();
					await submitPatient();
				}}
			>
				<Input bind:value={nom} placeholder="Nom" />
				<Input bind:value={prenoms} placeholder="Prénoms" />

				<Select
					bind:value={sexe}
					options={[
						{ label: 'Masculin', value: 'M' },
						{ label: 'Féminin', value: 'F' }
					]}
				/>

				<Input bind:value={telephone} placeholder="Téléphone" />
				<Input bind:value={quartier} placeholder="Quartier" />

				<div class="md:col-span-2">
					<Button type="submit">Enregistrer</Button>
				</div>
			</form>
		</Card>
	{/if}

	{#if error}
		<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
	{/if}

	<DataTable
		title="Liste des patients"
		description="Patients enregistrés dans MedCore"
		{columns}
		rows={patients}
		{actions}
		{loading}
		emptyMessage="Aucun patient trouvé"
	/>
</div>
