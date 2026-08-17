<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ReceiptText } from 'lucide-svelte';
	import { listPatientInvoices } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import type { Invoice } from '$lib/types/billing';
	import type { Patient } from '$lib/types/patient';
	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { Hospitalization } from '$lib/types/hospitalization';
	interface Props {
		patient: Patient;
		consultations: PatientConsultation[];
		hospitalizations: Hospitalization[];
	}
	let { patient, consultations, hospitalizations }: Props = $props();
	let invoices = $state<Invoice[]>([]);
	let loading = $state(true);
	let error = $state('');
	const totals = $derived(
		invoices
			.filter((x) => x.status !== 'CANCELLED')
			.reduce(
				(a, x) => ({
					gross: a.gross + x.grossAmount,
					insurance: a.insurance + x.insuranceAmount,
					patient: a.patient + x.patientAmount,
					paid: a.paid + x.paidAmount,
					balance: a.balance + x.balanceAmount
				}),
				{ gross: 0, insurance: 0, patient: 0, paid: 0, balance: 0 }
			)
	);
	onMount(async () => {
		try {
			invoices = await listPatientInvoices(patient.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Historique indisponible';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-orange-600">
				Situation financière
			</p>
			<h2 class="text-2xl font-black">Facturation</h2>
			<p class="text-sm text-slate-500">
				Factures persistées · {consultations.length} consultation(s) · {hospitalizations.length} séjour(s).
			</p>
		</div>
		<button
			class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
			onclick={() => goto(resolve('/billing'))}
			><ReceiptText size={16} class="inline" /> Ouvrir la facturation</button
		>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		{#each [['Brut', totals.gross], ['Assurance', totals.insurance], ['Part patient', totals.patient], ['Payé', totals.paid], ['Reste', totals.balance]] as item (item[0])}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-bold uppercase text-slate-500">{item[0]}</p>
				<p class="mt-2 text-xl font-black">{formatXOF(Number(item[1]))}</p>
			</div>{/each}
	</div>
	<div class="overflow-x-auto rounded-2xl border bg-white">
		{#if loading}<p class="p-8 text-center">Chargement…</p>{:else}<table
				class="w-full text-left text-sm"
			>
				<thead class="bg-slate-50"
					><tr
						><th class="p-3">Facture</th><th>Date</th><th>Brut</th><th>Assurance</th><th>Patient</th
						><th>Payé</th><th>Reste</th><th>Statut</th></tr
					></thead
				><tbody
					>{#each invoices as x (x.id)}<tr class="border-t"
							><td class="p-3"
								><a class="font-black text-blue-700" href={resolve(`/billing/${x.id}`)}
									>{x.number}</a
								></td
							><td>{new Date(x.createdAt).toLocaleDateString('fr-FR')}</td><td
								>{formatXOF(x.grossAmount)}</td
							><td>{formatXOF(x.insuranceAmount)}</td><td>{formatXOF(x.patientAmount)}</td><td
								>{formatXOF(x.paidAmount)}</td
							><td>{formatXOF(x.balanceAmount)}</td><td>{x.status}</td></tr
						>{:else}<tr
							><td colspan="8" class="p-10 text-center text-slate-500"
								>Aucune facture pour ce patient.</td
							></tr
						>{/each}</tbody
				>
			</table>{/if}
	</div>
</div>
