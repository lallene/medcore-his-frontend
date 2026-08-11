<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		getLaboratoryOrder,
		collectLaboratorySample,
		prepareLaboratorySample,
		startLaboratoryAnalysis,
		enterLaboratoryResults,
		validateLaboratoryOrder,
		cancelLaboratoryOrder
	} from '$lib/api/laboratory';
	import {
		laboratoryStatusLabel,
		computeLaboratoryFlag,
		hasLaboratoryPermission,
		laboratorySampleTypes
	} from '$lib/components/laboratory/state';
	import type { LaboratoryOrder, LaboratoryResultInput } from '$lib/types/laboratory';
	import AuthorizationStatus from '$lib/components/insurance/AuthorizationStatus.svelte';
	let order = $state<LaboratoryOrder | null>(null),
		error = $state(''),
		busy = $state(false),
		sampleType = $state('Sang'),
		sampleComment = $state('');
	let results = $state<LaboratoryResultInput[]>([
		{
			parameter: '',
			value: '',
			unit: '',
			referenceMin: null,
			referenceMax: null,
			referenceText: '',
			criticalMin: null,
			criticalMax: null,
			comment: ''
		}
	]);
	let claims = $state<{ role?: string; permissions?: string[] } | null>(null);
	const canCollect = $derived(hasLaboratoryPermission(claims, 'laboratory.collect')),
		canProcess = $derived(hasLaboratoryPermission(claims, 'laboratory.process')),
		canWrite = $derived(hasLaboratoryPermission(claims, 'laboratory.result.write')),
		canValidate = $derived(hasLaboratoryPermission(claims, 'laboratory.validate')),
		canCancel = $derived(hasLaboratoryPermission(claims, 'laboratory.cancel'));
	const id = $derived(Number(page.params.id));
	async function load() {
		try {
			order = await getLaboratoryOrder(id);
			if (order.results.length)
				results = order.results.map((r) => ({
					parameter: r.parameter,
					value: r.value,
					unit: r.unit,
					referenceMin: r.referenceMin,
					referenceMax: r.referenceMax,
					referenceText: r.referenceText,
					criticalMin: null,
					criticalMax: null,
					comment: r.comment
				}));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		}
	}
	async function act(fn: () => Promise<LaboratoryOrder>) {
		busy = true;
		error = '';
		try {
			order = await fn();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Opération impossible';
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		const token = localStorage.getItem('medcore_token');
		if (token) {
			try {
				claims = jwtDecode(token);
			} catch {
				claims = null;
			}
		}
		void load();
	});
</script>

{#if !order}<p class="p-10 text-center">Chargement...</p>{:else}<div class="space-y-6">
		<a href={resolve('/laboratory')} class="text-sm font-bold text-violet-700">← Retour à la file</a
		>
		<header class="rounded-2xl border bg-white p-6">
			<div class="flex flex-wrap justify-between gap-3">
				<div>
					<p class="text-sm font-bold text-violet-700">{order.requestNumber}</p>
					<h1 class="text-2xl font-black">{order.examName || 'Demande de laboratoire'}</h1>
					<p class="text-slate-500">
						{order.patientName} ({order.patientCode}) · {order.service || '—'} · {order.prescriber ||
							'—'} · Consultation #{order.consultationId}
					</p>
					<p class="mt-1 text-sm font-bold text-slate-600">Priorité : {order.priority}</p>
				</div>
				<span class="h-fit rounded-full bg-violet-50 px-4 py-2 font-bold text-violet-700"
					>{laboratoryStatusLabel(order.status)}</span
				>
			</div>
		</header>
		<AuthorizationStatus
			patientId={order.patientId}
			referenceType="LABORATORY"
			referenceId={order.id}
			service={order.service}
		/>
		{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
		{#if order.sample}
			<section class="rounded-2xl border bg-white p-6">
				<h2 class="text-lg font-black">Prélèvement</h2>
				<div class="mt-3 grid gap-3 text-sm md:grid-cols-4">
					<p><b>Identifiant</b><br />{order.sample.sampleIdentifier}</p>
					<p><b>Type</b><br />{order.sample.sampleType}</p>
					<p>
						<b>Date</b><br />{new Intl.DateTimeFormat('fr-FR', {
							dateStyle: 'medium',
							timeStyle: 'short'
						}).format(new Date(order.sample.collectedAt))}
					</p>
					<p><b>Commentaire</b><br />{order.sample.comment || '—'}</p>
				</div>
			</section>
		{/if}
		{#if canCollect && order.status === 'ORDERED'}
			<button
				disabled={busy}
				onclick={() => act(() => prepareLaboratorySample(id))}
				class="rounded-xl bg-violet-700 px-5 py-3 font-bold text-white"
				>Préparer le prélèvement</button
			>
		{/if}
		{#if canCollect && order.status === 'SAMPLE_PENDING'}<section
				class="rounded-2xl border bg-white p-6"
			>
				<h2 class="text-lg font-black">Prélèvement</h2>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					<select bind:value={sampleType} class="rounded-xl border p-3">
						{#each laboratorySampleTypes as type (type)}<option value={type}>{type}</option>{/each}
					</select><input
						bind:value={sampleComment}
						placeholder="Commentaire (facultatif)"
						class="rounded-xl border p-3"
					/>
				</div>
				<button
					disabled={busy}
					onclick={() =>
						act(() => collectLaboratorySample(id, { sampleType, comment: sampleComment }))}
					class="mt-4 rounded-xl bg-violet-700 px-5 py-3 font-bold text-white"
					>Enregistrer le prélèvement</button
				>
			</section>{/if}
		{#if canProcess && order.status === 'SAMPLE_COLLECTED'}<button
				disabled={busy}
				onclick={() => act(() => startLaboratoryAnalysis(id))}
				class="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Démarrer l’analyse</button
			>{/if}
		{#if canWrite && (order.status === 'IN_PROGRESS' || order.status === 'RESULT_ENTERED')}<section
				class="rounded-2xl border bg-white p-6"
			>
				<h2 class="text-lg font-black">Résultats structurés</h2>
				{#each results as result, i (i)}<div class="mt-4 grid gap-2 md:grid-cols-7">
						<input
							bind:value={result.parameter}
							placeholder="Paramètre"
							class="rounded-lg border p-2"
						/><input
							bind:value={result.value}
							placeholder="Valeur"
							class="rounded-lg border p-2"
						/><input
							bind:value={result.unit}
							placeholder="Unité"
							class="rounded-lg border p-2"
						/><input
							type="number"
							bind:value={result.referenceMin}
							placeholder="Min"
							class="rounded-lg border p-2"
						/><input
							type="number"
							bind:value={result.referenceMax}
							placeholder="Max"
							class="rounded-lg border p-2"
						/><input
							bind:value={result.referenceText}
							placeholder="Référence texte"
							class="rounded-lg border p-2"
						/><span class="rounded-lg bg-slate-50 p-2 text-center font-bold"
							>{computeLaboratoryFlag(result)}</span
						>
					</div>{/each}
				<div class="mt-4 flex gap-3">
					<button
						onclick={() =>
							(results = [
								...results,
								{
									parameter: '',
									value: '',
									unit: '',
									referenceMin: null,
									referenceMax: null,
									referenceText: '',
									criticalMin: null,
									criticalMax: null,
									comment: ''
								}
							])}
						class="rounded-xl border px-4 py-2 font-bold">Ajouter un paramètre</button
					><button
						disabled={busy}
						onclick={() => act(() => enterLaboratoryResults(id, results))}
						class="rounded-xl bg-violet-700 px-5 py-2 font-bold text-white">Enregistrer</button
					>{#if canValidate && order.status === 'RESULT_ENTERED'}<button
							disabled={busy}
							onclick={() => act(() => validateLaboratoryOrder(id))}
							class="rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white"
							>Valider définitivement</button
						>{/if}
				</div>
			</section>{/if}
		{#if order.status === 'VALIDATED'}<section
				class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
			>
				<h2 class="font-black text-emerald-900">Résultat validé — lecture seule</h2>
				<p class="mt-2 text-sm text-emerald-800">
					Validé le {order.validatedAt
						? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
								new Date(order.validatedAt)
							)
						: '—'} · utilisateur #{order.validatedBy ?? '—'}
				</p>
				{#each order.results as r (r.id)}<p class="mt-3">
						<b>{r.parameter}</b> : {r.value}
						{r.unit} <span class="ml-2 font-bold">{r.flag}</span>
						{#if r.referenceText}<small class="ml-2 text-emerald-700"
								>Référence : {r.referenceText}</small
							>{/if}
						{#if r.comment}<small class="mt-1 block text-emerald-700">{r.comment}</small>{/if}
					</p>{/each}
			</section>{/if}
		{#if canCancel && order.status !== 'VALIDATED' && order.status !== 'CANCELLED'}<button
				onclick={() => {
					const reason = prompt('Motif d’annulation');
					if (reason) act(() => cancelLaboratoryOrder(id, reason));
				}}
				class="text-sm font-bold text-red-600">Annuler la demande</button
			>{/if}
	</div>{/if}
