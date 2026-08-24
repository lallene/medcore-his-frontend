<script lang="ts">
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import {
		createStaff,
		getStaffAudit,
		getStaffCatalog,
		listStaff,
		listStaffUsers,
		updateStaff
	} from '$lib/api/staff';
	import { anyPermission, can, permissionAreas, toggleCode } from '$lib/components/staff/state';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';
	import { listOrganizationServices } from '$lib/api/organization';
	import type { OrganizationService } from '$lib/types/organization';
	import type {
		StaffAuditEvent,
		StaffCatalog,
		StaffPayload,
		StaffProfile,
		StaffUserOption
	} from '$lib/types/staff';
	let rows = $state<StaffProfile[]>([]),
		catalog = $state<StaffCatalog | null>(null),
		users = $state<StaffUserOption[]>([]),
		permissions = $state<string[]>([]),
		audit = $state<StaffAuditEvent[]>([]);
	let organizationServices = $state<OrganizationService[]>([]);
	let search = $state(''),
		functionFilter = $state(''),
		specialtyFilter = $state(''),
		activeFilter = $state(''),
		serviceFilter = $state<number | null>(null),
		editing = $state<StaffProfile | null>(null),
		showForm = $state(false),
		showMatrix = $state(false),
		error = $state('');
	let form = $state<StaffPayload>({
		userId: 0,
		employeeCode: '',
		jobTitle: '',
		primaryDepartment: '',
		primaryServiceId: null,
		secondaryServiceIds: [],
		professionalNumber: '',
		active: true,
		functions: [],
		specialties: [],
		capabilities: []
	});
	async function load() {
		try {
			const [p, c, services] = await Promise.all([
				listStaff({
					search,
					function: functionFilter,
					specialty: specialtyFilter,
					active: activeFilter,
					serviceId: serviceFilter || undefined,
					limit: 100
				}),
				getStaffCatalog(),
				listOrganizationServices()
			]);
			rows = p.items;
			catalog = c;
			organizationServices = services;
			if (can(permissions, 'staff.manage')) users = await listStaffUsers();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		}
	}
	function openCreate() {
		editing = null;
		form = {
			userId: 0,
			employeeCode: '',
			jobTitle: '',
			primaryDepartment: '',
			primaryServiceId: null,
			secondaryServiceIds: [],
			professionalNumber: '',
			active: true,
			functions: [],
			specialties: [],
			capabilities: []
		};
		audit = [];
		showForm = true;
	}
	async function openEdit(x: StaffProfile) {
		editing = x;
		form = {
			userId: x.userId,
			employeeCode: x.employeeCode,
			jobTitle: x.jobTitle,
			primaryDepartment: x.primaryDepartment,
			primaryServiceId: x.primaryServiceId,
			secondaryServiceIds: x.serviceAssignments.filter((a) => !a.isPrimary).map((a) => a.serviceId),
			professionalNumber: x.professionalNumber,
			active: x.active,
			functions: [...x.functions],
			specialties: [...x.specialties],
			capabilities: [...x.capabilities]
		};
		audit = can(permissions, 'staff.audit.read') ? await getStaffAudit(x.id) : [];
		showForm = true;
	}
	async function save() {
		if (editing) await updateStaff(editing.id, form);
		else await createStaff(form);
		showForm = false;
		await load();
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		void load();
	});
</script>

<div class="space-y-6 p-6">
	<header class="flex flex-wrap justify-between gap-3">
		<div>
			<p class="text-xs font-black uppercase text-indigo-700">Administration</p>
			<h1 class="text-3xl font-black">Personnel et fonctions</h1>
			<p class="text-slate-500">
				Utilisateur → fonctions → spécialités → capacités → permissions effectives
			</p>
		</div>
		<div class="space-x-2">
			<button
				onclick={() => (showMatrix = !showMatrix)}
				class="rounded-xl border px-4 py-3 font-bold">Matrice RBAC</button
			>{#if can(permissions, 'staff.manage')}<button
					onclick={openCreate}
					class="rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white">Nouveau profil</button
				>{/if}
		</div>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<section class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6">
		<input
			bind:value={search}
			placeholder="Nom, email, code agent"
			class="rounded-xl border p-3"
		/><select bind:value={functionFilter} class="rounded-xl border p-3"
			><option value="">Toutes fonctions</option
			>{#each Object.entries(catalog?.functions ?? {}) as [code, label] (code)}<option value={code}
					>{label}</option
				>{/each}</select
		><select bind:value={specialtyFilter} class="rounded-xl border p-3"
			><option value="">Toutes spécialités</option
			>{#each Object.entries(catalog?.specialties ?? {}) as [code, label] (code)}<option
					value={code}>{label}</option
				>{/each}</select
		><select bind:value={activeFilter} class="rounded-xl border p-3"
			><option value="">Tous statuts</option><option value="true">Actifs</option><option
				value="false">Inactifs</option
			></select
		><ServiceSelect bind:value={serviceFilter} placeholder="Tous les services" />
		><button onclick={load} class="rounded-xl bg-slate-900 text-white">Filtrer</button>
	</section>
	<section class="overflow-x-auto rounded-2xl border bg-white">
		<table class="w-full min-w-[1100px] text-left text-sm">
			<thead
				><tr class="bg-slate-50"
					><th class="p-3">Personnel</th><th>Code</th><th>Fonctions</th><th>Spécialités</th><th
						>Service</th
					><th>Capacités</th><th>Statut</th><th></th></tr
				></thead
			><tbody
				>{#each rows as x (x.id)}<tr class="border-t"
						><td class="p-3"
							><b>{x.name}</b><small class="block text-slate-500">{x.email}</small></td
						><td>{x.employeeCode}</td><td
							>{x.functions.map((c) => catalog?.functions[c] ?? c).join(', ') || '—'}</td
						><td>{x.specialties.map((c) => catalog?.specialties[c] ?? c).join(', ') || '—'}</td><td
							>{x.primaryDepartment || '—'}</td
						><td>{x.capabilities.map((c) => catalog?.capabilities[c] ?? c).join(', ') || '—'}</td
						><td>{x.active ? 'Actif' : 'Inactif'}</td><td
							>{#if can(permissions, 'staff.manage')}<button
									onclick={() => openEdit(x)}
									class="font-bold text-indigo-700">Modifier</button
								>{/if}</td
						></tr
					>{:else}<tr><td colspan="8" class="p-10 text-center">Aucun profil personnel.</td></tr
					>{/each}</tbody
			>
		</table>
	</section>
	{#if showMatrix && catalog}<section class="overflow-x-auto rounded-2xl border bg-white p-4">
			<h2 class="mb-4 text-xl font-black">Matrice des permissions réellement attribuées</h2>
			<table class="min-w-[1500px] text-xs">
				<thead
					><tr
						><th class="p-2 text-left">Fonction</th>{#each permissionAreas as area (area[0])}<th
								class="p-2">{area[0]}</th
							>{/each}</tr
					></thead
				><tbody
					>{#each catalog.matrix as row (row.code)}<tr class="border-t"
							><th class="p-2 text-left">{row.label}</th
							>{#each permissionAreas as area (area[0])}<td class="p-2 text-center"
									>{anyPermission(row.permissions, [...area[1]]) ? '✓' : '—'}</td
								>{/each}</tr
						>{/each}</tbody
				>
			</table>
		</section>{/if}
	{#if showForm && catalog}<section class="rounded-2xl border bg-white p-5">
			<div class="flex justify-between">
				<h2 class="text-xl font-black">{editing ? 'Modifier le profil' : 'Créer un profil'}</h2>
				<button onclick={() => (showForm = false)}>Fermer</button>
			</div>
			<div class="mt-4 grid gap-3 md:grid-cols-3">
				<select bind:value={form.userId} disabled={!!editing} class="rounded-xl border p-3"
					><option value={0}>Compte utilisateur</option
					>{#each users.filter((u) => !u.hasProfile || u.id === form.userId) as u (u.id)}<option
							value={u.id}>{u.name} — {u.email}</option
						>{/each}</select
				><input
					bind:value={form.employeeCode}
					placeholder="Code agent"
					class="rounded-xl border p-3"
				/><input
					bind:value={form.jobTitle}
					placeholder="Intitulé"
					class="rounded-xl border p-3"
				/><ServiceSelect bind:value={form.primaryServiceId} placeholder="Service principal" /><input
					bind:value={form.professionalNumber}
					placeholder="Numéro professionnel"
					class="rounded-xl border p-3"
				/><label class="flex items-center gap-2"
					><input type="checkbox" bind:checked={form.active} /> Personnel actif</label
				>
			</div>
			<div class="mt-4">
				<p class="mb-2 text-sm font-bold">Services secondaires</p>
				<div class="flex flex-wrap gap-2">
					{#each organizationServices.filter((s) => s.id !== form.primaryServiceId) as service (service.id)}<label
							class="rounded-full border px-3 py-2 text-sm"
							><input
								type="checkbox"
								checked={form.secondaryServiceIds.includes(service.id)}
								onchange={() =>
									(form.secondaryServiceIds = form.secondaryServiceIds.includes(service.id)
										? form.secondaryServiceIds.filter((id) => id !== service.id)
										: [...form.secondaryServiceIds, service.id])}
							/>
							{service.name}</label
						>{/each}
				</div>
			</div>
			{#each [['Fonctions', catalog.functions, 'functions'], ['Spécialités', catalog.specialties, 'specialties'], ['Capacités', catalog.capabilities, 'capabilities']] as group (group[0])}<div
					class="mt-5"
				>
					<h3 class="font-black">{group[0]}</h3>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each Object.entries(group[1] as Record<string, string>) as [code, label] (code)}<button
								type="button"
								onclick={() => {
									const key = group[2] as 'functions' | 'specialties' | 'capabilities';
									form[key] = toggleCode(form[key], code);
								}}
								class:!bg-indigo-700={form[
									group[2] as 'functions' | 'specialties' | 'capabilities'
								].includes(code)}
								class:!text-white={form[
									group[2] as 'functions' | 'specialties' | 'capabilities'
								].includes(code)}
								class="rounded-full border px-3 py-2">{label}</button
							>{/each}
					</div>
				</div>{/each}
			<div class="mt-5 rounded-xl bg-slate-50 p-4">
				<b>Permissions effectives</b>
				<p class="mt-1 text-xs text-slate-600">
					Déterminées automatiquement par la matrice fonctionnelle. Les spécialités décrivent le
					contexte clinique et les capacités les modalités autorisées.
				</p>
			</div>
			<button
				onclick={save}
				disabled={!form.userId || !form.employeeCode}
				class="mt-4 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:opacity-40"
				>Enregistrer</button
			>
			{#if editing && can(permissions, 'staff.audit.read')}<div class="mt-6">
					<h3 class="font-black">Historique des affectations</h3>
					{#each audit as a (a.id)}<p class="border-t py-2 text-sm">
							{new Date(a.createdAt).toLocaleString('fr-FR')} · {a.action}
							{a.dimension}
							{a.value}
						</p>{:else}<p>Aucun événement.</p>{/each}
				</div>{/if}
		</section>{/if}
</div>
