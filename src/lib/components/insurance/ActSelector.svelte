<script lang="ts">
	import { getEligibleInsuranceActs, linkInsuranceAuthorizationAct } from '$lib/api/insurance';
	import type { EligibleInsuranceAct } from '$lib/types/insurance';

	type Props = {
		authorizationId: number;
		authorizationNumber: string;
		patientId: number;
		coverageId: number;
		patientName: string;
		canLink: boolean;
		onLinked: () => void | Promise<void>;
	};
	let {
		authorizationId,
		authorizationNumber,
		patientId,
		coverageId,
		patientName,
		canLink,
		onLinked
	}: Props = $props();
	let type = $state('IMAGING'),
		search = $state(''),
		acts = $state<EligibleInsuranceAct[]>([]);
	let selected = $state<EligibleInsuranceAct | null>(null),
		loading = $state(false),
		busy = $state(false),
		error = $state('');

	async function load() {
		loading = true;
		error = '';
		selected = null;
		try {
			acts = await getEligibleInsuranceActs({ patientId, coverageId, type, search });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
			acts = [];
		} finally {
			loading = false;
		}
	}
	async function link() {
		if (!selected || selected.authorizationResolution !== 'NONE' || !canLink) return;
		busy = true;
		error = '';
		try {
			await linkInsuranceAuthorizationAct(authorizationId, {
				referenceType: selected.referenceType,
				referenceId: selected.referenceId
			});
			search = '';
			acts = [];
			selected = null;
			await onLinked();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Rattachement impossible';
		} finally {
			busy = false;
		}
	}
</script>

<div class="mt-4 space-y-3">
	<div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
		<select bind:value={type} onchange={load} class="h-10 rounded-lg border px-3">
			<option value="CONSULTATION">Consultation</option><option value="LABORATORY"
				>Laboratoire</option
			><option value="IMAGING">Imagerie</option><option value="HOSPITALIZATION"
				>Hospitalisation</option
			><option value="MEDICATION">Médicament</option>
		</select>
		<input
			bind:value={search}
			onkeydown={(e) => e.key === 'Enter' && load()}
			placeholder="Radiographie, NFS, HOSP…"
			class="h-10 rounded-lg border px-3"
		/>
		<button onclick={load} class="rounded-lg border px-3 text-sm font-bold">Rechercher</button>
	</div>
	{#if loading}<p class="text-sm text-slate-500">Chargement…</p>{/if}
	{#if error}<p class="text-sm font-bold text-red-700">{error}</p>{/if}
	{#if acts.length}<div class="max-h-52 space-y-2 overflow-y-auto">
			{#each acts as act (`${act.referenceType}-${act.referenceId}`)}
				<button
					onclick={() => (selected = act)}
					class="block w-full rounded-lg border p-3 text-left disabled:bg-slate-100"
					disabled={act.authorizationResolution !== 'NONE'}
				>
					<b>{act.label}</b><small class="block text-slate-500"
						>{act.secondaryLabel} · {act.status}</small
					>
					{#if act.authorizationResolution !== 'NONE'}<small class="font-bold text-violet-700"
							>Déjà couvert par {act.existingAuthorizationNumber}</small
						>{/if}
				</button>
			{/each}
		</div>{/if}
	{#if selected}<div class="rounded-xl bg-violet-50 p-4 text-sm">
			<p><b>PEC :</b> {authorizationNumber}</p>
			<p><b>Patient :</b> {patientName}</p>
			<p><b>Acte :</b> {selected.label}</p>
			<p><b>Relation :</b> Couvert par cette PEC</p>
			{#if canLink}<button
					disabled={busy}
					onclick={link}
					class="mt-3 rounded-lg bg-violet-700 px-3 py-2 font-bold text-white"
					>Confirmer le rattachement</button
				>{/if}
		</div>{/if}
</div>
