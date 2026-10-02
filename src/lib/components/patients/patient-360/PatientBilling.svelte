<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { ReceiptText } from 'lucide-svelte';
	import { listPatientInvoices } from '$lib/api/billing';
	import { listPatientReceivables } from '$lib/api/receivables';
	import { listPatientInsuranceReceivables } from '$lib/api/insurance-receivables';
	import { statusLabel } from '$lib/components/receivables/state';
	import type { ReceivableItem } from '$lib/types/receivables';
	import type { InsuranceReceivable } from '$lib/types/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import type { Invoice } from '$lib/types/billing';
	import type { Patient } from '$lib/types/patient';
	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { Hospitalization } from '$lib/types/hospitalization';
	import { isAccessDeniedError } from '$lib/rbac/permissions';
	import { errorMessageFromUnknown } from './patient-360-load';

	type BranchUi = {
		loading: boolean;
		denied: boolean;
		error: string;
	};

	interface Props {
		patient: Patient;
		consultations: PatientConsultation[];
		hospitalizations: Hospitalization[];
		canReadInvoices?: boolean;
		canReadReceivables?: boolean;
		canReadInsuranceReceivables?: boolean;
	}
	let {
		patient,
		consultations,
		hospitalizations,
		canReadInvoices = false,
		canReadReceivables = false,
		canReadInsuranceReceivables = false
	}: Props = $props();

	let invoices = $state<Invoice[]>([]);
	let receivables = $state<ReceivableItem[]>([]);
	let insuranceReceivables = $state<InsuranceReceivable[]>([]);

	let invoicesBranch = $state<BranchUi>({ loading: false, denied: false, error: '' });
	let receivablesBranch = $state<BranchUi>({ loading: false, denied: false, error: '' });
	let insuranceBranch = $state<BranchUi>({ loading: false, denied: false, error: '' });

	let loadGeneration = 0;

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

	const anyBranchLoading = $derived(
		invoicesBranch.loading || receivablesBranch.loading || insuranceBranch.loading
	);

	function isCurrent(token: number): boolean {
		return token === loadGeneration;
	}

	function resetBranch(): BranchUi {
		return { loading: false, denied: false, error: '' };
	}

	$effect(() => {
		if (!browser) return;

		const pid = patient.id;
		const wantInvoices = canReadInvoices;
		const wantReceivables = canReadReceivables;
		const wantInsurance = canReadInsuranceReceivables;

		loadGeneration += 1;
		const token = loadGeneration;

		invoices = [];
		receivables = [];
		insuranceReceivables = [];
		invoicesBranch = { ...resetBranch(), loading: wantInvoices };
		receivablesBranch = { ...resetBranch(), loading: wantReceivables };
		insuranceBranch = { ...resetBranch(), loading: wantInsurance };

		const tasks: Array<Promise<void>> = [];

		if (wantInvoices) {
			tasks.push(
				listPatientInvoices(pid)
					.then((value) => {
						if (!isCurrent(token)) return;
						invoices = value;
					})
					.catch((e: unknown) => {
						if (!isCurrent(token)) return;
						if (isAccessDeniedError(e)) {
							invoicesBranch = { loading: false, denied: true, error: '' };
						} else {
							invoicesBranch = {
								loading: false,
								denied: false,
								error: errorMessageFromUnknown(e, 'Factures indisponibles.')
							};
						}
					})
					.finally(() => {
						if (!isCurrent(token)) return;
						if (invoicesBranch.loading) {
							invoicesBranch = { ...invoicesBranch, loading: false };
						}
					})
			);
		}

		if (wantReceivables) {
			tasks.push(
				listPatientReceivables(pid)
					.then((page) => {
						if (!isCurrent(token)) return;
						receivables = page.items;
					})
					.catch((e: unknown) => {
						if (!isCurrent(token)) return;
						if (isAccessDeniedError(e)) {
							receivablesBranch = { loading: false, denied: true, error: '' };
						} else {
							receivablesBranch = {
								loading: false,
								denied: false,
								error: errorMessageFromUnknown(e, 'Créances indisponibles.')
							};
						}
					})
					.finally(() => {
						if (!isCurrent(token)) return;
						if (receivablesBranch.loading) {
							receivablesBranch = { ...receivablesBranch, loading: false };
						}
					})
			);
		}

		if (wantInsurance) {
			tasks.push(
				listPatientInsuranceReceivables(pid)
					.then((page) => {
						if (!isCurrent(token)) return;
						insuranceReceivables = page.items;
					})
					.catch((e: unknown) => {
						if (!isCurrent(token)) return;
						if (isAccessDeniedError(e)) {
							insuranceBranch = { loading: false, denied: true, error: '' };
						} else {
							insuranceBranch = {
								loading: false,
								denied: false,
								error: errorMessageFromUnknown(e, 'Créances assurance indisponibles.')
							};
						}
					})
					.finally(() => {
						if (!isCurrent(token)) return;
						if (insuranceBranch.loading) {
							insuranceBranch = { ...insuranceBranch, loading: false };
						}
					})
			);
		}

		void Promise.allSettled(tasks);
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
		{#if canReadInvoices}
			<button
				class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
				data-testid="patient-billing-open"
				onclick={() => goto(resolve(`/billing?patientId=${patient.id}`))}
				><ReceiptText size={16} class="inline" /> Ouvrir la facturation</button
			>
		{/if}
	</header>
	{#if canReadInvoices}
		{#if invoicesBranch.denied}
			<p
				class="rounded-xl bg-red-50 p-3 text-red-700"
				data-testid="patient-360-billing-invoices-denied"
			>
				Accès refusé aux factures.
			</p>
		{:else if invoicesBranch.error}
			<p
				class="rounded-xl bg-red-50 p-3 text-red-700"
				data-testid="patient-360-billing-invoices-error"
			>
				{invoicesBranch.error}
			</p>
		{/if}
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{#each [['Brut', totals.gross], ['Assurance', totals.insurance], ['Part patient', totals.patient], ['Payé', totals.paid], ['Reste', totals.balance]] as item (item[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<p class="text-xs font-bold uppercase text-slate-500">{item[0]}</p>
					<p class="mt-2 text-xl font-black">{formatXOF(Number(item[1]))}</p>
				</div>{/each}
		</div>
	{/if}
	{#if canReadReceivables}
		<section class="rounded-2xl border bg-rose-50 p-4">
			<h3 class="font-black text-rose-900">Créances patient</h3>
			{#if receivablesBranch.denied}
				<p class="mt-2 text-sm text-red-700" data-testid="patient-360-billing-receivables-denied">
					Accès refusé aux créances patient.
				</p>
			{:else if receivablesBranch.error}
				<p class="mt-2 text-sm text-red-700" data-testid="patient-360-billing-receivables-error">
					{receivablesBranch.error}
				</p>
			{:else}
				<p class="text-sm text-rose-700">
					La part assurance est exclue du reste dû par le patient.
				</p>
				<div class="mt-3 grid gap-2 md:grid-cols-3">
					<p>Total part patient <b>{formatXOF(totals.patient)}</b></p>
					<p>Total payé <b>{formatXOF(totals.paid)}</b></p>
					<p>
						Reste à payer <b
							>{formatXOF(receivables.reduce((sum, r) => sum + r.patientBalance, 0))}</b
						>
					</p>
				</div>
				{#each receivables as debt (debt.invoiceId)}<a
						href={resolve(`/receivables/${debt.invoiceId}`)}
						class="mt-2 grid gap-2 rounded-xl bg-white p-3 text-sm md:grid-cols-5"
						><b>{debt.invoiceNumber}</b><span>Patient {formatXOF(debt.patientDue)}</span><span
							>Payé {formatXOF(debt.patientPaid)}</span
						><span>Reste {formatXOF(debt.patientBalance)}</span><span
							>{statusLabel[debt.status]} · {debt.dueDate
								? new Date(debt.dueDate).toLocaleDateString('fr-FR')
								: 'sans échéance'}</span
						></a
					>{:else}<p class="mt-3 text-sm">Aucune créance patient active.</p>{/each}
			{/if}
		</section>
	{/if}
	{#if canReadInsuranceReceivables}
		<section class="rounded-2xl border bg-indigo-50 p-4">
			<h3 class="font-black text-indigo-900">Situation assurance</h3>
			{#if insuranceBranch.denied}
				<p class="mt-2 text-sm text-red-700" data-testid="patient-360-billing-insurance-denied">
					Accès refusé aux créances assurance.
				</p>
			{:else if insuranceBranch.error}
				<p class="mt-2 text-sm text-red-700" data-testid="patient-360-billing-insurance-error">
					{insuranceBranch.error}
				</p>
			{:else}
				<p class="text-sm text-indigo-700">Circuit assureur séparé des paiements patient.</p>
				<div class="mt-3 grid gap-2 md:grid-cols-3">
					<p>
						Part assurance <b
							>{formatXOF(insuranceReceivables.reduce((s, r) => s + r.insuranceDue, 0))}</b
						>
					</p>
					<p>
						Réglé par assurance <b
							>{formatXOF(insuranceReceivables.reduce((s, r) => s + r.insurancePaid, 0))}</b
						>
					</p>
					<p>
						Reste assurance <b
							>{formatXOF(insuranceReceivables.reduce((s, r) => s + r.insuranceBalance, 0))}</b
						>
					</p>
				</div>
			{/if}
		</section>
	{/if}
	{#if canReadInvoices}
		<div class="overflow-x-auto rounded-2xl border bg-white">
			{#if invoicesBranch.loading && anyBranchLoading}<p class="p-8 text-center">
					Chargement…
				</p>{:else if !invoicesBranch.denied && !invoicesBranch.error}<table
					class="w-full text-left text-sm"
				>
					<thead class="bg-slate-50"
						><tr
							><th class="p-3">Facture</th><th>Date</th><th>Brut</th><th>Assurance</th><th
								>Patient</th
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
	{/if}
</div>
