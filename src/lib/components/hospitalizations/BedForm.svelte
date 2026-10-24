<script lang="ts">
	import type { Bed, BedOverview, BedPayload, Room } from '$lib/types/bed-management';
	import {
		administrativeBedStatuses,
		bedFormDraft,
		bedTypeOptions,
		bedStatusLabel,
		generateBedCode
	} from './bed-management-state';
	let {
		bed = null,
		rooms,
		beds,
		preferredRoomId = null,
		loading = false,
		error = '',
		onsubmit,
		oncancel
	}: {
		bed?: Bed | null;
		rooms: Room[];
		beds: BedOverview[];
		preferredRoomId?: number | null;
		loading?: boolean;
		error?: string;
		onsubmit: (payload: BedPayload) => void;
		oncancel: () => void;
	} = $props();
	let code = $state(''),
		label = $state(''),
		roomId = $state(''),
		bedType = $state('STANDARD'),
		isActive = $state(true),
		status = $state<'AVAILABLE' | 'OUT_OF_SERVICE'>('AVAILABLE'),
		validation = $state('');
	let hydrated = $state<string | undefined>(undefined);
	$effect(() => {
		const identity = `${bed?.id ?? 'new'}:${preferredRoomId ?? 'default'}`;
		if (identity === hydrated) return;
		hydrated = identity;
		const draft = bedFormDraft(bed, rooms, preferredRoomId);
		code = draft.code;
		label = draft.label;
		roomId = draft.roomId;
		bedType = draft.bedType;
		isActive = draft.isActive;
		status = draft.status;
	});
	$effect(() => {
		if (bed) return;
		code = generateBedCode(roomId ? Number(roomId) : null, rooms, beds);
	});
	const locked = $derived(bed?.status === 'OCCUPIED' || bed?.status === 'RESERVED');
	function submit() {
		if (!code || !label.trim() || !roomId || !bedType) {
			validation = 'Libellé, chambre et type sont obligatoires.';
			return;
		}
		validation = '';
		onsubmit({
			code: code.trim(),
			label: label.trim(),
			roomId: Number(roomId),
			bedType: bedType.trim(),
			isActive,
			status: locked ? undefined : status
		});
	}
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submit();
	}}
	class="space-y-4"
>
	<div class="grid gap-4 md:grid-cols-2">
		<label class="text-sm font-bold"
			>Code généré<input
				value={code || 'Sélectionnez une chambre'}
				readonly
				class="min-h-control mt-1 w-full rounded-lg border bg-slate-50 text-slate-600 px-3 py-2"
			/></label
		><label class="text-sm font-bold"
			>Libellé<input
				bind:value={label}
				class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
			/></label
		><label class="text-sm font-bold"
			>Chambre<select
				bind:value={roomId}
				disabled={locked}
				class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
				><option value="">Choisir</option
				>{#each rooms.filter((room) => room.isActive || room.id === bed?.roomId) as room (room.id)}<option
						value={room.id}>{room.department} · {room.code} · {room.name}</option
					>{/each}</select
			></label
		><label class="text-sm font-bold"
			>Type<select
				bind:value={bedType}
				class="min-h-control mt-1 w-full rounded-lg border bg-white px-3 py-2"
				>{#each bedTypeOptions as type (type)}<option value={type}>{type}</option>{/each}</select
			></label
		>{#if !locked}<label class="text-sm font-bold"
				>Statut opérationnel<select
					bind:value={status}
					class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
					>{#each administrativeBedStatuses as option (option)}<option value={option}
							>{bedStatusLabel(option)}</option
						>{/each}</select
				></label
			>{:else}<p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
				Le statut {bed?.status} reste contrôlé par l’affectation.
			</p>{/if}<label class="flex items-center gap-2 pt-7 text-sm font-bold"
			><input type="checkbox" bind:checked={isActive} disabled={locked} />Lit actif</label
		>
	</div>
	{#if validation || error}<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
			{validation || error}
		</p>{/if}
	<div class="flex justify-end gap-3">
		<button type="button" onclick={oncancel} class="rounded-xl border px-4 py-2">Annuler</button
		><button
			disabled={loading}
			class="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50 hover:bg-primary-hover transition-colors"
			>{loading ? 'Enregistrement...' : 'Enregistrer'}</button
		>
	</div>
</form>
