<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		getGrcRisk,
		listGrcRiskActions,
		listGrcRiskControls,
		listGrcRiskFindings
	} from '$lib/api/grc';
	import type {
		GrcLinkedAction,
		GrcLinkedControl,
		GrcLinkedFinding,
		GrcPage,
		GrcRisk
	} from '$lib/types/grc';
	import RiskFormModal from '$lib/components/grc/RiskFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		canReadRisks,
		canUpdateRisks,
		formatRiskDate,
		labelOf,
		riskLevelName,
		riskRelationAccess,
		riskStatusLabel,
		riskTreatmentLabel
	} from '$lib/components/grc/risk-state';
	import { statusLabel } from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	type Relation<T> = { allowed: boolean; loading: boolean; error: string; page: GrcPage<T> | null };
	const relation = <T,>(): Relation<T> => ({
		allowed: false,
		loading: false,
		error: '',
		page: null
	});

	let risk = $state<GrcRisk | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canUpdate = $state(false);
	let formOpen = $state(false);
	let controls = $state(relation<GrcLinkedControl>());
	let actions = $state(relation<GrcLinkedAction>());
	let findings = $state(relation<GrcLinkedFinding>());

	const riskId = $derived(Number(page.params.id));

	async function loadRelation<T>(target: Relation<T>, fetcher: () => Promise<GrcPage<T>>) {
		if (!target.allowed) return;
		target.loading = true;
		target.error = '';
		try {
			target.page = await fetcher();
		} catch (e) {
			target.error = resolveUserErrorMessage(e, 'Relation momentanément indisponible.');
		} finally {
			target.loading = false;
		}
	}

	onMount(async () => {
		const permissions = getStoredPermissions();
		if (!canReadRisks(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		canUpdate = canUpdateRisks(permissions);
		const access = riskRelationAccess(permissions);
		controls.allowed = access.controls;
		actions.allowed = access.actions;
		findings.allowed = access.findings;
		if (!Number.isInteger(riskId) || riskId <= 0) {
			error = 'Identifiant de risque invalide.';
			loading = false;
			return;
		}
		try {
			risk = await getGrcRisk(riskId);
			void loadRelation(controls, () => listGrcRiskControls(riskId));
			void loadRelation(actions, () => listGrcRiskActions(riskId));
			void loadRelation(findings, () => listGrcRiskFindings(riskId));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le risque.');
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{risk ? `${risk.reference} · Risque GRC` : 'Risque GRC'} | MedCore HIS</title>
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

{#snippet dimension(
	title: string,
	likelihood: number,
	impact: number,
	score: number,
	level: string,
	testId: string
)}
	<div class="rounded-lg border border-border p-4" data-testid={testId}>
		<p class="text-sm font-medium text-foreground">{title}</p>
		<dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{@render field('Probabilité', String(likelihood))}
			{@render field('Impact', String(impact))}
			{@render field('Score (1–25)', String(score), `${testId}-score`)}
			{@render field('Niveau', labelOf(riskLevelName, level), `${testId}-level`)}
		</dl>
	</div>
{/snippet}

{#snippet relationState(
	rel: { allowed: boolean; loading: boolean; error: string; page: GrcPage<unknown> | null },
	denied: string,
	empty: string,
	testId: string
)}
	{#if !rel.allowed}
		<p class="text-sm text-muted-foreground" data-testid={`${testId}-denied`}>{denied}</p>
	{:else if rel.loading}
		<LoadingState label="Chargement…" />
	{:else if rel.error}
		<Alert tone="danger">{rel.error}</Alert>
	{:else if !rel.page || rel.page.items.length === 0}
		<p class="text-sm text-muted-foreground" data-testid={`${testId}-empty`}>{empty}</p>
	{/if}
{/snippet}

{#if loading}
	<LoadingState label="Chargement du risque…" />
{:else if accessDenied}
	<AccessDenied
		title="Risque non disponible"
		description="Votre profil n'inclut pas la permission de lecture des risques GRC."
	/>
{:else if !risk}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Risque introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/risks')} variant="secondary">Retour au registre</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-risk-detail">
		<PageHeader eyebrow="Registre des risques" title={risk.title} description={risk.reference}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={risk?.residualLevel ?? ''}
						label={`Résiduel : ${risk?.residualScore} · ${labelOf(riskLevelName, risk?.residualLevel ?? '')}`}
						data-testid="grc-risk-residual-badge"
					/>
					<StatusBadge
						status={risk?.inherentLevel ?? ''}
						label={`Inhérent : ${risk?.inherentScore} · ${labelOf(riskLevelName, risk?.inherentLevel ?? '')}`}
						data-testid="grc-risk-inherent-badge"
					/>
					<StatusBadge
						status={risk?.status ?? ''}
						label={`Statut : ${labelOf(riskStatusLabel, risk?.status ?? '')}`}
						data-testid="grc-risk-status"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/risks')} variant="secondary">Registre</LinkButton>
					{#if canUpdate}
						<Button onclick={() => (formOpen = true)} data-testid="grc-risk-edit">Modifier</Button>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		<Card
			title="Évaluation"
			subtitle="Le risque résiduel est la référence opérationnelle"
			class="min-w-0"
		>
			<div class="grid gap-4 lg:grid-cols-2">
				{@render dimension(
					'Risque résiduel',
					risk.residualLikelihood,
					risk.residualImpact,
					risk.residualScore,
					risk.residualLevel,
					'grc-risk-residual'
				)}
				{@render dimension(
					'Risque inhérent',
					risk.likelihood,
					risk.impact,
					risk.inherentScore,
					risk.inherentLevel,
					'grc-risk-inherent'
				)}
			</div>
		</Card>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Identification" class="min-w-0">
				<dl class="grid gap-4">
					{@render field('Description', risk.description || 'Aucune description')}
					{@render field('Menace', risk.threat || 'Non renseignée')}
					{@render field('Vulnérabilité', risk.vulnerability || 'Non renseignée')}
				</dl>
			</Card>
			<Card title="Traitement et responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Traitement', labelOf(riskTreatmentLabel, risk.treatment))}
					{@render field('Échéance du traitement', formatRiskDate(risk.treatmentDueAt))}
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Actif concerné</dt>
						<dd class="mt-1 text-sm text-foreground" data-testid="grc-risk-asset">
							{#if risk.asset}
								<a href={resolve('/grc/assets/[id]', { id: String(risk.asset.id) })}
									>{risk.asset.code} — {risk.asset.name}</a
								>
							{:else}
								Aucun
							{/if}
						</dd>
					</div>
					{@render field('Service propriétaire', serviceLabel(risk.owningService))}
					{@render field('Propriétaire', ownerLabel(risk.ownerProfile), 'grc-risk-owner')}
					{@render field('Approbateur', ownerLabel(risk.approverProfile))}
					{@render field('Créé le', formatAssetDate(risk.createdAt))}
					{@render field('Mis à jour le', formatAssetDate(risk.updatedAt))}
				</dl>
			</Card>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<Card title="Contrôles liés" subtitle="Lecture seule" class="min-w-0">
				<div data-testid="grc-risk-controls">
					{@render relationState(
						controls,
						'La consultation nécessite la lecture des contrôles GRC.',
						'Aucun contrôle lié.',
						'grc-risk-controls'
					)}
					{#if controls.allowed && controls.page && controls.page.items.length}
						<ul class="divide-y divide-border">
							{#each controls.page.items as control (control.id)}
								<li class="flex items-center justify-between gap-3 py-2 text-sm">
									<span class="min-w-0"><b>{control.code}</b> · {control.name}</span>
									<StatusBadge
										status={control.status}
										label={labelOf(statusLabel, control.status)}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>
			<Card title="Actions de remédiation" subtitle="Lecture seule" class="min-w-0">
				<div data-testid="grc-risk-actions">
					{@render relationState(
						actions,
						'La consultation nécessite la lecture des actions GRC.',
						'Aucune action liée.',
						'grc-risk-actions'
					)}
					{#if actions.allowed && actions.page && actions.page.items.length}
						<ul class="divide-y divide-border">
							{#each actions.page.items as action (action.id)}
								<li class="flex items-center justify-between gap-3 py-2 text-sm">
									<span class="min-w-0">
										<a href={resolve('/grc/actions/[id]', { id: String(action.id) })}
											><b>{action.reference}</b></a
										>
										· {action.title}
										{#if action.overdue}<span class="block text-xs text-danger">En retard</span
											>{/if}
									</span>
									<StatusBadge status={action.status} label={labelOf(statusLabel, action.status)} />
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>
			<Card title="Constats" subtitle="Lecture seule" class="min-w-0">
				<div data-testid="grc-risk-findings">
					{@render relationState(
						findings,
						'La consultation nécessite la lecture des constats GRC.',
						'Aucun constat lié.',
						'grc-risk-findings'
					)}
					{#if findings.allowed && findings.page && findings.page.items.length}
						<ul class="divide-y divide-border">
							{#each findings.page.items as finding (finding.id)}
								<li class="flex items-center justify-between gap-3 py-2 text-sm">
									<span class="min-w-0">
										<a href={resolve('/grc/findings/[id]', { id: String(finding.id) })}
											><b>{finding.reference}</b></a
										>
										· {finding.title}
										{#if finding.overdue}<span class="block text-xs text-danger">En retard</span
											>{/if}
									</span>
									<StatusBadge
										status={finding.status}
										label={labelOf(statusLabel, finding.status)}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>
		</div>
	</div>

	{#if canUpdate}
		<RiskFormModal bind:open={formOpen} {risk} onsaved={(saved) => (risk = saved)} />
	{/if}
{/if}
