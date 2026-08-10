<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		admitHospitalization,
		cancelHospitalization,
		dischargeHospitalization,
		getHospitalization
	} from '$lib/api/hospitalizations';
	import {
		availableHospitalizationActions,
		hospitalizationStatusLabel
	} from '$lib/components/hospitalizations/hospitalization-state';
	import type { Hospitalization } from '$lib/types/hospitalization';
	import BedAssignmentPanel from '$lib/components/hospitalizations/BedAssignmentPanel.svelte';
	let item = $state<Hospitalization | null>(null);
	let loading = $state(true);
	let error = $state('');
	let diagnosis = $state('');
	let summary = $state('');
	const actions = $derived(item ? availableHospitalizationActions(item.status) : []);
	async function load() {
		try {
			item = await getHospitalization(Number(page.params.id));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Chargement impossible.';
		} finally {
			loading = false;
		}
	}
	async function run(action: 'admit' | 'cancel' | 'discharge') {
		if (!item) return;
		error = '';
		try {
			if (action === 'admit')
				item = await admitHospitalization(item.id, { admissionDiagnosis: item.admissionDiagnosis });
			else if (action === 'cancel') item = await cancelHospitalization(item.id);
			else
				item = await dischargeHospitalization(item.id, {
					dischargeDiagnosis: diagnosis,
					dischargeSummary: summary
				});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Action impossible.';
		}
	}
	onMount(load);
</script>

<svelte:head><title>Détail hospitalisation | MedCore HIS</title></svelte:head>
{#if loading}<p>Chargement...</p>{:else if error && !item}<p
		class="rounded-xl bg-red-50 p-4 text-red-700"
	>
		{error}
	</p>{:else if item}
	<div class="space-y-6">
		<button
			onclick={() => goto(resolve('/hospitalizations'))}
			class="text-sm font-bold text-[#0E4C92]">← Retour</button
		>
		<header class="rounded-3xl bg-slate-900 p-8 text-white">
			<p class="text-xs uppercase tracking-widest text-slate-300">{item.admissionNumber}</p>
			<div class="mt-2 flex flex-wrap items-center gap-3">
				<h1 class="text-3xl font-black">{item.patient.nom} {item.patient.prenoms}</h1>
				<span class="rounded-full bg-white/10 px-3 py-1 text-xs font-black"
					>{hospitalizationStatusLabel(item.status)}</span
				>
			</div>
			<p class="mt-2 text-slate-300">
				{item.department || 'Service non renseigné'} · Consultation #{item.sourceConsultationId}
			</p>
		</header>
		{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
		<section class="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Motif</p>
				<p class="mt-1">{item.admissionReason || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Diagnostic admission</p>
				<p class="mt-1">{item.admissionDiagnosis || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Type</p>
				<p>{item.hospitalizationType || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Admission</p>
				<p>{item.admittedAt ? new Date(item.admittedAt).toLocaleString('fr-FR') : 'Planifiée'}</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Sortie prévue</p>
				<p>
					{item.expectedDischargeAt
						? new Date(item.expectedDischargeAt).toLocaleString('fr-FR')
						: '—'}
				</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-slate-400">Sortie</p>
				<p>{item.dischargedAt ? new Date(item.dischargedAt).toLocaleString('fr-FR') : '—'}</p>
			</div>
		</section>
		<BedAssignmentPanel hospitalizationId={item.id} status={item.status} />
		{#if actions.includes('admit') || actions.includes('cancel')}<div class="flex gap-3">
				{#if actions.includes('admit')}<button
						onclick={() => run('admit')}
						class="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white">Admettre</button
					>{/if}{#if actions.includes('cancel')}<button
						onclick={() => run('cancel')}
						class="rounded-xl bg-red-600 px-5 py-3 font-black text-white">Annuler</button
					>{/if}
			</div>{/if}
		{#if actions.includes('discharge')}<section class="space-y-3 rounded-2xl border bg-white p-6">
				<h2 class="text-xl font-black">Enregistrer la sortie</h2>
				<input
					bind:value={diagnosis}
					placeholder="Diagnostic de sortie"
					class="w-full rounded-xl border p-3"
				/><textarea
					bind:value={summary}
					placeholder="Résumé de sortie"
					class="w-full rounded-xl border p-3"></textarea><button
					disabled={!diagnosis.trim() || !summary.trim()}
					onclick={() => run('discharge')}
					class="rounded-xl bg-[#0E4C92] px-5 py-3 font-black text-white disabled:opacity-40"
					>Enregistrer la sortie</button
				>
			</section>{/if}
		{#if item.status === 'DISCHARGED'}<section class="rounded-2xl border bg-white p-6">
				<h2 class="font-black">Informations de sortie</h2>
				<p class="mt-3"><strong>Diagnostic :</strong> {item.dischargeDiagnosis}</p>
				<p class="mt-2"><strong>Résumé :</strong> {item.dischargeSummary}</p>
			</section>{/if}
	</div>{/if}
