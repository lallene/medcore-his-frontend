<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FileCheck2 } from 'lucide-svelte';
	import { jwtDecode } from 'jwt-decode';
	import { getInsuranceAuthorizationForAct, getPatientCoverages } from '$lib/api/insurance';
	import { authorizationActPresentation, authorizationStatusLabel } from './authorization-state';
	import type { InsuranceAuthorization, PatientCoverage } from '$lib/types/insurance';
	type Props = { patientId: number; referenceType: string; referenceId: number; service?: string };
	let { patientId, referenceType, referenceId, service = '' }: Props = $props();
	let item = $state<InsuranceAuthorization | null>(null),
		coverage = $state<PatientCoverage | null>(null),
		matchType = $state<'NONE' | 'DIRECT' | 'COVERED'>('NONE');
	let permissions = $state<string[]>([]);
	const presentation = $derived(authorizationActPresentation(matchType));
	const canCreate = $derived(
		permissions.includes('*') || permissions.includes('insurance.authorization.create')
	);
	const canRead = $derived(
		permissions.includes('*') || permissions.includes('insurance.authorization.read')
	);
	async function load() {
		try {
			const c = await getPatientCoverages(patientId);
			coverage = c.find((i) => i.isPrincipal) ?? c[0] ?? null;
			if (!coverage) return;
			const match = await getInsuranceAuthorizationForAct({
				patientId,
				coverageId: coverage.id,
				referenceType,
				referenceId
			});
			matchType = match.matchType;
			item = match.authorization ?? null;
		} catch {
			item = null;
			coverage = null;
			matchType = 'NONE';
		}
	}
	function open() {
		if (item) {
			void goto(resolve(`/insurance/authorizations?authorizationId=${item.id}`));
			return;
		}
		const query = new URLSearchParams({
			patientId: String(patientId),
			referenceType,
			referenceId: String(referenceId),
			service
		});
		void goto(resolve(`/insurance/authorizations?${query}`));
	}
	onMount(() => {
		const token = localStorage.getItem('medcore_token');
		if (token)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(token).permissions ?? [];
			} catch {
				permissions = [];
			}
		void load();
	});
</script>

<section class="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="flex items-center gap-2 text-xs font-black uppercase text-violet-700">
				<FileCheck2 size={16} /> Assurance / PEC de cet acte
			</p>
			{#if coverage}<p class="mt-1 text-sm">
					{coverage.companyName} · contrat <b>{coverage.coverageRate}%</b> informatif
				</p>{:else}<p class="mt-1 text-sm text-slate-500">
					Aucune couverture active
				</p>{/if}{#if item}<p class="mt-2 font-black">
					{item.authorizationNumber} · {authorizationStatusLabel[item.status]}
				</p>
				<p class="text-sm">
					Taux accordé : {item.approvedRate == null ? '—' : `${item.approvedRate}%`} · Assurance : {item.insuranceAmount?.toLocaleString(
						'fr-FR'
					) ?? '—'} FCFA · Patient : {item.patientAmount?.toLocaleString('fr-FR') ?? '—'} FCFA
				</p>
				{#if matchType === 'COVERED'}<p class="mt-1 text-sm font-bold text-violet-700">
						Couvert par {item.authorizationNumber} · acte principal : {item.referenceLabel}
					</p>{/if}{:else}<p class="mt-2 text-sm font-bold">{presentation.label}</p>{/if}
		</div>
		{#if coverage && canRead && (!presentation.canCreate || canCreate)}<button
				onclick={open}
				class="rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white"
				>{presentation.canCreate ? 'Créer une demande PEC' : 'Voir la PEC'}</button
			>{/if}
	</div>
</section>
