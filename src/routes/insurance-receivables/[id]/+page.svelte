<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import {
		addInsuranceReceivableFollowUp,
		getInsuranceReceivable,
		setInsuranceDueDate
	} from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		insuranceReceivableCan,
		insuranceReceivableStatusLabel
	} from '$lib/components/insurance-receivables/state';
	import type { InsuranceReceivableDetail } from '$lib/types/insurance-receivables';
	let item = $state<InsuranceReceivableDetail | null>(null),
		due = $state(''),
		note = $state(''),
		followUpNote = $state(''),
		permissions = $state<string[]>([]);
	const id = $derived(Number(page.params.id));
	async function load() {
		const loaded = await getInsuranceReceivable(id);
		item = loaded;
		due = loaded.dueDate?.slice(0, 10) ?? '';
	}
	async function save() {
		await setInsuranceDueDate(id, due || null, note);
		await load();
	}
	async function addFollowUp() {
		await addInsuranceReceivableFollowUp(id, 'REMINDER', followUpNote);
		followUpNote = '';
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

{#if item}<div class="space-y-6 p-6">
		<header>
			<p class="text-xs font-black uppercase text-indigo-700">Créance assureur</p>
			<h1 class="text-3xl font-black">{item.invoiceNumber} — {item.description}</h1>
			<p>{item.companyName} · {item.patientName} · {item.authorizationNumber}</p>
		</header>
		<section class="grid gap-3 md:grid-cols-4">
			{#each [['Brut', item.grossAmount], ['Part assurance', item.insuranceDue], ['Réglé assureur', item.insurancePaid], ['Reste assureur', item.insuranceBalance]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-black">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		<p class="rounded-xl bg-slate-50 p-3 font-bold">
			{insuranceReceivableStatusLabel[item.status]} · Circuit patient non inclus
		</p>
		{#if insuranceReceivableCan(permissions, 'insurance_receivables.followup')}<section
				class="rounded-2xl border bg-white p-5"
			>
				<h2 class="font-black">Échéance et suivi</h2>
				<div class="mt-3 flex gap-2">
					<input type="date" bind:value={due} class="rounded-xl border p-3" /><input
						bind:value={note}
						placeholder="Note administrative"
						class="flex-1 rounded-xl border p-3"
					/><button onclick={save} class="rounded-xl bg-slate-900 px-4 text-white"
						>Enregistrer</button
					>
				</div>
				<div class="mt-3 flex gap-2">
					<input
						bind:value={followUpNote}
						placeholder="Nouvelle relance"
						class="flex-1 rounded-xl border p-3"
					/><button
						onclick={addFollowUp}
						disabled={!followUpNote.trim()}
						class="rounded-xl bg-indigo-700 px-4 text-white disabled:opacity-40">Ajouter</button
					>
				</div>
			</section>{/if}
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Historique administratif</h2>
			{#each item.followUps as f (f.id)}<p class="border-t py-2">
					<b>{f.type}</b> · {new Date(f.followedUpAt).toLocaleString('fr-FR')} — {f.note}
				</p>{:else}<p>Aucune relance.</p>{/each}
		</section>
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Traçabilité</h2>
			<p>PEC : {item.authorizationNumber} ({item.coverageResolution})</p>
			<p>Bordereau : {item.batchNumber || 'Non soumis'}</p>
			<p>
				Les allocations et règlements sont consultables dans le journal des règlements assureurs.
			</p>
		</section>
	</div>{/if}
