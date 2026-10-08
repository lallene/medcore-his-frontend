<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		approveRefund,
		cancelRefund,
		executeRefund,
		getCreditSummary,
		getRefund,
		listPatientCreditBalances,
		listRefunds,
		rejectRefund,
		requestRefund
	} from '$lib/api/billing';
	import { currentSession } from '$lib/api/cash';
	import {
		beginPaymentCommand,
		completePaymentCommandError,
		completePaymentCommandSuccess,
		createPaymentCommandState,
		isPaymentSubmitDisabled
	} from '$lib/components/billing/payment-command';
	import { can, formatXOF } from '$lib/components/billing/state';
	import { CREDIT_READ_PERMISSION } from '$lib/components/billing/credit-application';
	import {
		buildRefundExecutePayload,
		buildRefundPayload,
		canRequestRefund,
		canReadRefunds,
		canReadRefundReport,
		canShowApproveAction,
		canShowCancelAction,
		canShowExecuteAction,
		canShowRefundVoucher,
		canShowRejectAction,
		REFUND_REPORT_LINK_LABEL,
		REFUND_VOUCHER_PRINT_LABEL,
		classifyRefundError,
		createRefundExecuteFormState,
		createRefundFormState,
		isCashRefundMethod,
		isExternalRefundMethod,
		isOwnRefundApproval,
		isOwnRefundRequest,
		reasonRequiresAttestation,
		reasonRequiresComment,
		reasonRequiresManagerialApproval,
		resolveExecuteMethod,
		REFUND_APPROVE_ACTION_LABEL,
		REFUND_CANCEL_ACTION_LABEL,
		REFUND_EXECUTE_ACTION_LABEL,
		REFUND_EXECUTE_CASH_NOTICE,
		REFUND_EXECUTE_EXTERNAL_ACTION_LABEL,
		REFUND_EXECUTE_EXTERNAL_NOTICE,
		REFUND_LEDGER_LABEL,
		REFUND_NO_PAYOUT_NOTICE,
		REFUND_PAGE_TITLE,
		REFUND_REJECT_ACTION_LABEL,
		REFUND_REQUEST_ACTION_LABEL,
		REFUND_REQUEST_SECTION,
		REFUND_RESERVED_LABEL,
		REFUND_SPENDABLE_LABEL,
		refundBeneficiaryModeLabel,
		refundBeneficiaryModeOptions,
		refundHoldsReservation,
		refundMethodLabel,
		refundMethodOptions,
		refundReasonFilterOptions,
		refundReasonLabel,
		refundReasonOptions,
		refundStatusFilterOptions,
		refundStatusLabel,
		refundStatusTone,
		validateRefundApproval,
		validateRefundDecisionReason,
		validateRefundExecuteForm,
		validateRefundForm,
		type RefundUxError
	} from '$lib/components/billing/refund';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import { isAccessDeniedError } from '$lib/rbac/permissions';
	import type { CreditSummary, Refund } from '$lib/types/billing';
	import type { SessionSummary } from '$lib/types/cash';

	type DecisionMode = 'approve' | 'reject' | 'cancel';

	let permissions = $state<string[]>([]);
	let userId = $state<number | null>(null);

	let refunds = $state<Refund[]>([]);
	let listPageNum = $state(1);
	let listLimit = $state(10);
	let listTotalPages = $state(1);
	let listTotal = $state(0);
	let loadingList = $state(true);
	let listError = $state('');
	let accessDenied = $state(false);

	let filterStatus = $state('');
	let filterReason = $state('');
	let filterPatientId = $state('');
	let filterHolderId = $state('');
	let filterDateFrom = $state('');
	let filterDateTo = $state('');
	let filterRefundNumber = $state('');

	let form = $state(createRefundFormState());
	let requestCmd = $state(createPaymentCommandState());
	let requestError = $state<RefundUxError | null>(null);
	let formError = $state('');
	let successMessage = $state('');

	let balances = $state<CreditSummary[]>([]);
	let balancesPatientId = $state(0);
	let balancesLoading = $state(false);
	let balancesError = $state('');

	let selected = $state<Refund | null>(null);
	let selectedSummary = $state<CreditSummary | null>(null);
	let detailError = $state('');
	let decisionMode = $state<DecisionMode | null>(null);
	let decisionReason = $state('');
	let decisionManagerial = $state(false);
	let decisionBusy = $state(false);
	let decisionError = $state('');

	let executeOpen = $state(false);
	let executeForm = $state(createRefundExecuteFormState());
	let executeCmd = $state(createPaymentCommandState());
	let executeError = $state<RefundUxError | null>(null);
	let openCashSession = $state<SessionSummary | null>(null);
	let cashSessionLoading = $state(false);
	let cashSessionError = $state('');

	const canRead = $derived(canReadRefunds(permissions));
	const showRequest = $derived(canRequestRefund(permissions));
	const canReadCredit = $derived(can(permissions, CREDIT_READ_PERMISSION));
	const otherReason = $derived(reasonRequiresComment(form.reasonCode));
	const needsAttestation = $derived(reasonRequiresAttestation(form.reasonCode));
	const isAlternate = $derived(form.beneficiaryMode === 'ALTERNATE');
	const ownSelected = $derived(selected ? isOwnRefundRequest(selected, userId) : false);
	const ownApproval = $derived(selected ? isOwnRefundApproval(selected, userId) : false);
	const executeMethod = $derived(
		selected ? resolveExecuteMethod(selected, executeForm.method) : ''
	);
	const executeIsCash = $derived(isCashRefundMethod(executeMethod));
	const executeIsExternal = $derived(isExternalRefundMethod(executeMethod));
	const methodNeedsPick = $derived(
		!!selected && (!selected.intendedMethod || selected.intendedMethod === 'UNSPECIFIED')
	);

	function readClaims() {
		const raw = localStorage.getItem('medcore_token');
		if (!raw) return;
		try {
			const claims = jwtDecode<{ permissions?: string[]; userId?: number }>(raw);
			permissions = claims.permissions ?? [];
			userId = typeof claims.userId === 'number' ? claims.userId : null;
		} catch {
			permissions = [];
			userId = null;
		}
	}

	async function loadList(pageNum = listPageNum) {
		if (!canRead) return;
		loadingList = true;
		listError = '';
		try {
			const params: Record<string, string | number> = { page: pageNum, limit: listLimit };
			if (filterStatus) params.status = filterStatus;
			if (filterReason) params.reasonCode = filterReason;
			const patient = Number(filterPatientId);
			if (patient > 0) params.patientId = patient;
			const holder = Number(filterHolderId);
			if (holder > 0) params.holderPartyId = holder;
			if (filterDateFrom) params.dateFrom = filterDateFrom;
			if (filterDateTo) params.dateTo = filterDateTo;
			const rmb = filterRefundNumber.trim().toUpperCase();
			if (rmb) params.refundNumber = rmb;
			const res = await listRefunds(params);
			refunds = res.data;
			listPageNum = res.page;
			listTotalPages = res.totalPages;
			listTotal = res.total;
		} catch (e: unknown) {
			refunds = [];
			if (isAccessDeniedError(e)) accessDenied = true;
			else listError = e instanceof Error ? e.message : 'Liste indisponible';
		} finally {
			loadingList = false;
		}
	}

	function applyFilters() {
		listPageNum = 1;
		void loadList(1);
	}

	async function loadBalances(patientId: number) {
		if (!canReadCredit || patientId <= 0) return;
		balancesLoading = true;
		balancesError = '';
		try {
			balances = await listPatientCreditBalances(patientId);
			balancesPatientId = patientId;
		} catch (e: unknown) {
			balances = [];
			balancesError = isAccessDeniedError(e)
				? 'Consultation des soldes non autorisée.'
				: 'Soldes indisponibles.';
		} finally {
			balancesLoading = false;
		}
	}

	function onLoadBalances() {
		void loadBalances(Number(form.patientId));
	}

	function pickHolder(holderPartyId: number) {
		form.holderPartyId = String(holderPartyId);
	}

	async function refreshSelectedSummary(refund: Refund) {
		selectedSummary = null;
		if (!canReadCredit) return;
		try {
			selectedSummary = await getCreditSummary(refund.holderPartyId, refund.patientId);
		} catch {
			selectedSummary = null;
		}
	}

	async function openDetail(id: number) {
		detailError = '';
		resetDecision();
		try {
			selected = await getRefund(id);
			await refreshSelectedSummary(selected);
		} catch (e: unknown) {
			selected = null;
			detailError = classifyRefundError(e).message;
		}
	}

	function closeDetail() {
		selected = null;
		selectedSummary = null;
		detailError = '';
		resetDecision();
		resetExecute();
	}

	function resetDecision() {
		decisionMode = null;
		decisionReason = '';
		decisionManagerial = false;
		decisionBusy = false;
		decisionError = '';
	}

	function resetExecute() {
		executeOpen = false;
		executeForm = createRefundExecuteFormState();
		executeCmd = createPaymentCommandState();
		executeError = null;
		openCashSession = null;
		cashSessionError = '';
		cashSessionLoading = false;
	}

	function startDecision(mode: DecisionMode) {
		resetExecute();
		decisionMode = mode;
		decisionReason = '';
		decisionManagerial = false;
		decisionError = '';
	}

	async function loadOpenCashSession() {
		cashSessionLoading = true;
		cashSessionError = '';
		try {
			openCashSession = await currentSession();
			if (!openCashSession || openCashSession.session.status !== 'OPEN') {
				openCashSession = null;
				cashSessionError = 'Aucune session de caisse ouverte pour votre compte.';
			}
		} catch (e: unknown) {
			openCashSession = null;
			cashSessionError = classifyRefundError(e).message;
		} finally {
			cashSessionLoading = false;
		}
	}

	async function startExecute() {
		if (!selected) return;
		resetDecision();
		executeOpen = true;
		executeError = null;
		executeForm = createRefundExecuteFormState({
			method:
				selected.intendedMethod && selected.intendedMethod !== 'UNSPECIFIED'
					? selected.intendedMethod
					: ''
		});
		executeCmd = createPaymentCommandState();
		const method = resolveExecuteMethod(selected, executeForm.method);
		if (isCashRefundMethod(method) || !method) {
			await loadOpenCashSession();
		}
	}

	async function submitRequest() {
		if (isPaymentSubmitDisabled(requestCmd)) return;
		successMessage = '';
		requestError = null;
		const invalid = validateRefundForm(form);
		if (invalid) {
			formError = invalid;
			return;
		}
		formError = '';
		requestCmd = beginPaymentCommand(requestCmd);
		try {
			const created = await requestRefund(buildRefundPayload(form, requestCmd.idempotencyKey));
			requestCmd = completePaymentCommandSuccess();
			successMessage = `Demande de remboursement n° ${created.id} enregistrée — ${REFUND_RESERVED_LABEL.toLowerCase()} sur le crédit utilisable (${refundStatusLabel(created.status).toLowerCase()}).`;
			const patientId = Number(form.patientId);
			form = createRefundFormState({
				patientId: form.patientId,
				holderPartyId: form.holderPartyId
			});
			await Promise.all([
				loadList(1),
				balancesPatientId === patientId ? loadBalances(patientId) : Promise.resolve()
			]);
			if (canRead) await openDetail(created.id);
		} catch (e: unknown) {
			const classified = classifyRefundError(e);
			requestError = classified;
			requestCmd = classified.preserveKey
				? completePaymentCommandError(requestCmd)
				: createPaymentCommandState();
			if (classified.shouldRefresh) {
				const patientId = Number(form.patientId);
				if (patientId > 0 && balancesPatientId === patientId) void loadBalances(patientId);
			}
		}
	}

	async function submitDecision() {
		if (!selected || !decisionMode || decisionBusy) return;
		const current = selected;
		decisionError = '';
		if (decisionMode === 'approve') {
			const invalid = validateRefundApproval(current, decisionManagerial);
			if (invalid) {
				decisionError = invalid;
				return;
			}
		} else {
			const invalid = validateRefundDecisionReason(decisionReason);
			if (invalid) {
				decisionError = invalid;
				return;
			}
		}
		decisionBusy = true;
		try {
			let updated: Refund;
			if (decisionMode === 'approve') {
				updated = await approveRefund(current.id, {
					managerialApproval: reasonRequiresManagerialApproval(current.reasonCode)
						? decisionManagerial
						: undefined
				});
			} else if (decisionMode === 'reject') {
				updated = await rejectRefund(current.id, { reason: decisionReason.trim() });
			} else {
				updated = await cancelRefund(current.id, { reason: decisionReason.trim() });
			}
			selected = updated;
			resetDecision();
			successMessage = '';
			await Promise.all([
				loadList(listPageNum),
				refreshSelectedSummary(updated),
				balancesPatientId === updated.patientId
					? loadBalances(updated.patientId)
					: Promise.resolve()
			]);
		} catch (e: unknown) {
			const classified = classifyRefundError(e);
			decisionError = classified.message;
			if (classified.shouldRefresh) {
				void loadList(listPageNum);
				void getRefund(current.id)
					.then((fresh) => {
						selected = fresh;
						return refreshSelectedSummary(fresh);
					})
					.catch(() => undefined);
			}
		} finally {
			decisionBusy = false;
		}
	}

	async function submitExecute() {
		if (!selected || isPaymentSubmitDisabled(executeCmd)) return;
		const current = selected;
		executeError = null;
		const invalid = validateRefundExecuteForm(current, executeForm);
		if (invalid) {
			executeError = {
				kind: 'validation',
				message: invalid,
				preserveKey: true,
				shouldRefresh: false
			};
			return;
		}
		const method = resolveExecuteMethod(current, executeForm.method);
		if (isCashRefundMethod(method)) {
			if (!openCashSession || openCashSession.session.status !== 'OPEN') {
				executeError = {
					kind: 'cash_session_required',
					message: 'Une session de caisse ouverte est requise pour un remboursement en espèces.',
					preserveKey: false,
					shouldRefresh: true
				};
				await loadOpenCashSession();
				return;
			}
			if ((openCashSession.expectedCash ?? 0) < current.amount) {
				executeError = {
					kind: 'insufficient_cash',
					message: 'Espèces insuffisantes dans la caisse ouverte — actualisez la session.',
					preserveKey: false,
					shouldRefresh: true
				};
				await loadOpenCashSession();
				return;
			}
		}
		executeCmd = beginPaymentCommand(executeCmd);
		try {
			const updated = await executeRefund(
				current.id,
				buildRefundExecutePayload(current, executeForm, executeCmd.idempotencyKey)
			);
			executeCmd = completePaymentCommandSuccess();
			selected = updated;
			resetExecute();
			successMessage = `Remboursement n° ${updated.id} effectué (${refundStatusLabel(updated.status)}).`;
			await Promise.all([
				loadList(listPageNum),
				refreshSelectedSummary(updated),
				balancesPatientId === updated.patientId
					? loadBalances(updated.patientId)
					: Promise.resolve()
			]);
		} catch (e: unknown) {
			const classified = classifyRefundError(e);
			executeError = classified;
			executeCmd = classified.preserveKey
				? completePaymentCommandError(executeCmd)
				: createPaymentCommandState();
			if (classified.shouldRefresh) {
				void loadList(listPageNum);
				void getRefund(current.id)
					.then((fresh) => {
						selected = fresh;
						return refreshSelectedSummary(fresh);
					})
					.catch(() => undefined);
				if (isCashRefundMethod(method)) void loadOpenCashSession();
			}
		}
	}

	function fmtDate(raw?: string | null): string {
		return raw ? new Date(raw).toLocaleString('fr-FR') : '—';
	}

	onMount(() => {
		readClaims();
		const q = page.url.searchParams.get('patientId');
		if (q && Number(q) > 0) {
			filterPatientId = q;
			form.patientId = q;
		}
		if (!canReadRefunds(permissions)) {
			loadingList = false;
			return;
		}
		void loadList(1);
		if (q && Number(q) > 0 && can(permissions, CREDIT_READ_PERMISSION))
			void loadBalances(Number(q));
	});
</script>

<svelte:head>
	<title>{REFUND_PAGE_TITLE} | MedCore HIS</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-6" data-testid="refunds-page">
	<p>
		<a class="text-sm font-bold text-blue-700" href={resolve('/billing')} data-testid="refunds-back"
			>← Facturation</a
		>
	</p>

	{#if !canRead}
		<AccessDenied
			title="Demandes de remboursement non autorisées"
			description="La permission billing.refund.read est requise."
		/>
	{:else if accessDenied}
		<section data-testid="refunds-denied">
			<AccessDenied
				title="Accès refusé"
				description="Vous n'avez pas l'autorisation de consulter les demandes de remboursement."
			/>
		</section>
	{:else}
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-sm font-bold text-indigo-700">FACTURATION</p>
				<h1 class="text-3xl font-black" data-testid="refunds-title">{REFUND_PAGE_TITLE}</h1>
				<p class="mt-1 text-sm text-slate-600" data-testid="refunds-notice">
					{REFUND_NO_PAYOUT_NOTICE}
				</p>
			</div>
			{#if canReadRefundReport(permissions)}
				<a
					class="rounded-xl border px-4 py-2 text-sm font-bold"
					href={resolve('/billing/refunds/report')}
					data-testid="refund-report-link">{REFUND_REPORT_LINK_LABEL}</a
				>
			{/if}
		</header>

		{#if successMessage}
			<p
				class="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900"
				data-testid="refund-success"
				role="status"
			>
				{successMessage}
			</p>
		{/if}

		{#if showRequest}
			<section class="space-y-4 rounded-2xl border bg-white p-5" data-testid="refund-request-form">
				<h2 class="text-lg font-black">{REFUND_REQUEST_SECTION}</h2>

				{#if canReadCredit}
					<div
						class="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"
						data-testid="refund-balances"
					>
						<div class="flex flex-wrap items-center gap-2">
							<p class="text-sm font-bold text-indigo-950">
								{REFUND_SPENDABLE_LABEL} (soldes du serveur)
							</p>
							<button
								type="button"
								class="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40"
								data-testid="refund-balances-load"
								disabled={balancesLoading || !(Number(form.patientId) > 0)}
								onclick={onLoadBalances}>Consulter les soldes du patient</button
							>
						</div>
						{#if balancesError}
							<p class="text-sm text-red-700" role="alert">{balancesError}</p>
						{:else if balancesPatientId > 0 && balances.length === 0}
							<p class="text-sm text-slate-600" data-testid="refund-balances-empty">
								Aucun crédit pour ce patient.
							</p>
						{/if}
						{#each balances as bal (bal.holderPartyId)}
							<div
								class="grid gap-2 rounded-lg bg-white p-3 text-sm sm:grid-cols-5"
								data-testid={`refund-balance-${bal.holderPartyId}`}
							>
								<p class="font-black">Titulaire #{bal.holderPartyId}</p>
								<p>
									<span class="block text-xs text-slate-500">{REFUND_LEDGER_LABEL}</span>
									<b data-testid={`refund-balance-${bal.holderPartyId}-ledger`}
										>{formatXOF(bal.ledgerAvailable)}</b
									>
								</p>
								<p>
									<span class="block text-xs text-slate-500">{REFUND_RESERVED_LABEL}</span>
									<b data-testid={`refund-balance-${bal.holderPartyId}-reserved`}
										>{formatXOF(bal.reservedForRefund)}</b
									>
								</p>
								<p>
									<span class="block text-xs text-slate-500">{REFUND_SPENDABLE_LABEL}</span>
									<b data-testid={`refund-balance-${bal.holderPartyId}-spendable`}
										>{formatXOF(bal.spendableCredit)}</b
									>
								</p>
								<button
									type="button"
									class="rounded-lg border px-2 py-1 font-bold"
									data-testid={`refund-balance-${bal.holderPartyId}-pick`}
									onclick={() => pickHolder(bal.holderPartyId)}>Choisir</button
								>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-slate-600" data-testid="refund-balances-hidden">
						Le détail des soldes est réservé aux comptes financiers : le serveur contrôle le crédit
						utilisable à l’enregistrement de la demande.
					</p>
				{/if}

				<form
					class="grid gap-3 md:grid-cols-3"
					onsubmit={(e) => {
						e.preventDefault();
						void submitRequest();
					}}
				>
					<label class="text-xs font-bold uppercase text-slate-500">
						Patient (id)
						<input
							type="number"
							min="1"
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-patient-id"
							bind:value={form.patientId}
						/>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500">
						Titulaire du crédit (id)
						<input
							type="number"
							min="1"
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-holder-id"
							bind:value={form.holderPartyId}
						/>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500">
						Montant demandé (FCFA)
						<input
							type="number"
							min="1"
							step="1"
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-amount"
							bind:value={form.amount}
						/>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500 md:col-span-1">
						Motif
						<select
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-reason-code"
							bind:value={form.reasonCode}
						>
							{#each refundReasonOptions as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">
						Commentaire {otherReason ? '(obligatoire)' : '(facultatif)'}
						<textarea
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							rows="2"
							maxlength="1000"
							data-testid="refund-reason-comment"
							bind:value={form.reasonComment}></textarea>
					</label>
					{#if needsAttestation}
						<label class="text-xs font-bold uppercase text-slate-500 md:col-span-3">
							Référence d’attestation clinique (obligatoire)
							<input
								type="text"
								class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
								maxlength="200"
								data-testid="refund-attestation-ref"
								bind:value={form.clinicalAttestationRef}
							/>
						</label>
					{/if}
					<label class="text-xs font-bold uppercase text-slate-500">
						Bénéficiaire
						<select
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-beneficiary-mode"
							bind:value={form.beneficiaryMode}
						>
							{#each refundBeneficiaryModeOptions as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500">
						Mode prévu
						<select
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							data-testid="refund-intended-method"
							bind:value={form.intendedMethod}
						>
							{#each refundMethodOptions as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</label>
					<label class="text-xs font-bold uppercase text-slate-500">
						Justification du mode (facultatif)
						<input
							type="text"
							class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
							maxlength="500"
							data-testid="refund-method-override"
							bind:value={form.methodOverrideReason}
						/>
					</label>
					{#if isAlternate}
						<label class="text-xs font-bold uppercase text-slate-500">
							Identité du bénéficiaire
							<input
								type="text"
								class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
								maxlength="200"
								data-testid="refund-beneficiary-name"
								bind:value={form.beneficiaryDisplayName}
							/>
						</label>
						<label class="text-xs font-bold uppercase text-slate-500">
							Lien avec le titulaire
							<input
								type="text"
								class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
								maxlength="80"
								data-testid="refund-beneficiary-relationship"
								bind:value={form.beneficiaryRelationship}
							/>
						</label>
						<label class="text-xs font-bold uppercase text-slate-500">
							Réf. du consentement écrit du titulaire
							<input
								type="text"
								class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
								maxlength="200"
								data-testid="refund-consent-ref"
								bind:value={form.holderConsentRef}
							/>
						</label>
					{/if}
					<div class="flex flex-wrap items-center gap-3 md:col-span-3">
						<button
							type="submit"
							class="rounded-xl bg-indigo-800 px-4 py-2 font-bold text-white disabled:opacity-40"
							data-testid="refund-submit"
							disabled={isPaymentSubmitDisabled(requestCmd)}
							>{isPaymentSubmitDisabled(requestCmd)
								? 'Enregistrement…'
								: REFUND_REQUEST_ACTION_LABEL}</button
						>
						{#if formError}
							<p
								class="text-sm font-bold text-red-700"
								data-testid="refund-form-error"
								role="alert"
							>
								{formError}
							</p>
						{/if}
						{#if requestError}
							<p
								class="text-sm font-bold text-amber-900"
								data-testid="refund-request-error"
								data-error-kind={requestError.kind}
								role="alert"
							>
								{requestError.message}
							</p>
						{/if}
					</div>
				</form>
			</section>
		{/if}

		{#if selected || detailError}
			<section
				class="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5"
				data-testid="refund-detail"
			>
				{#if detailError}
					<p class="text-sm font-bold text-red-700" data-testid="refund-detail-error" role="alert">
						{detailError}
					</p>
				{/if}
				{#if selected}
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 class="text-lg font-black" data-testid="refund-detail-title">
								Demande de remboursement n° {selected.id}
							</h2>
							<span
								class={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-black ${refundStatusTone(selected.status)}`}
								data-testid="refund-detail-status">{refundStatusLabel(selected.status)}</span
							>
							{#if selected.refundNumber}
								<span
									class="ml-2 text-sm font-black text-sky-900"
									data-testid="refund-detail-number">{selected.refundNumber}</span
								>
							{/if}
							{#if refundHoldsReservation(selected.status)}
								<span
									class="ml-2 text-xs font-bold text-indigo-900"
									data-testid="refund-detail-held"
									>{REFUND_RESERVED_LABEL} sur le crédit utilisable</span
								>
							{/if}
						</div>
						<button
							type="button"
							class="rounded-lg border px-3 py-1 text-sm font-bold"
							data-testid="refund-detail-close"
							onclick={closeDetail}>Fermer</button
						>
					</div>

					<dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Patient</dt>
							<dd class="font-bold">
								#{selected.patientId}
								·
								<a
									class="text-blue-700"
									href={resolve(`/billing/patients/${selected.patientId}/statement`)}>Relevé</a
								>
							</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Titulaire</dt>
							<dd class="font-bold">#{selected.holderPartyId}</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">{REFUND_RESERVED_LABEL}</dt>
							<dd class="font-bold" data-testid="refund-detail-amount">
								{formatXOF(selected.amount)}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Motif</dt>
							<dd class="font-bold" data-testid="refund-detail-reason">
								{refundReasonLabel(selected.reasonCode)}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Bénéficiaire</dt>
							<dd class="font-bold" data-testid="refund-detail-beneficiary">
								{selected.beneficiaryDisplayName}
								<span class="block text-xs font-normal text-slate-500"
									>{refundBeneficiaryModeLabel(
										selected.beneficiaryMode
									)}{#if selected.beneficiaryRelationship}
										· {selected.beneficiaryRelationship}{/if}</span
								>
							</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Mode prévu</dt>
							<dd class="font-bold">{refundMethodLabel(selected.intendedMethod)}</dd>
						</div>
						<div>
							<dt class="text-xs font-bold uppercase text-slate-500">Demandée</dt>
							<dd>{fmtDate(selected.requestedAt)} · utilisateur #{selected.requestedBy}</dd>
						</div>
						{#if selected.approvedAt}
							<div>
								<dt class="text-xs font-bold uppercase text-slate-500">Autorisée</dt>
								<dd>{fmtDate(selected.approvedAt)} · utilisateur #{selected.approvedBy}</dd>
							</div>
						{/if}
						{#if selected.rejectedAt}
							<div>
								<dt class="text-xs font-bold uppercase text-slate-500">Rejetée</dt>
								<dd data-testid="refund-detail-rejection">
									{fmtDate(selected.rejectedAt)} · {selected.rejectionReason}
								</dd>
							</div>
						{/if}
						{#if selected.cancelledAt}
							<div>
								<dt class="text-xs font-bold uppercase text-slate-500">Annulée</dt>
								<dd data-testid="refund-detail-cancellation">
									{fmtDate(selected.cancelledAt)} · {selected.cancellationReason}
								</dd>
							</div>
						{/if}
						{#if selected.execution}
							<div class="sm:col-span-2" data-testid="refund-execution-block">
								<dt class="text-xs font-bold uppercase text-slate-500">Exécution</dt>
								<dd class="space-y-1">
									<p>
										{refundMethodLabel(selected.execution.method)} · {fmtDate(
											selected.execution.executedAt
										)} · utilisateur #{selected.execution.executedBy}
									</p>
									{#if selected.execution.externalReference}
										<p data-testid="refund-execution-ext-ref">
											Réf. externe : {selected.execution.externalReference}
										</p>
									{/if}
									{#if selected.execution.cashSessionId}
										<p data-testid="refund-execution-cash">
											Caisse session #{selected.execution.cashSessionId}
											{#if selected.execution.cashRegisterId}
												· registre #{selected.execution.cashRegisterId}{/if}
										</p>
									{/if}
								</dd>
							</div>
						{/if}
						{#if selected.reasonComment}
							<div class="sm:col-span-2">
								<dt class="text-xs font-bold uppercase text-slate-500">Commentaire</dt>
								<dd>{selected.reasonComment}</dd>
							</div>
						{/if}
					</dl>

					{#if selectedSummary}
						<div
							class="grid gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm sm:grid-cols-3"
							data-testid="refund-detail-summary"
						>
							<p>
								<span class="block text-xs text-slate-500">{REFUND_LEDGER_LABEL}</span>
								<b data-testid="refund-detail-ledger"
									>{formatXOF(selectedSummary.ledgerAvailable)}</b
								>
							</p>
							<p>
								<span class="block text-xs text-slate-500">{REFUND_RESERVED_LABEL}</span>
								<b data-testid="refund-detail-reserved"
									>{formatXOF(selectedSummary.reservedForRefund)}</b
								>
							</p>
							<p>
								<span class="block text-xs text-slate-500">{REFUND_SPENDABLE_LABEL}</span>
								<b data-testid="refund-detail-spendable"
									>{formatXOF(selectedSummary.spendableCredit)}</b
								>
							</p>
						</div>
					{/if}

					{#if ownSelected && selected.status === 'REQUESTED'}
						<p class="text-sm text-slate-600" data-testid="refund-sod-hint">
							Vous êtes le demandeur : la séparation des tâches impose qu’un autre utilisateur
							autorise ou rejette cette demande.
						</p>
					{/if}
					{#if ownApproval && selected.status === 'APPROVED'}
						<p class="text-sm text-slate-600" data-testid="refund-exec-sod-hint">
							Vous avez autorisé cette demande : un autre utilisateur doit exécuter le
							remboursement.
						</p>
					{/if}

					<div class="flex flex-wrap gap-2" data-testid="refund-actions">
						{#if canShowApproveAction(selected, permissions)}
							<button
								type="button"
								class="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-40"
								data-testid="refund-approve"
								disabled={ownSelected}
								onclick={() => startDecision('approve')}>{REFUND_APPROVE_ACTION_LABEL}</button
							>
						{/if}
						{#if canShowRejectAction(selected, permissions)}
							<button
								type="button"
								class="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700 disabled:opacity-40"
								data-testid="refund-reject"
								disabled={ownSelected}
								onclick={() => startDecision('reject')}>{REFUND_REJECT_ACTION_LABEL}</button
							>
						{/if}
						{#if canShowCancelAction(selected, permissions)}
							<button
								type="button"
								class="rounded-xl border px-4 py-2 font-bold"
								data-testid="refund-cancel"
								onclick={() => startDecision('cancel')}>{REFUND_CANCEL_ACTION_LABEL}</button
							>
						{/if}
						{#if canShowExecuteAction(selected, permissions)}
							<button
								type="button"
								class="rounded-xl bg-sky-800 px-4 py-2 font-bold text-white disabled:opacity-40"
								data-testid="refund-execute"
								disabled={ownApproval || executeOpen}
								onclick={() => void startExecute()}
								>{executeIsExternal ||
								(selected.intendedMethod && isExternalRefundMethod(selected.intendedMethod))
									? REFUND_EXECUTE_EXTERNAL_ACTION_LABEL
									: REFUND_EXECUTE_ACTION_LABEL}</button
							>
						{/if}
						{#if canShowRefundVoucher(selected)}
							<a
								class="rounded-xl border border-sky-700 px-4 py-2 font-bold text-sky-900"
								href={resolve(`/billing/refunds/${selected.id}/voucher`)}
								data-testid="refund-voucher-link">{REFUND_VOUCHER_PRINT_LABEL}</a
							>
						{/if}
					</div>

					{#if executeOpen && selected.status === 'APPROVED'}
						<div
							class="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4"
							data-testid="refund-execute-panel"
						>
							{#if executeIsCash}
								<p class="text-sm text-slate-700" data-testid="refund-execute-cash-notice">
									{REFUND_EXECUTE_CASH_NOTICE}
								</p>
								{#if cashSessionLoading}
									<p class="text-sm text-slate-500">Chargement de la session de caisse…</p>
								{:else if openCashSession}
									<div
										class="rounded-lg border bg-white p-3 text-sm"
										data-testid="refund-execute-cash-session"
									>
										<p>
											<span class="font-bold">Session ouverte</span> #{openCashSession.session.id}
											· {openCashSession.session.register?.name ??
												`registre #${openCashSession.session.cashRegisterId}`}
										</p>
										<p>
											Espèces attendues :
											<b data-testid="refund-execute-expected-cash"
												>{formatXOF(openCashSession.expectedCash)}</b
											>
										</p>
									</div>
								{:else}
									<p
										class="text-sm font-bold text-amber-900"
										data-testid="refund-execute-cash-missing"
										role="alert"
									>
										{cashSessionError ||
											'Ouvrez une session de caisse avant d’exécuter un remboursement en espèces.'}
									</p>
								{/if}
							{:else if executeIsExternal}
								<p class="text-sm text-slate-700" data-testid="refund-execute-external-notice">
									{REFUND_EXECUTE_EXTERNAL_NOTICE}
								</p>
							{/if}

							{#if methodNeedsPick}
								<label class="block text-sm">
									<span class="font-bold">Mode d’exécution</span>
									<select
										class="mt-1 w-full rounded-lg border p-2"
										data-testid="refund-execute-method"
										bind:value={executeForm.method}
										onchange={() => {
											const m = resolveExecuteMethod(selected!, executeForm.method);
											if (isCashRefundMethod(m)) void loadOpenCashSession();
										}}
									>
										<option value="">Choisir…</option>
										{#each refundMethodOptions.filter((o) => o.value !== 'UNSPECIFIED') as opt (opt.value)}
											<option value={opt.value}>{opt.label}</option>
										{/each}
									</select>
								</label>
							{:else}
								<p class="text-sm" data-testid="refund-execute-method-locked">
									Mode autorisé : <b>{refundMethodLabel(selected.intendedMethod)}</b>
								</p>
							{/if}

							{#if executeIsExternal}
								<label class="block text-sm">
									<span class="font-bold">Référence externe (obligatoire)</span>
									<input
										class="mt-1 w-full rounded-lg border p-2"
										data-testid="refund-execute-ext-ref"
										bind:value={executeForm.externalReference}
										maxlength="120"
									/>
								</label>
								<label class="block text-sm">
									<span class="font-bold">Compte / numéro bénéficiaire</span>
									<input
										class="mt-1 w-full rounded-lg border p-2"
										data-testid="refund-execute-rail-ref"
										bind:value={executeForm.beneficiaryRailRef}
										maxlength="120"
									/>
								</label>
								<label class="block text-sm">
									<span class="font-bold">Référence de preuve (optionnel)</span>
									<input
										class="mt-1 w-full rounded-lg border p-2"
										data-testid="refund-execute-evidence"
										bind:value={executeForm.evidenceReference}
										maxlength="120"
									/>
								</label>
							{/if}

							{#if executeError}
								<p
									class="text-sm font-bold text-amber-900"
									data-testid="refund-execute-error"
									role="alert"
								>
									{executeError.message}
								</p>
							{/if}
							<div class="flex gap-2">
								<button
									type="button"
									class="rounded-xl border px-4 py-2 font-bold"
									data-testid="refund-execute-cancel"
									onclick={resetExecute}>Retour</button
								>
								<button
									type="button"
									class="rounded-xl bg-sky-900 px-4 py-2 font-bold text-white disabled:opacity-40"
									data-testid="refund-execute-submit"
									disabled={isPaymentSubmitDisabled(executeCmd) ||
										(executeIsCash && !openCashSession)}
									onclick={() => void submitExecute()}
									>{isPaymentSubmitDisabled(executeCmd)
										? 'Traitement…'
										: executeIsExternal
											? REFUND_EXECUTE_EXTERNAL_ACTION_LABEL
											: REFUND_EXECUTE_ACTION_LABEL}</button
								>
							</div>
						</div>
					{/if}

					{#if decisionMode}
						<div
							class="space-y-3 rounded-xl border bg-slate-50 p-4"
							data-testid="refund-decision-panel"
							data-decision-mode={decisionMode}
						>
							{#if decisionMode === 'approve'}
								<p class="text-sm text-slate-700">
									L’autorisation conserve le {REFUND_RESERVED_LABEL.toLowerCase()} ; elle n’enregistre
									aucune sortie d’argent.
								</p>
								{#if reasonRequiresManagerialApproval(selected.reasonCode)}
									<label class="flex items-start gap-2 text-sm">
										<input
											type="checkbox"
											bind:checked={decisionManagerial}
											data-testid="refund-decision-managerial"
										/>
										<span>Je confirme la validation managériale (motif « Autre »).</span>
									</label>
								{/if}
							{:else}
								<label class="block text-sm">
									<span class="font-bold">Motif (obligatoire)</span>
									<textarea
										class="mt-1 w-full rounded-lg border p-2"
										rows="3"
										maxlength="1000"
										data-testid="refund-decision-reason"
										bind:value={decisionReason}></textarea>
								</label>
							{/if}
							{#if decisionError}
								<p
									class="text-sm font-bold text-amber-900"
									data-testid="refund-decision-error"
									role="alert"
								>
									{decisionError}
								</p>
							{/if}
							<div class="flex gap-2">
								<button
									type="button"
									class="rounded-xl border px-4 py-2 font-bold"
									data-testid="refund-decision-cancel"
									onclick={resetDecision}>Retour</button
								>
								<button
									type="button"
									class="rounded-xl bg-indigo-800 px-4 py-2 font-bold text-white disabled:opacity-40"
									data-testid="refund-decision-submit"
									disabled={decisionBusy}
									onclick={submitDecision}
									>{decisionBusy
										? 'Traitement…'
										: decisionMode === 'approve'
											? REFUND_APPROVE_ACTION_LABEL
											: decisionMode === 'reject'
												? REFUND_REJECT_ACTION_LABEL
												: REFUND_CANCEL_ACTION_LABEL}</button
								>
							</div>
						</div>
					{/if}
				{/if}
			</section>
		{/if}

		<section class="rounded-2xl border bg-white p-5" data-testid="refund-list">
			<h2 class="text-lg font-black">Demandes</h2>
			<form
				class="mt-4 grid gap-3 md:grid-cols-6"
				data-testid="refund-filters"
				onsubmit={(e) => {
					e.preventDefault();
					applyFilters();
				}}
			>
				<label class="text-xs font-bold uppercase text-slate-500">
					Statut
					<select
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-status"
						bind:value={filterStatus}
					>
						{#each refundStatusFilterOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Motif
					<select
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-reason"
						bind:value={filterReason}
					>
						{#each refundReasonFilterOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Patient (id)
					<input
						type="number"
						min="0"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-patient"
						bind:value={filterPatientId}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Titulaire (id)
					<input
						type="number"
						min="0"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-holder"
						bind:value={filterHolderId}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Du
					<input
						type="date"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-date-from"
						bind:value={filterDateFrom}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Au
					<input
						type="date"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-date-to"
						bind:value={filterDateTo}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">
					N° RMB
					<input
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="refund-filter-number"
						placeholder="RMB-2026-000001"
						bind:value={filterRefundNumber}
					/>
				</label>
				<div class="md:col-span-6">
					<button
						type="submit"
						class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
						data-testid="refund-filter-submit">Filtrer</button
					>
				</div>
			</form>

			{#if listError}
				<p
					class="mt-4 rounded-xl bg-red-50 p-3 text-red-700"
					role="alert"
					data-testid="refund-list-error"
				>
					{listError}
				</p>
			{/if}
			{#if loadingList && refunds.length === 0}
				<p class="mt-4 text-sm text-slate-500" data-testid="refund-list-loading">Chargement…</p>
			{/if}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[860px] text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th class="p-2">Id</th>
							<th>RMB</th>
							<th>Date</th>
							<th>Patient</th>
							<th>Titulaire</th>
							<th>{REFUND_RESERVED_LABEL}</th>
							<th>Motif</th>
							<th>Statut</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each refunds as r (r.id)}
							<tr class="border-t" data-testid={`refund-row-${r.id}`}>
								<td class="p-2 font-bold">{r.id}</td>
								<td data-testid={`refund-row-number-${r.id}`}>{r.refundNumber || '—'}</td>
								<td>{fmtDate(r.requestedAt)}</td>
								<td>#{r.patientId}</td>
								<td>#{r.holderPartyId}</td>
								<td data-testid={`refund-row-amount-${r.id}`}>{formatXOF(r.amount)}</td>
								<td>{refundReasonLabel(r.reasonCode)}</td>
								<td>
									<span
										class={`rounded-full px-2 py-1 text-xs font-black ${refundStatusTone(r.status)}`}
										data-testid={`refund-row-status-${r.id}`}>{refundStatusLabel(r.status)}</span
									>
								</td>
								<td>
									<button
										type="button"
										class="rounded-lg border px-3 py-1 font-bold"
										data-testid={`refund-open-${r.id}`}
										onclick={() => openDetail(r.id)}>Détail</button
									>
								</td>
							</tr>
						{:else}
							<tr
								><td
									colspan="9"
									class="p-8 text-center text-slate-500"
									data-testid="refund-list-empty">Aucune demande.</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<p class="text-sm text-slate-600" data-testid="refund-list-meta">
					Page {listPageNum} / {listTotalPages} · {listTotal} demande(s)
				</p>
				<button
					type="button"
					class="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40"
					data-testid="refund-list-prev"
					disabled={listPageNum <= 1 || loadingList}
					onclick={() => loadList(listPageNum - 1)}>Précédent</button
				>
				<button
					type="button"
					class="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40"
					data-testid="refund-list-next"
					disabled={listPageNum >= listTotalPages || loadingList}
					onclick={() => loadList(listPageNum + 1)}>Suivant</button
				>
			</div>
		</section>
	{/if}
</div>
