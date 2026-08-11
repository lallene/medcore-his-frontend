<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FileCheck2 } from 'lucide-svelte';
	import { getInsuranceAuthorizations, getPatientCoverages } from '$lib/api/insurance';
	import { authorizationStatusLabel } from './authorization-state';
	import type { InsuranceAuthorization, PatientCoverage } from '$lib/types/insurance';
	type Props = { patientId: number; referenceType: string; referenceId: number; service?: string };
	let { patientId, referenceType, referenceId, service = '' }: Props = $props();
	let item = $state<InsuranceAuthorization | null>(null),
		coverage = $state<PatientCoverage | null>(null);
	async function load() {
		try {
			const [a, c] = await Promise.all([
				getInsuranceAuthorizations({ patientId, referenceType, pageSize: 100 }),
				getPatientCoverages(patientId)
			]);
			item = a.items.find((i) => i.referenceId === referenceId) ?? null;
			coverage = c.find((i) => i.isPrincipal) ?? c[0] ?? null;
		} catch {
			item = null;
			coverage = null;
		}
	}
	function open() {
		const query = new URLSearchParams({
			patientId: String(patientId),
			referenceType,
			referenceId: String(referenceId),
			service
		});
		void goto(resolve(`/insurance/authorizations?${query}`));
	}
	onMount(load);
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
				</p>{:else}<p class="mt-2 text-sm font-bold">Aucune PEC pour cet acte</p>{/if}
		</div>
		{#if coverage}<button
				onclick={open}
				class="rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white"
				>{item ? 'Ouvrir la PEC' : 'Demander une PEC'}</button
			>{/if}
	</div>
</section>
