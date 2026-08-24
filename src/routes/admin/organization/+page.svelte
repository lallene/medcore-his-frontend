<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getOrganizationCatalog,
		saveDepartment,
		saveOrganizationService
	} from '$lib/api/organization';
	import type {
		DepartmentPayload,
		OrganizationCatalog,
		OrganizationDepartment,
		OrganizationService,
		ServicePayload,
		ServiceType
	} from '$lib/types/organization';
	let catalog = $state<OrganizationCatalog>({ departments: [] });
	let error = $state('');
	let showDepartment = $state(false);
	let showService = $state(false);
	let editingDepartment = $state<OrganizationDepartment | null>(null);
	let editingService = $state<OrganizationService | null>(null);
	let department = $state<DepartmentPayload>({
		code: '',
		name: '',
		description: '',
		active: true,
		sortOrder: 0
	});
	let service = $state<ServicePayload>({
		departmentId: 0,
		code: '',
		name: '',
		shortName: '',
		serviceType: 'CLINICAL',
		active: true,
		clinical: true,
		supportsHospitalization: false,
		supportsConsultation: true,
		supportsBeds: false,
		sortOrder: 0
	});
	const types: ServiceType[] = [
		'CLINICAL',
		'SURGICAL',
		'MATERNITY',
		'DIAGNOSTIC',
		'PHARMACY',
		'ADMINISTRATIVE',
		'FINANCIAL',
		'EMERGENCY',
		'OTHER'
	];
	async function load() {
		try {
			catalog = await getOrganizationCatalog(false);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		}
	}
	function editDepartment(x?: OrganizationDepartment) {
		editingDepartment = x ?? null;
		department = x
			? {
					code: x.code,
					name: x.name,
					description: x.description,
					active: x.active,
					sortOrder: x.sortOrder
				}
			: { code: '', name: '', description: '', active: true, sortOrder: 0 };
		showDepartment = true;
	}
	function editService(x?: OrganizationService, d?: OrganizationDepartment) {
		editingService = x ?? null;
		service = x
			? {
					departmentId: x.departmentId,
					code: x.code,
					name: x.name,
					shortName: x.shortName,
					serviceType: x.serviceType,
					active: x.active,
					clinical: x.clinical,
					supportsHospitalization: x.supportsHospitalization,
					supportsConsultation: x.supportsConsultation,
					supportsBeds: x.supportsBeds,
					sortOrder: x.sortOrder
				}
			: {
					departmentId: d?.id ?? 0,
					code: '',
					name: '',
					shortName: '',
					serviceType: 'CLINICAL',
					active: true,
					clinical: true,
					supportsHospitalization: false,
					supportsConsultation: true,
					supportsBeds: false,
					sortOrder: 0
				};
		showService = true;
	}
	async function submitDepartment() {
		await saveDepartment(department, editingDepartment?.id);
		showDepartment = false;
		await load();
	}
	async function submitService() {
		await saveOrganizationService(service, editingService?.id);
		showService = false;
		await load();
	}
	onMount(load);
</script>

<svelte:head><title>Organisation clinique — MedCore HIS</title></svelte:head>
<div class="space-y-6 p-6">
	<header class="flex justify-between">
		<div>
			<p class="text-xs font-black uppercase text-indigo-700">Administration</p>
			<h1 class="text-3xl font-black">Départements et services</h1>
			<p class="text-slate-500">Référentiel organisationnel transversal</p>
		</div>
		<button
			onclick={() => editDepartment()}
			class="rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white">Nouveau département</button
		>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	{#if showDepartment}<form
			onsubmit={(e) => {
				e.preventDefault();
				void submitDepartment();
			}}
			class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-5"
		>
			<input bind:value={department.code} placeholder="Code" class="rounded-xl border p-3" /><input
				bind:value={department.name}
				placeholder="Nom"
				class="rounded-xl border p-3"
			/><input
				bind:value={department.description}
				placeholder="Description"
				class="rounded-xl border p-3"
			/><label><input type="checkbox" bind:checked={department.active} /> Actif</label><button
				class="rounded-xl bg-indigo-700 text-white">Enregistrer</button
			>
		</form>{/if}
	{#if showService}<form
			onsubmit={(e) => {
				e.preventDefault();
				void submitService();
			}}
			class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4"
		>
			<select bind:value={service.departmentId} class="rounded-xl border p-3"
				><option value={0}>Département</option>{#each catalog.departments as d (d.id)}<option
						value={d.id}>{d.name}</option
					>{/each}</select
			><input bind:value={service.code} placeholder="Code" class="rounded-xl border p-3" /><input
				bind:value={service.name}
				placeholder="Nom"
				class="rounded-xl border p-3"
			/><select bind:value={service.serviceType} class="rounded-xl border p-3"
				>{#each types as t (t)}<option value={t}>{t}</option>{/each}</select
			><label><input type="checkbox" bind:checked={service.active} /> Actif</label><label
				><input type="checkbox" bind:checked={service.clinical} /> Clinique</label
			><label
				><input type="checkbox" bind:checked={service.supportsConsultation} /> Consultations</label
			><label
				><input type="checkbox" bind:checked={service.supportsHospitalization} /> Hospitalisations</label
			><label><input type="checkbox" bind:checked={service.supportsBeds} /> Chambres/lits</label
			><button class="rounded-xl bg-indigo-700 p-3 text-white">Enregistrer</button>
		</form>{/if}
	<div class="space-y-4">
		{#each catalog.departments as d (d.id)}<section class="rounded-2xl border bg-white p-5">
				<div class="flex justify-between">
					<div>
						<h2 class="text-xl font-black">
							{d.name} <small class="text-slate-400">{d.code}</small>
						</h2>
						<span class="text-xs">{d.active ? 'Actif' : 'Inactif'}</span>
					</div>
					<div class="space-x-2">
						<button onclick={() => editDepartment(d)} class="rounded-lg border px-3 py-2"
							>Modifier</button
						><button
							onclick={() => editService(undefined, d)}
							disabled={!d.active}
							class="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">Ajouter un service</button
						>
					</div>
				</div>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					{#each d.services as s (s.id)}<button
							onclick={() => editService(s)}
							class="flex justify-between rounded-xl border p-4 text-left"
							><span
								><b>{s.name}</b><small class="ml-2 text-slate-400">{s.code}</small><br /><small
									>{s.serviceType}</small
								></span
							><span>{s.active ? 'Actif' : 'Inactif'}</span></button
						>{/each}
				</div>
			</section>{/each}
	</div>
</div>
