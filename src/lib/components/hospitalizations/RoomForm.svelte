<script lang="ts">
	import { Building2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { Room, RoomPayload } from '$lib/types/bed-management';
	import {
		generateRoomCode,
		roomFloorOptions,
		roomFormDraft,
		roomTypeOptions
	} from './bed-management-state';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';
	import { listOrganizationServices } from '$lib/api/organization';
	import type { OrganizationService } from '$lib/types/organization';
	let {
		room = null,
		rooms,
		loading = false,
		error = '',
		onsubmit,
		oncancel
	}: {
		room?: Room | null;
		rooms: Room[];
		loading?: boolean;
		error?: string;
		onsubmit: (payload: RoomPayload) => void;
		oncancel: () => void;
	} = $props();
	let code = $state(''),
		name = $state(''),
		department = $state(''),
		serviceId = $state<number | null>(null),
		floor = $state(''),
		roomType = $state(''),
		isActive = $state(true),
		validation = $state(''),
		hydrated = $state<number | null | undefined>(undefined);
	let services = $state<OrganizationService[]>([]);
	onMount(() => {
		void listOrganizationServices().then((items) => (services = items));
	});
	$effect(() => {
		const identity = room?.id ?? null;
		if (identity === hydrated) return;
		hydrated = identity;
		const draft = roomFormDraft(room);
		code = draft.code;
		name = draft.name;
		department = draft.department;
		serviceId = room?.serviceId ?? null;
		floor = draft.floor;
		roomType = draft.roomType;
		isActive = draft.isActive;
	});
	$effect(() => {
		if (room) return;
		department = services.find((s) => s.id === serviceId)?.name ?? '';
		code = generateRoomCode(department, floor, roomType, rooms);
	});
	function submit() {
		if (!code || !name.trim() || !serviceId || !floor || !roomType) {
			validation = 'Nom, service, étage et type sont obligatoires.';
			return;
		}
		validation = '';
		onsubmit({ code, name: name.trim(), department, serviceId, floor, roomType, isActive });
	}
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submit();
	}}
	class="rounded-2xl border bg-white p-5 shadow-sm"
>
	<div class="mb-5 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Building2 size={20} class="text-[#0E4C92]" />
			<h2 class="text-base font-black">{room ? 'Modifier la chambre' : 'Nouvelle chambre'}</h2>
		</div>
		<button type="button" onclick={oncancel} class="text-sm font-semibold text-slate-500"
			>Fermer</button
		>
	</div>
	<div class="grid items-end gap-4 xl:grid-cols-[1.05fr_1.3fr_1.2fr_1.1fr_1.2fr_.7fr_auto]">
		<label class="text-xs font-bold text-slate-700"
			>Code (généré automatiquement)<input
				value={code || 'Sélectionnez les critères'}
				readonly
				class="mt-2 w-full rounded-xl border bg-slate-50 p-3 text-sm font-semibold text-slate-600"
			/></label
		>
		<label class="text-xs font-bold text-slate-700"
			>Nom / libellé <span class="text-red-500">*</span><input
				bind:value={name}
				placeholder="Saisir le nom ou le libellé"
				class="mt-2 w-full rounded-xl border p-3 text-sm"
			/></label
		>
		<label class="text-xs font-bold text-slate-700"
			>Service <span class="text-red-500">*</span>
			<div class="mt-2"><ServiceSelect bind:value={serviceId} capability="beds" /></div></label
		>
		<label class="text-xs font-bold text-slate-700"
			>Étage <span class="text-red-500">*</span><select
				bind:value={floor}
				class="mt-2 w-full rounded-xl border bg-white p-3 text-sm"
				><option value="">Sélectionner un étage</option
				>{#each roomFloorOptions as option (option.value)}<option value={option.value}
						>{option.label}</option
					>{/each}</select
			></label
		>
		<label class="text-xs font-bold text-slate-700"
			>Type de chambre <span class="text-red-500">*</span><select
				bind:value={roomType}
				class="mt-2 w-full rounded-xl border bg-white p-3 text-sm"
				><option value="">Sélectionner un type</option
				>{#each roomTypeOptions as option (option.value)}<option value={option.value}
						>{option.label}</option
					>{/each}</select
			></label
		>
		<label class="flex flex-col items-center gap-3 text-xs font-bold text-slate-700"
			>Chambre active<input
				type="checkbox"
				bind:checked={isActive}
				class="h-5 w-10 accent-[#0E4C92]"
			/></label
		>
		<button
			disabled={loading || !code}
			class="rounded-xl bg-[#0E4C92] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
			>{loading ? 'Enregistrement...' : 'Enregistrer'}</button
		>
	</div>
	{#if validation || error}<p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
			{validation || error}
		</p>{/if}
</form>
