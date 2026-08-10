<script lang="ts">
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import { BedDouble, Building2, Pencil, Plus, Power, RefreshCw, Wrench } from 'lucide-svelte';
	import {
		createBed,
		createRoom,
		listBeds,
		listRooms,
		updateBed,
		updateRoom
	} from '$lib/api/bed-management';
	import BedForm from '$lib/components/hospitalizations/BedForm.svelte';
	import RoomForm from '$lib/components/hospitalizations/RoomForm.svelte';
	import {
		bedAdminActions,
		bedAdminError,
		bedIndicators,
		bedStatusLabel,
		canManageBeds,
		canManageRooms,
		groupRooms,
		roomAddBedAction
	} from '$lib/components/hospitalizations/bed-management-state';
	import type {
		Bed,
		BedOverview,
		BedPayload,
		BedStatus,
		Room,
		RoomPayload
	} from '$lib/types/bed-management';

	let beds = $state<BedOverview[]>([]),
		rooms = $state<Room[]>([]),
		department = $state(''),
		floorFilter = $state(''),
		roomTypeFilter = $state(''),
		status = $state<BedStatus | ''>(''),
		loading = $state(true),
		saving = $state(false),
		error = $state(''),
		success = $state(''),
		canManageRoomsUI = $state(false),
		canManageBedsUI = $state(false),
		roomFormOpen = $state(false),
		bedModal = $state(false),
		editingRoom = $state<Room | null>(null),
		editingBed = $state<Bed | null>(null);
	let preferredBedRoomId = $state<number | null>(null);
	const indicators = $derived(bedIndicators(rooms));
	const grouped = $derived(
		groupRooms(rooms, beds, department, status, floorFilter, roomTypeFilter)
	);
	const serviceFilters = $derived(
		[...new Set(rooms.map((room) => room.department))].sort((a, b) => a.localeCompare(b, 'fr'))
	);
	const floorFilters = $derived(
		[...new Set(rooms.map((room) => room.floor).filter(Boolean))].sort()
	);
	const roomTypeFilters = $derived(
		[...new Set(rooms.map((room) => room.roomType).filter(Boolean))].sort()
	);

	function detectPermissions() {
		const token = localStorage.getItem('medcore_token');
		if (!token) return null;
		try {
			return jwtDecode<{ role?: string; permissions?: string[] }>(token);
		} catch {
			return null;
		}
	}
	async function loadAllBeds() {
		const first = await listBeds({ page: 1, limit: 100 });
		const pages = Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) =>
			listBeds({ page: index + 2, limit: 100 })
		);
		return first.data.concat((await Promise.all(pages)).flatMap((result) => result.data));
	}
	async function load() {
		loading = true;
		error = '';
		try {
			[rooms, beds] = await Promise.all([listRooms(), loadAllBeds()]);
		} catch (e) {
			error = bedAdminError(e);
		} finally {
			loading = false;
		}
	}
	function openRoom(room: Room | null = null) {
		editingRoom = room;
		roomFormOpen = true;
		error = '';
		success = '';
	}
	function openBed(bed: Bed | null = null, roomId: number | null = null) {
		editingBed = bed;
		preferredBedRoomId = bed?.roomId ?? roomId;
		bedModal = true;
		error = '';
		success = '';
	}
	async function saveRoom(payload: RoomPayload) {
		saving = true;
		error = '';
		try {
			if (editingRoom) await updateRoom(editingRoom.id, payload);
			else await createRoom(payload);
			roomFormOpen = false;
			success = editingRoom ? 'Chambre mise à jour.' : 'Chambre créée.';
			await load();
		} catch (e) {
			error = bedAdminError(e);
		} finally {
			saving = false;
		}
	}
	async function saveBed(payload: BedPayload) {
		saving = true;
		error = '';
		try {
			const wasEditing = Boolean(editingBed);
			if (editingBed) await updateBed(editingBed.id, payload);
			else await createBed(payload);
			bedModal = false;
			editingBed = null;
			preferredBedRoomId = null;
			success = wasEditing ? 'Lit mis à jour.' : 'Lit créé.';
			await load();
		} catch (e) {
			error = bedAdminError(e);
		} finally {
			saving = false;
		}
	}
	async function toggleRoom(room: Room) {
		saving = true;
		error = '';
		try {
			await updateRoom(room.id, { isActive: !room.isActive });
			success = room.isActive ? 'Chambre désactivée.' : 'Chambre activée.';
			await load();
		} catch (e) {
			error = bedAdminError(e);
		} finally {
			saving = false;
		}
	}
	async function updateBedState(entry: BedOverview, change: Partial<BedPayload>, message: string) {
		saving = true;
		error = '';
		try {
			await updateBed(entry.bed.id, change);
			success = message;
			await load();
		} catch (e) {
			error = bedAdminError(e);
		} finally {
			saving = false;
		}
	}
	onMount(() => {
		const claims = detectPermissions();
		canManageRoomsUI = canManageRooms(claims);
		canManageBedsUI = canManageBeds(claims);
		load();
	});
</script>

<svelte:head><title>Administration chambres & lits | MedCore HIS</title></svelte:head>
<div class="space-y-6">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-[#0E4C92]">Bed Management</p>
			<h1 class="text-3xl font-black">Chambres et lits</h1>
			<p class="mt-1 text-sm text-slate-500">
				Administration opérationnelle par service et chambre.
			</p>
		</div>
		{#if canManageRoomsUI || canManageBedsUI}<div class="flex gap-3">
				{#if canManageRoomsUI}<button
						onclick={() => openRoom()}
						class="inline-flex items-center gap-2 rounded-xl border border-[#0E4C92] px-4 py-3 font-bold text-[#0E4C92]"
						><Plus size={17} />Nouvelle chambre</button
					>{/if}
				{#if canManageBedsUI}<button
						onclick={() => openBed()}
						disabled={!rooms.some((room) => room.isActive)}
						class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-3 font-bold text-white disabled:opacity-40"
						><Plus size={17} />Ajouter un lit</button
					>{/if}
			</div>{/if}
	</header>
	{#if roomFormOpen}<RoomForm
			room={editingRoom}
			{rooms}
			loading={saving}
			{error}
			onsubmit={saveRoom}
			oncancel={() => {
				roomFormOpen = false;
				editingRoom = null;
				error = '';
			}}
		/>{/if}
	{#if success}<p class="rounded-xl bg-emerald-50 p-4 text-emerald-800">
			{success}
		</p>{/if}{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
		{#each [{ label: 'Chambres actives', value: indicators.activeRooms }, { label: 'Lits totaux', value: indicators.total }, { label: 'Disponibles', value: indicators.available }, { label: 'Occupés', value: indicators.occupied }, { label: 'Réservés', value: indicators.reserved }, { label: 'Hors service', value: indicators.outOfService }] as metric (metric.label)}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-black uppercase text-slate-400">{metric.label}</p>
				<p class="mt-2 text-2xl font-black">{metric.value}</p>
			</div>{/each}
	</div>
	<div class="rounded-2xl border bg-white p-4">
		<p class="mb-3 text-sm font-black">Filtres</p>
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
			<select bind:value={department} class="rounded-xl border bg-white p-3 text-sm"
				><option value="">Tous les services</option
				>{#each serviceFilters as service (service)}<option value={service}>{service}</option
					>{/each}</select
			>
			<select bind:value={floorFilter} class="rounded-xl border bg-white p-3 text-sm"
				><option value="">Tous les étages</option>{#each floorFilters as floor (floor)}<option
						value={floor}>{floor}</option
					>{/each}</select
			>
			<select bind:value={status} class="rounded-xl border bg-white p-3 text-sm"
				><option value="">Tous les statuts</option><option value="AVAILABLE">Disponible</option
				><option value="RESERVED">Réservé</option><option value="OCCUPIED">Occupé</option><option
					value="OUT_OF_SERVICE">Hors service</option
				></select
			>
			<select bind:value={roomTypeFilter} class="rounded-xl border bg-white p-3 text-sm"
				><option value="">Tous les types</option>{#each roomTypeFilters as type (type)}<option
						value={type}>{type}</option
					>{/each}</select
			>
			<button
				onclick={() => {
					department = '';
					floorFilter = '';
					status = '';
					roomTypeFilter = '';
				}}
				class="inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold"
				><RefreshCw size={16} />Réinitialiser</button
			>
		</div>
	</div>
	{#if loading}<p>Chargement...</p>{:else if Object.keys(grouped).length === 0}<div
			class="rounded-2xl border bg-white p-12 text-center"
		>
			<Building2 size={34} class="mx-auto text-slate-400" />
			<p class="mt-3 font-bold">Aucune chambre ne correspond aux filtres.</p>
			{#if canManageRoomsUI}<button
					onclick={() => openRoom()}
					class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-3 text-sm font-bold text-white"
					><Plus size={16} />Nouvelle chambre</button
				>{/if}
		</div>{:else}{#each Object.entries(grouped) as [service, groups] (service)}<section
				class="space-y-4"
			>
				<h2 class="text-xl font-black text-slate-800">{service}</h2>
				{#each groups as group (group.room.id)}{@const addBedAction = roomAddBedAction(
						canManageBedsUI,
						group.room
					)}
					<article class="overflow-hidden rounded-2xl border bg-white">
						<header class="flex flex-wrap items-start justify-between gap-4 bg-slate-50 p-5">
							<div>
								<div class="flex items-center gap-2">
									<h3 class="text-lg font-black">{group.room.code} — {group.room.name}</h3>
									{#if !group.room.isActive}<span
											class="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold">Inactive</span
										>{/if}
								</div>
								<p class="text-sm text-slate-500">
									{group.room.floor || 'Étage non renseigné'} · {group.room.roomType}
								</p>
								<p class="mt-2 text-xs font-semibold text-slate-600">
									{group.room.bedCount} lits · {group.room.availableBedCount} disponibles · {group
										.room.occupiedBedCount} occupés · {group.room.reservedBedCount} réservés · {group
										.room.outOfServiceBedCount} hors service
								</p>
							</div>
							{#if canManageRoomsUI || addBedAction.visible}<div class="flex flex-wrap gap-2">
									{#if canManageRoomsUI}<button
											aria-label="Modifier la chambre"
											onclick={() => openRoom(group.room)}
											class="rounded-lg border p-2"><Pencil size={16} /></button
										>{/if}
									{#if addBedAction.visible}<button
											disabled={!addBedAction.enabled}
											onclick={() => openBed(null, group.room.id)}
											class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
											><Plus size={15} />Ajouter un lit</button
										>{/if}
									{#if canManageRoomsUI}<button
											disabled={saving ||
												(group.room.isActive &&
													group.room.occupiedBedCount + group.room.reservedBedCount > 0)}
											onclick={() => toggleRoom(group.room)}
											class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40"
											><Power size={15} />{group.room.isActive ? 'Désactiver' : 'Activer'}</button
										>{/if}
								</div>{/if}
						</header>
						<div class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
							{#if group.beds.length === 0}<p
									class="col-span-full py-6 text-center text-sm text-slate-400"
								>
									Aucun lit dans cette chambre.
								</p>{:else}{#each group.beds as entry (entry.bed.id)}{@const actions =
										bedAdminActions(entry)}
									<div class="rounded-xl border p-4">
										<div class="flex items-start justify-between gap-3">
											<div>
												<div class="flex items-center gap-2">
													<BedDouble size={18} class="text-[#0E4C92]" />
													<h4 class="font-black">{entry.bed.code} — {entry.bed.label}</h4>
												</div>
												<p class="mt-1 text-xs text-slate-500">{entry.bed.bedType}</p>
											</div>
											<div class="flex flex-col items-end gap-1">
												<span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold"
													>{bedStatusLabel(entry.bed.status)}</span
												>{#if !entry.bed.isActive}<span
														class="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold"
														>Inactif</span
													>{/if}
											</div>
										</div>
										{#if entry.activeAssignment}<p class="mt-3 border-t pt-3 text-xs">
												<strong>Occupant :</strong>
												{entry.activeAssignment.patient?.nom}
												{entry.activeAssignment.patient?.prenoms}<br /><strong>Séjour :</strong>
												{entry.activeAssignment.hospitalization.admissionNumber}
											</p>{/if}{#if canManageBedsUI}<div class="mt-4 flex flex-wrap gap-2">
												<button
													onclick={() => openBed(entry.bed)}
													class="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold"
													><Pencil size={13} />Modifier</button
												>{#if actions.outOfService}<button
														onclick={() =>
															updateBedState(
																entry,
																{ status: 'OUT_OF_SERVICE' },
																'Lit mis hors service.'
															)}
														class="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold"
														><Wrench size={13} />Hors service</button
													>{/if}{#if actions.restore}<button
														onclick={() =>
															updateBedState(
																entry,
																{ status: 'AVAILABLE' },
																'Lit remis en service.'
															)}
														class="rounded-lg border px-2 py-1 text-xs font-bold"
														>Remettre en service</button
													>{/if}{#if actions.toggleActive}<button
														onclick={() =>
															updateBedState(
																entry,
																{ isActive: !entry.bed.isActive },
																entry.bed.isActive ? 'Lit désactivé.' : 'Lit activé.'
															)}
														class="rounded-lg border px-2 py-1 text-xs font-bold"
														>{entry.bed.isActive ? 'Désactiver' : 'Activer'}</button
													>{/if}
											</div>{/if}
									</div>{/each}{/if}
						</div>
					</article>{/each}
			</section>{/each}{/if}
</div>

{#if bedModal}<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
		<div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
			<h2 class="mb-5 text-xl font-black">{editingBed ? 'Modifier le lit' : 'Ajouter un lit'}</h2>
			<BedForm
				bed={editingBed}
				{rooms}
				{beds}
				preferredRoomId={preferredBedRoomId}
				loading={saving}
				{error}
				onsubmit={saveBed}
				oncancel={() => {
					bedModal = false;
					editingBed = null;
					preferredBedRoomId = null;
					error = '';
				}}
			/>
		</div>
	</div>{/if}
