<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getRefundVoucher } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		REFUND_VOUCHER_PRINT_LABEL,
		refundMethodLabel,
		refundReasonLabel
	} from '$lib/components/billing/refund';
	import type { RefundVoucher } from '$lib/types/billing';

	let voucher = $state<RefundVoucher | null>(null);
	let error = $state('');
	let duplicate = $state(false);

	onMount(async () => {
		try {
			voucher = await getRefundVoucher(Number(page.params.id));
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Bon indisponible';
		}
	});

	function reprint() {
		duplicate = true;
		setTimeout(() => print(), 50);
	}

	function fmt(raw?: string | null) {
		return raw ? new Date(raw).toLocaleString('fr-FR') : '—';
	}
</script>

<svelte:head>
	<title>{voucher ? `Bon ${voucher.refundNumber}` : 'Bon de remboursement'} | MedCore HIS</title>
</svelte:head>

{#if error}
	<p class="p-8 font-bold text-amber-900" data-testid="refund-voucher-error" role="alert">
		{error}
	</p>
{:else if voucher}
	<div
		class="mx-auto max-w-3xl space-y-8 p-6 print:max-w-none print:p-0"
		data-testid="refund-voucher-page"
	>
		<div class="flex flex-wrap gap-2 print:hidden">
			<a class="rounded-xl border px-4 py-2 font-bold" href={resolve(`/billing/refunds`)}>Retour</a>
			<button
				type="button"
				class="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
				data-testid="refund-voucher-print"
				onclick={reprint}>{REFUND_VOUCHER_PRINT_LABEL}</button
			>
		</div>

		{#each voucher.copyLabels as copyLabel, i (copyLabel)}
			<section
				class="refund-voucher-copy break-inside-avoid rounded-none border-2 border-slate-800 p-6"
				data-testid={`refund-voucher-copy-${i}`}
				data-copy={copyLabel}
			>
				<header class="text-center">
					<p class="text-xs font-bold uppercase tracking-wide text-slate-600">{copyLabel}</p>
					<h1 class="mt-1 text-2xl font-black" data-testid="refund-voucher-clinic">
						{voucher.clinicHeader}
					</h1>
					<h2 class="text-lg font-black">BON DE REMBOURSEMENT</h2>
					{#if duplicate}<p class="font-black text-red-700">DUPLICATA</p>{/if}
					<p class="mt-2 text-xl font-black" data-testid="refund-voucher-number">
						N° {voucher.refundNumber}
					</p>
				</header>

				<dl class="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-slate-500">Montant</dt>
					<dd class="font-black" data-testid="refund-voucher-amount">
						{formatXOF(voucher.amount)}
					</dd>
					<dt class="text-slate-500">Mode</dt>
					<dd class="font-bold" data-testid="refund-voucher-method">
						{refundMethodLabel(voucher.method)}
					</dd>
					<dt class="text-slate-500">Exécuté le</dt>
					<dd data-testid="refund-voucher-executed-at">{fmt(voucher.executedAt)}</dd>
					<dt class="text-slate-500">Patient</dt>
					<dd>
						{voucher.patientCode ? `${voucher.patientCode} — ` : ''}{voucher.patientName ||
							`#${voucher.patientId}`}
					</dd>
					<dt class="text-slate-500">Titulaire</dt>
					<dd>{voucher.holderDisplay} ({voucher.holderKind})</dd>
					<dt class="text-slate-500">Bénéficiaire</dt>
					<dd data-testid="refund-voucher-beneficiary">
						{voucher.beneficiaryDisplayName}{#if voucher.beneficiaryRelationship}
							· {voucher.beneficiaryRelationship}{/if}
					</dd>
					<dt class="text-slate-500">Motif</dt>
					<dd>{refundReasonLabel(voucher.reasonCode)}</dd>
					<dt class="text-slate-500">Autorisé par</dt>
					<dd>utilisateur #{voucher.approvedBy}</dd>
					<dt class="text-slate-500">Exécuté par</dt>
					<dd data-testid="refund-voucher-executor">utilisateur #{voucher.executedBy}</dd>
					{#if voucher.method === 'CASH'}
						<dt class="text-slate-500">Caisse</dt>
						<dd data-testid="refund-voucher-cash">
							{voucher.registerCode
								? `${voucher.registerCode} — ${voucher.registerName}`
								: voucher.cashRegisterId
									? `registre #${voucher.cashRegisterId}`
									: '—'}
							{#if voucher.cashSessionId}
								· session #{voucher.cashSessionId}{/if}
						</dd>
					{:else}
						<dt class="text-slate-500">Réf. externe</dt>
						<dd data-testid="refund-voucher-ext-ref">{voucher.externalReference || '—'}</dd>
						{#if voucher.beneficiaryRailRef}
							<dt class="text-slate-500">Compte / n°</dt>
							<dd>{voucher.beneficiaryRailRef}</dd>
						{/if}
					{/if}
					{#if voucher.holderConsentRef}
						<dt class="text-slate-500">Consentement</dt>
						<dd>{voucher.holderConsentRef}</dd>
					{/if}
					{#if voucher.clinicalAttestationRef}
						<dt class="text-slate-500">Attestation clinique</dt>
						<dd>{voucher.clinicalAttestationRef}</dd>
					{/if}
					{#if voucher.evidenceReference}
						<dt class="text-slate-500">Preuve</dt>
						<dd>{voucher.evidenceReference}</dd>
					{/if}
				</dl>

				<p class="mt-4 text-xs text-slate-600">{voucher.documentaryNote}</p>

				<div class="mt-10 grid grid-cols-2 gap-8 text-sm">
					{#each voucher.signatureZones as zone (zone)}
						<div class="border-t border-slate-800 pt-2" data-testid="refund-voucher-signature">
							<p class="font-bold">{zone}</p>
							<p class="mt-6 text-slate-500">Nom · Date · Mention « Reçu »</p>
						</div>
					{/each}
				</div>
			</section>
			{#if i === 0}
				<hr class="border-dashed border-slate-400 print:my-6" />
			{/if}
		{/each}
	</div>
{:else}
	<p class="p-8 text-slate-500">Chargement du bon…</p>
{/if}

<style>
	@media print {
		:global(aside),
		:global(nav),
		:global(header.site),
		:global(.print\:hidden) {
			display: none !important;
		}
		.refund-voucher-copy {
			page-break-inside: avoid;
		}
	}
</style>
