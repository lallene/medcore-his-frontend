<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		acceptGrcFinding,
		closeGrcFinding,
		getGrcFinding,
		listGrcFindingActions
	} from '$lib/api/grc';
	import type { GrcFinding, GrcLinkedAction } from '$lib/types/grc';
	import FindingFormModal from '$lib/components/grc/FindingFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate, riskStatusLabel } from '$lib/components/grc/risk-state';
	import { actionStatusLabel } from '$lib/components/grc/action-state';
	import {
		auditAccess,
		findingActions,
		findingCategoryLabel,
		findingSeverityLabel,
		findingStatusLabel,
		labelOf,
		type AuditAccess
	} from '$lib/components/grc/audit-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let finding = $state<GrcFinding | null>(null);
	let access = $state<AuditAccess | null>(null);
	let actions = $state<GrcLinkedAction[] | null>(null);
	let actionsError = $state('');
	let loading = $state(true);
	let error = $state('');
	let transitionError = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);
	let closeOpen = $state(false);
	let acceptOpen = $state(false);
	let acceptNote = $state('');
	let acceptError = $state('');
	let accepting = $state(false);

	const findingId = $derived(Number(page.params.id));

	async function loadActions() {
		if (!access?.readActions) return;
		actionsError = '';
		try {
			actions = (await listGrcFindingActions(findingId)).items;
		} catch (e) {
			actionsError = resolveUserErrorMessage(e, 'Actions indisponibles.');
		}
	}

	async function close() {
		transitionError = '';
		try {
			finding = await closeGrcFinding(findingId);
		} catch (e) {
			// 409 typique : une action liée n'est ni terminée ni annulée.
			transitionError = resolveUserErrorMessage(e, 'Impossible de clôturer le constat.');
		}
	}

	async function accept(e: SubmitEvent) {
		e.preventDefault();
		if (!acceptNote.trim()) {
			acceptError = 'La justification est obligatoire.';
			return;
		}
		accepting = true;
		acceptError = '';
		try {
			finding = await acceptGrcFinding(findingId, acceptNote.trim());
			acceptOpen = false;
		} catch (err) {
			acceptError = resolveUserErrorMessage(err, 'Impossible d’accepter le constat.');
		} finally {
			accepting = false;
		}
	}

	onMount(async () => {
		access = auditAccess(getStoredPermissions());
		if (!access.readFindings) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(findingId) || findingId <= 0) {
			error = 'Identifiant de constat invalide.';
			loading = false;
			return;
		}
		try {
			finding = await getGrcFinding(findingId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le constat.');
			loading = false;
			return;
		}
		loading = false;
		void loadActions();
	});

	const can = $derived(finding && access ? findingActions(finding, access) : null);
	const sourceLabel = $derived(
		finding?.auditEngagement
			? `audit ${finding.auditEngagement.reference}`
			: finding?.assessment
				? `évaluation ${finding.assessment.reference}`
				: 'source'
	);
</script>

<svelte:head>
	<title>{finding ? `${finding.reference} · Constat` : 'Constat'} | MedCore HIS</title>
</svelte:head>

{#snippet field(label: string, value: string, testId = '')}
	<div class="min-w-0">
		<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
		<dd
			class="mt-1 break-words text-sm whitespace-pre-line text-foreground"
			data-testid={testId || undefined}
		>
			{value}
		</dd>
	</div>
{/snippet}

{#if loading}
	<LoadingState label="Chargement du constat…" />
{:else if accessDenied}
	<AccessDenied
		title="Constat non disponible"
		description="Votre profil n'inclut pas la permission de lecture des constats GRC."
	/>
{:else if !finding || !access || !can}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Constat introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/audits')} variant="secondary">Retour aux audits</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-finding-detail">
		<PageHeader eyebrow="Constat" title={finding.title} description={finding.reference}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={finding?.status ?? ''}
						label={`Statut : ${labelOf(findingStatusLabel, finding?.status ?? '')}`}
						data-testid="grc-finding-status"
					/>
					<StatusBadge
						status={finding?.severity ?? ''}
						label={`Sévérité : ${labelOf(findingSeverityLabel, finding?.severity ?? '')}`}
						data-testid="grc-finding-severity"
					/>
					{#if finding?.overdue}<StatusBadge
							status="OVERDUE"
							label="En retard"
							data-testid="grc-finding-overdue"
						/>{/if}
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					{#if finding?.auditEngagementId}
						<LinkButton
							href={resolve('/grc/audits/[id]', { id: String(finding.auditEngagementId) })}
							variant="secondary">Audit</LinkButton
						>
					{/if}
					{#if can?.edit}
						<Button
							variant="secondary"
							onclick={() => (editOpen = true)}
							data-testid="grc-finding-edit">Modifier</Button
						>
					{/if}
					{#if can?.accept}
						<Button
							variant="secondary"
							onclick={() => (acceptOpen = true)}
							data-testid="grc-finding-accept">Accepter le risque</Button
						>
					{/if}
					{#if can?.close}
						<Button onclick={() => (closeOpen = true)} data-testid="grc-finding-close"
							>Clôturer</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if transitionError}
			<div data-testid="grc-finding-transition-error">
				<Alert tone="danger">{transitionError}</Alert>
			</div>
		{/if}
		{#if access.closeFindings && finding.status !== 'RESOLVED' && finding.status !== 'CLOSED' && finding.status !== 'ACCEPTED'}
			<p class="text-xs text-muted-foreground">
				La clôture est possible une fois le constat résolu et toutes ses actions terminées ou
				annulées.
			</p>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Constat" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Catégorie', labelOf(findingCategoryLabel, finding.category))}
					{@render field('Sévérité', labelOf(findingSeverityLabel, finding.severity))}
					{@render field(
						'Échéance',
						finding.dueAt ? formatRiskDate(finding.dueAt) : 'Sans échéance',
						'grc-finding-due'
					)}
					{@render field('Résolu le', formatRiskDate(finding.resolvedAt))}
					{@render field('Clôturé le', formatRiskDate(finding.closedAt))}
					{@render field('Mis à jour le', formatAssetDate(finding.updatedAt))}
					<div class="sm:col-span-2">
						{@render field('Description', finding.description || 'Aucune description')}
					</div>
					{#if finding.closureNote}
						<div class="sm:col-span-2">
							{@render field('Justification', finding.closureNote, 'grc-finding-closure-note')}
						</div>
					{/if}
				</dl>
			</Card>
			<Card
				title="Source et rattachements"
				subtitle="La source d’un constat n’est jamais modifiable"
				class="min-w-0"
			>
				<dl class="grid gap-4 sm:grid-cols-2" data-testid="grc-finding-relations">
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Source</dt>
						<dd class="mt-1 text-sm" data-testid="grc-finding-source">
							{#if finding.auditEngagement}
								<a href={resolve('/grc/audits/[id]', { id: String(finding.auditEngagement.id) })}
									>Audit {finding.auditEngagement.reference}</a
								>
								<span class="block text-xs text-muted-foreground"
									>{finding.auditEngagement.title}</span
								>
							{:else if finding.assessment}
								Évaluation {finding.assessment.reference}
							{:else}
								—
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Risque</dt>
						<dd class="mt-1 text-sm" data-testid="grc-finding-risk">
							{#if finding.risk && access.readRisks}
								<a href={resolve('/grc/risks/[id]', { id: String(finding.risk.id) })}
									>{finding.risk.reference} — {finding.risk.title}</a
								>
							{:else if finding.risk}
								{finding.risk.reference} — {finding.risk.title}
							{:else}
								Aucun
							{/if}
							{#if finding.risk}<span class="block text-xs text-muted-foreground"
									>{labelOf(riskStatusLabel, finding.risk.status)}</span
								>{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Implémentation de contrôle</dt>
						<dd class="mt-1 text-sm">
							{#if finding.controlImplementation}
								{#if access.readImplementations}
									<a
										href={resolve('/grc/controls/implementations/[id]', {
											id: String(finding.controlImplementation.id)
										})}
									>
										{finding.controlImplementation.control?.code ?? 'Contrôle'} sur {finding
											.controlImplementation.asset?.code ?? 'actif'}
									</a>
								{:else}
									{finding.controlImplementation.control?.code ?? 'Contrôle'} sur {finding
										.controlImplementation.asset?.code ?? 'actif'}
								{/if}
							{:else}
								Aucune
							{/if}
						</dd>
					</div>
					{@render field('Propriétaire', ownerLabel(finding.ownerProfile))}
					{@render field('Service propriétaire', serviceLabel(finding.owningService))}
				</dl>
			</Card>
		</div>

		<Card
			title="Actions de remédiation"
			subtitle="Toutes doivent être terminées ou annulées avant la clôture"
			class="min-w-0"
		>
			<div data-testid="grc-finding-actions">
				{#if !access.readActions}
					<p class="text-sm text-muted-foreground" data-testid="grc-finding-actions-denied">
						Vous n’avez pas l’autorisation de consulter les actions de remédiation.
					</p>
				{:else if actionsError}
					<Alert tone="danger">{actionsError}</Alert>
				{:else if actions === null}
					<LoadingState label="Chargement…" />
				{:else if actions.length === 0}
					<p class="text-sm text-muted-foreground" data-testid="grc-finding-actions-empty">
						Aucune action liée.
					</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each actions as action (action.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
								<span class="min-w-0">
									<a href={resolve('/grc/actions/[id]', { id: String(action.id) })}
										><b>{action.reference}</b></a
									>
									· {action.title}
									{#if action.overdue}<span class="block text-xs font-medium text-danger"
											>En retard</span
										>{/if}
								</span>
								<StatusBadge
									status={action.status}
									label={labelOf(actionStatusLabel, action.status)}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Card>
	</div>

	{#if can.edit}
		<FindingFormModal
			bind:open={editOpen}
			auditId={finding.auditEngagementId ?? 0}
			auditLabel={sourceLabel}
			{finding}
			onsaved={(saved) => (finding = saved)}
		/>
	{/if}
	<ConfirmDialog
		bind:open={closeOpen}
		title="Clôturer le constat ?"
		description="Le constat passera au statut « Clôturé » ; le serveur refuse si une action liée est encore ouverte."
		confirmLabel="Clôturer"
		danger={false}
		onconfirm={close}
	/>
	<Modal
		bind:open={acceptOpen}
		title="Accepter le risque"
		description="Le constat sera clos sans remédiation ; une justification est obligatoire."
	>
		<form class="space-y-4" onsubmit={accept} novalidate>
			<FormField id="finding-accept-note" label="Justification" required error={acceptError}>
				<Textarea
					id="finding-accept-note"
					rows={3}
					bind:value={acceptNote}
					data-testid="grc-finding-accept-note"
				/>
			</FormField>
			<div class="flex justify-end gap-2">
				<Button variant="secondary" onclick={() => (acceptOpen = false)} disabled={accepting}
					>Annuler</Button
				>
				<Button type="submit" loading={accepting} data-testid="grc-finding-accept-submit"
					>Accepter</Button
				>
			</div>
		</form>
	</Modal>
{/if}
