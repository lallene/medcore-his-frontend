<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { getGrcEvidence, listGrcEvidenceAssessments } from '$lib/api/grc';
	import type { GrcEvidence, GrcLinkedAssessment } from '$lib/types/grc';
	import EvidenceFormModal from '$lib/components/grc/EvidenceFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		assessmentStatusLabel,
		implementationStatusLabel
	} from '$lib/components/grc/control-state';
	import { assessmentResultLabel } from '$lib/components/grc/dashboard-state';
	import {
		evidenceAccess,
		evidenceStatusLabel,
		evidenceTypeLabel,
		evidenceValidityLabel,
		evidenceValidityTone,
		externalLink,
		implementationLabel,
		labelOf
	} from '$lib/components/grc/evidence-state';
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

	let evidence = $state<GrcEvidence | null>(null);
	let access = $state<ReturnType<typeof evidenceAccess> | null>(null);
	let assessments = $state<GrcLinkedAssessment[] | null>(null);
	let assessmentsError = $state('');
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);

	const evidenceId = $derived(Number(page.params.id));

	onMount(async () => {
		access = evidenceAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
			error = 'Identifiant de preuve invalide.';
			loading = false;
			return;
		}
		try {
			evidence = await getGrcEvidence(evidenceId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger la preuve.');
			loading = false;
			return;
		}
		loading = false;
		if (access.readAssessments)
			listGrcEvidenceAssessments(evidenceId)
				.then((p) => (assessments = p.items))
				.catch(
					(e) => (assessmentsError = resolveUserErrorMessage(e, 'Évaluations indisponibles.'))
				);
	});

	const link = $derived(evidence ? externalLink(evidence.externalReference) : null);
	const revoked = $derived(evidence?.status === 'REVOKED');
</script>

<svelte:head>
	<title>{evidence ? `${evidence.reference} · Preuve` : 'Preuve'} | MedCore HIS</title>
</svelte:head>

{#snippet field(label: string, value: string, testId = '')}
	<div class="min-w-0">
		<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
		<dd class="mt-1 break-words text-sm text-foreground" data-testid={testId || undefined}>
			{value}
		</dd>
	</div>
{/snippet}

{#if loading}
	<LoadingState label="Chargement de la preuve…" />
{:else if accessDenied}
	<AccessDenied
		title="Preuve non disponible"
		description="Votre profil n'inclut pas la permission de lecture des preuves GRC."
	/>
{:else if !evidence || !access}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Preuve introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/evidence')} variant="secondary">Retour au registre</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-evidence-detail">
		<PageHeader
			eyebrow="Preuves & documents"
			title={evidence.title}
			description={evidence.reference}
		>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={evidenceValidityTone[evidence?.validity ?? ''] ?? ''}
						label={`Validité : ${labelOf(evidenceValidityLabel, evidence?.validity ?? '')}`}
						data-testid="grc-evidence-validity"
					/>
					<StatusBadge
						status={evidence?.status ?? ''}
						label={`Statut : ${labelOf(evidenceStatusLabel, evidence?.status ?? '')}`}
						data-testid="grc-evidence-status"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/evidence')} variant="secondary">Registre</LinkButton>
					{#if access?.manage && !revoked}
						<Button onclick={() => (editOpen = true)} data-testid="grc-evidence-edit"
							>Modifier</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if revoked}
			<Alert tone="info" role="status"
				>Preuve révoquée : elle est conservée pour la traçabilité et n’est plus modifiable.</Alert
			>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Preuve" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Référence', evidence.reference)}
					{@render field('Type', labelOf(evidenceTypeLabel, evidence.type))}
					{@render field('Collectée le', formatRiskDate(evidence.collectedAt))}
					{@render field('Valide à partir du', formatRiskDate(evidence.validFrom))}
					{@render field(
						'Expire le',
						evidence.expiresAt ? formatRiskDate(evidence.expiresAt) : 'Sans expiration',
						'grc-evidence-expires'
					)}
					{@render field('Validité', labelOf(evidenceValidityLabel, evidence.validity))}
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{evidence.description || 'Aucune description'}
						</dd>
					</div>
				</dl>
			</Card>

			<Card
				title="Document"
				subtitle="Référence vers le document ; aucun fichier n’est stocké dans MedCore"
				class="min-w-0"
			>
				<div class="space-y-3" data-testid="grc-evidence-document">
					{#if !evidence.externalReference}
						<p class="text-sm text-muted-foreground" data-testid="grc-evidence-document-empty">
							Aucune référence documentaire.
						</p>
					{:else if link}
						<p class="text-sm">
							<!-- eslint-disable svelte/no-navigation-without-resolve -- external document URL, validated by externalLink() -->
							<a
								href={link}
								target="_blank"
								rel="noopener noreferrer"
								class="break-all"
								data-testid="grc-evidence-document-link">{evidence.externalReference}</a
							>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</p>
						<p class="text-xs text-muted-foreground">Lien externe, ouvert dans un nouvel onglet.</p>
					{:else}
						<p class="text-sm break-all text-foreground" data-testid="grc-evidence-document-text">
							{evidence.externalReference}
						</p>
						<p class="text-xs text-muted-foreground">Référence interne (GED, archive…).</p>
					{/if}
				</div>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Contrôle mis en œuvre" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2" data-testid="grc-evidence-implementation">
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Implémentation</dt>
						<dd class="mt-1 text-sm">
							{#if access.readImplementations}
								<a
									href={resolve('/grc/controls/implementations/[id]', {
										id: String(evidence.controlImplementationId)
									})}>{implementationLabel(evidence)}</a
								>
							{:else}
								{implementationLabel(evidence)}
							{/if}
							{#if evidence.controlImplementation}
								<span class="block text-xs text-muted-foreground">
									{labelOf(implementationStatusLabel, evidence.controlImplementation.status)}
								</span>
							{/if}
						</dd>
					</div>
					{#if evidence.controlImplementation?.control}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">Contrôle</dt>
							<dd class="mt-1 text-sm">
								{#if access.readControls}
									<a
										href={resolve('/grc/controls/[id]', {
											id: String(evidence.controlImplementation.control.id)
										})}
										>{evidence.controlImplementation.control.code} — {evidence.controlImplementation
											.control.name}</a
									>
								{:else}
									{evidence.controlImplementation.control.code} — {evidence.controlImplementation
										.control.name}
								{/if}
							</dd>
						</div>
					{/if}
					{#if evidence.controlImplementation?.asset}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">Actif</dt>
							<dd class="mt-1 text-sm">
								{#if access.readAssets}
									<a
										href={resolve('/grc/assets/[id]', {
											id: String(evidence.controlImplementation.asset.id)
										})}
										>{evidence.controlImplementation.asset.code} — {evidence.controlImplementation
											.asset.name}</a
									>
								{:else}
									{evidence.controlImplementation.asset.code} — {evidence.controlImplementation
										.asset.name}
								{/if}
							</dd>
						</div>
					{/if}
				</dl>
			</Card>
			<Card title="Responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Propriétaire', ownerLabel(evidence.ownerProfile))}
					{@render field('Service propriétaire', serviceLabel(evidence.owningService))}
					{@render field('Créée le', formatAssetDate(evidence.createdAt))}
					{@render field('Mise à jour le', formatAssetDate(evidence.updatedAt))}
				</dl>
			</Card>
		</div>

		<Card title="Évaluations ayant examiné cette preuve" subtitle="Lecture seule" class="min-w-0">
			<div data-testid="grc-evidence-assessments">
				{#if !access.readAssessments}
					<p class="text-sm text-muted-foreground" data-testid="grc-evidence-assessments-denied">
						La consultation nécessite la lecture des évaluations GRC.
					</p>
				{:else if assessmentsError}
					<Alert tone="danger">{assessmentsError}</Alert>
				{:else if assessments === null}
					<LoadingState label="Chargement…" />
				{:else if assessments.length === 0}
					<p class="text-sm text-muted-foreground" data-testid="grc-evidence-assessments-empty">
						Aucune évaluation n’a examiné cette preuve.
					</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each assessments as assessment (assessment.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
								<span class="min-w-0">
									<b>{assessment.reference}</b> · {assessment.title}
									<span class="block text-xs text-muted-foreground">
										{assessment.result
											? `Résultat : ${labelOf(assessmentResultLabel, assessment.result)}`
											: 'Sans résultat'}
									</span>
								</span>
								<StatusBadge
									status={assessment.status}
									label={labelOf(assessmentStatusLabel, assessment.status)}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</Card>
	</div>

	{#if access.manage && !revoked}
		<EvidenceFormModal bind:open={editOpen} {evidence} onsaved={(saved) => (evidence = saved)} />
	{/if}
{/if}
