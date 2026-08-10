<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { BedDouble, Eye, Hospital, Plus } from 'lucide-svelte';
	import type { Hospitalization as HospitalizationRecord } from '$lib/types/hospitalization';
	import {
		deduplicateHospitalizations,
		hospitalizationStatusLabel
	} from '$lib/components/hospitalizations/hospitalization-state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	interface Props {
		patientId: number;
		hospitalizations: HospitalizationRecord[];
	}
	let { patientId, hospitalizations }: Props = $props();
	const items = $derived(deduplicateHospitalizations(hospitalizations));
	const activeCount = $derived(items.filter((item) => item.status === 'ADMITTED').length);
	const dischargedCount = $derived(items.filter((item) => item.status === 'DISCHARGED').length);
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-red-700">
				Séjours hospitaliers réels
			</p>
			<h2 class="mt-2 text-2xl font-black text-slate-900">Hospitalisations</h2>
			<p class="mt-1 text-sm text-slate-500">
				Admissions et sorties enregistrées dans le module Hospitalization.
			</p>
		</div>
		<Button onclick={() => goto(resolve(`/patients/${patientId}/consultations/create`))}
			><Plus size={16} />Nouvelle consultation</Button
		>
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-400">Total</p>
			<p class="mt-2 text-3xl font-black">{items.length}</p>
		</div>
		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-500">Admises</p>
			<p class="mt-2 text-3xl font-black text-blue-900">{activeCount}</p>
		</div>
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
			<p class="text-xs font-black uppercase text-emerald-500">Sorties</p>
			<p class="mt-2 text-3xl font-black text-emerald-900">{dischargedCount}</p>
		</div>
	</div>
	<Card title="Historique hospitalier" subtitle={`${items.length} séjour(s)`}
		>{#if items.length === 0}<div
				class="flex min-h-64 flex-col items-center justify-center text-center"
			>
				<Hospital size={30} class="text-red-700" />
				<h3 class="mt-4 text-xl font-black">Aucune hospitalisation réelle</h3>
				<p class="mt-2 text-sm text-slate-500">
					Une recommandation de consultation doit être transformée explicitement en admission.
				</p>
			</div>{:else}<div class="space-y-4">
				{#each items as item (item.id)}<article class="rounded-2xl border p-5">
						<div class="flex items-start justify-between gap-4">
							<div class="flex gap-4">
								<BedDouble class="text-red-700" />
								<div>
									<div class="flex flex-wrap gap-2">
										<h3 class="font-black">{item.admissionNumber}</h3>
										<span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold"
											>{hospitalizationStatusLabel(item.status)}</span
										>
									</div>
									<p class="mt-2 text-sm text-slate-600">
										{item.department || 'Service non renseigné'} · {item.hospitalizationType ||
											'Type non renseigné'}
									</p>
									<p class="mt-2 text-sm font-semibold">
										{item.admissionReason || 'Motif non renseigné'}
									</p>
									<p class="mt-2 text-xs text-slate-400">
										Consultation #{item.sourceConsultationId}
									</p>
								</div>
							</div>
							<button
								aria-label="Ouvrir"
								onclick={() => goto(resolve(`/hospitalizations/${item.id}`))}
								class="text-[#0E4C92]"><Eye size={18} /></button
							>
						</div>
					</article>{/each}
			</div>{/if}</Card
	>
</div>
