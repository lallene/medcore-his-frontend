<script lang="ts">
	import HelpHint from '$lib/components/help/HelpHint.svelte';
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
	import AuthorizationStatus from '$lib/components/insurance/AuthorizationStatus.svelte';
	import BillingActStatus from '$lib/components/billing/BillingActStatus.svelte';
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
			class="text-sm font-bold text-primary">← Retour</button
		>
		<header class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary tabular-nums">
				{item.admissionNumber}
			</p>
			<div class="mt-1.5 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
					{item.patient.nom}
					{item.patient.prenoms}
				</h1>
				<span
					class="rounded-md border border-primary-border bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
					>{hospitalizationStatusLabel(item.status)}</span
				>
			</div>
			<p class="mt-1.5 text-sm text-muted-foreground">
				{item.department || 'Service non renseigné'} · Consultation #{item.sourceConsultationId}
			</p>
		</header>
		<AuthorizationStatus
			patientId={item.patientId}
			referenceType="HOSPITALIZATION"
			referenceId={item.id}
			service={item.department}
		/>
		<BillingActStatus patientId={item.patientId} actType="HOSPITALIZATION" referenceId={item.id} />
		{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
		<section class="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Motif</p>
				<p class="mt-1">{item.admissionReason || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Diagnostic admission</p>
				<p class="mt-1">{item.admissionDiagnosis || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Type</p>
				<p>{item.hospitalizationType || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Admission</p>
				<p>{item.admittedAt ? new Date(item.admittedAt).toLocaleString('fr-FR') : 'Planifiée'}</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Sortie prévue</p>
				<p>
					{item.expectedDischargeAt
						? new Date(item.expectedDischargeAt).toLocaleString('fr-FR')
						: '—'}
				</p>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase text-slate-500">Sortie</p>
				<p>{item.dischargedAt ? new Date(item.dischargedAt).toLocaleString('fr-FR') : '—'}</p>
			</div>
		</section>
		<BedAssignmentPanel hospitalizationId={item.id} status={item.status} />
		{#if actions.includes('admit') || actions.includes('cancel')}<div class="flex gap-3">
				{#if actions.includes('admit')}<button
						onclick={() => run('admit')}
						class="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Admettre</button
					>{/if}{#if actions.includes('cancel')}<button
						onclick={() => run('cancel')}
						class="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Annuler</button
					>{/if}
			</div>{/if}
		{#if actions.includes('discharge')}<section class="space-y-3 rounded-2xl border bg-white p-6">
				<h2 class="text-xl font-bold">Enregistrer la sortie</h2>
				<div class="flex items-center gap-1">
					<input
						bind:value={diagnosis}
						placeholder="Diagnostic de sortie"
						aria-label="Diagnostic de sortie"
						class="min-h-control w-full rounded-lg border px-3 py-2"
					/><HelpHint helpKey="hospitalization.discharge.diagnosis" />
				</div>
				<textarea
					bind:value={summary}
					placeholder="Résumé de sortie"
					class="w-full rounded-lg border p-3"></textarea><button
					disabled={!diagnosis.trim() || !summary.trim()}
					onclick={() => run('discharge')}
					class="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-40"
					>Enregistrer la sortie</button
				>
			</section>{/if}
		{#if item.status === 'DISCHARGED'}<section class="rounded-2xl border bg-white p-6">
				<h2 class="font-bold">Informations de sortie</h2>
				<p class="mt-3"><strong>Diagnostic :</strong> {item.dischargeDiagnosis}</p>
				<p class="mt-2"><strong>Résumé :</strong> {item.dischargeSummary}</p>
			</section>{/if}
	</div>{/if}
