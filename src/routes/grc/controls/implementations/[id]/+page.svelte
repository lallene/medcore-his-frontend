<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		getGrcImplementation,
		listGrcImplementationAssessments,
		listGrcImplementationEvidence
	} from '$lib/api/grc';
	import type {
		GrcControlImplementation,
		GrcLinkedAssessment,
		GrcLinkedEvidence
	} from '$lib/types/grc';
	import ImplementationFormModal from '$lib/components/grc/ImplementationFormModal.svelte';
	import {
		assetStatusLabel,
		formatAssetDate,
		ownerLabel,
		serviceLabel
	} from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		assessmentStatusLabel,
		controlAccess,
		controlStatusLabel,
		evidenceStatusLabel,
		implementationStatusLabel,
		labelOf,
		type ControlAccess
	} from '$lib/components/grc/control-state';
	import { assessmentResultLabel } from '$lib/components/grc/dashboard-state';
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

	let implementation = $state<GrcControlImplementation | null>(null);
	let access = $state<ControlAccess | null>(null);
	let assessments = $state<GrcLinkedAssessment[] | null>(null);
	let evidence = $state<GrcLinkedEvidence[] | null>(null);
	let assessmentsError = $state('');
	let evidenceError = $state('');
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);

	const implementationId = $derived(Number(page.params.id));

	onMount(async () => {
		access = controlAccess(getStoredPermissions());
		if (!access.readImplementations) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(implementationId) || implementationId <= 0) {
			error = 'Identifiant d’implémentation invalide.';
			loading = false;
			return;
		}
		try {
			implementation = await getGrcImplementation(implementationId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’implémentation.');
			loading = false;
			return;
		}
		loading = false;
		if (access.readAssessments)
			listGrcImplementationAssessments(implementationId)
				.then((p) => (assessments = p.items))
				.catch(
					(e) => (assessmentsError = resolveUserErrorMessage(e, 'Évaluations indisponibles.'))
				);
		if (access.readEvidence)
			listGrcImplementationEvidence(implementationId)
				.then((p) => (evidence = p.items))
				.catch((e) => (evidenceError = resolveUserErrorMessage(e, 'Preuves indisponibles.')));
	});

	const title = $derived(
		implementation
			? `${implementation.control?.code ?? `Contrôle n° ${implementation.controlId}`} sur ${implementation.asset?.code ?? `actif n° ${implementation.assetId}`}`
			: ''
	);
</script>

<svelte:head>
	<title>{implementation ? `${title} · Implémentation` : 'Implémentation'} | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement de l’implémentation…" />
{:else if accessDenied}
	<AccessDenied
		title="Implémentation non disponible"
		description="Votre profil n'inclut pas la permission de lecture des implémentations de contrôles."
	/>
{:else if !implementation || !access}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Implémentation introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/controls')} variant="secondary">Retour aux contrôles</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-implementation-detail">
		<PageHeader
			eyebrow="Implémentation de contrôle"
			{title}
			description={implementation.control?.name ?? ''}
		>
			{#snippet meta()}
				<StatusBadge
					status={implementation?.status ?? ''}
					label={`Statut : ${labelOf(implementationStatusLabel, implementation?.status ?? '')}`}
					data-testid="grc-implementation-status"
				/>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton
						href={resolve('/grc/controls/[id]', { id: String(implementation?.controlId) })}
						variant="secondary"
					>
						Contrôle
					</LinkButton>
					{#if access?.manageImplementations}
						<Button onclick={() => (editOpen = true)} data-testid="grc-implementation-edit"
							>Modifier</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Mise en œuvre" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Contrôle</dt>
						<dd class="mt-1 text-sm">
							<a href={resolve('/grc/controls/[id]', { id: String(implementation.controlId) })}>
								{implementation.control
									? `${implementation.control.code} — ${implementation.control.name}`
									: `Contrôle n° ${implementation.controlId}`}
							</a>
							{#if implementation.control}
								<span class="block text-xs text-muted-foreground"
									>{labelOf(controlStatusLabel, implementation.control.status)}</span
								>
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Actif</dt>
						<dd class="mt-1 text-sm" data-testid="grc-implementation-asset">
							{#if implementation.asset && access.readAssets}
								<a href={resolve('/grc/assets/[id]', { id: String(implementation.asset.id) })}
									>{implementation.asset.code} — {implementation.asset.name}</a
								>
							{:else if implementation.asset}
								{implementation.asset.code} — {implementation.asset.name}
							{:else}
								Actif n° {implementation.assetId}
							{/if}
							{#if implementation.asset}
								<span class="block text-xs text-muted-foreground"
									>{labelOf(assetStatusLabel, implementation.asset.status)}</span
								>
							{/if}
						</dd>
					</div>
					{#each [['Statut', labelOf(implementationStatusLabel, implementation.status)], ['Mise en œuvre le', formatRiskDate(implementation.implementedAt)], ['Dernière revue le', formatRiskDate(implementation.lastReviewedAt)], ['Mis à jour le', formatAssetDate(implementation.updatedAt)]] as [label, value] (label)}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
							<dd class="mt-1 text-sm text-foreground">{value}</dd>
						</div>
					{/each}
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Détails</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{implementation.implementationDetails || 'Aucun détail'}
						</dd>
					</div>
				</dl>
			</Card>
			<Card title="Responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{#each [['Propriétaire', ownerLabel(implementation.ownerProfile)], ['Service propriétaire', serviceLabel(implementation.owningService)], ['Créée le', formatAssetDate(implementation.createdAt)]] as [label, value] (label)}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
							<dd class="mt-1 text-sm text-foreground">{value}</dd>
						</div>
					{/each}
				</dl>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Évaluations" subtitle="Lecture seule" class="min-w-0">
				<div data-testid="grc-implementation-assessments">
					{#if !access.readAssessments}
						<p
							class="text-sm text-muted-foreground"
							data-testid="grc-implementation-assessments-denied"
						>
							La consultation nécessite la lecture des évaluations GRC.
						</p>
					{:else if assessmentsError}
						<Alert tone="danger">{assessmentsError}</Alert>
					{:else if assessments === null}
						<LoadingState label="Chargement…" />
					{:else if assessments.length === 0}
						<p
							class="text-sm text-muted-foreground"
							data-testid="grc-implementation-assessments-empty"
						>
							Aucune évaluation.
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
											{#if assessment.reassessmentDue}
												· Réévaluation due{/if}
											{#if assessment.hasInvalidEvidence}
												· Preuve non valide{/if}
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
			<Card
				title="Preuves"
				subtitle="Lecture seule · gestion dans « Preuves & documents »"
				class="min-w-0"
			>
				<div data-testid="grc-implementation-evidence">
					{#if access.readEvidence}
						<p class="mb-2 text-xs">
							<!-- eslint-disable svelte/no-navigation-without-resolve -- query after resolve('/grc/evidence') -->
							<a
								href={`${resolve('/grc/evidence')}?controlImplementationId=${implementation.id}`}
								data-testid="grc-implementation-evidence-registry"
								>Ouvrir dans le registre des preuves</a
							>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</p>
					{/if}
					{#if !access.readEvidence}
						<p
							class="text-sm text-muted-foreground"
							data-testid="grc-implementation-evidence-denied"
						>
							La consultation nécessite la lecture des preuves GRC.
						</p>
					{:else if evidenceError}
						<Alert tone="danger">{evidenceError}</Alert>
					{:else if evidence === null}
						<LoadingState label="Chargement…" />
					{:else if evidence.length === 0}
						<p
							class="text-sm text-muted-foreground"
							data-testid="grc-implementation-evidence-empty"
						>
							Aucune preuve.
						</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each evidence as item (item.id)}
								<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
									<span class="min-w-0">
										<a href={resolve('/grc/evidence/[id]', { id: String(item.id) })}
											><b>{item.reference}</b></a
										>
										· {item.title}
										<span class="block text-xs text-muted-foreground">
											{item.expiresAt
												? `Expire le ${formatRiskDate(item.expiresAt)}`
												: 'Sans expiration'}{item.expired ? ' · Expirée' : ''}
										</span>
									</span>
									<StatusBadge
										status={item.expired ? 'EXPIRED' : item.status}
										label={item.expired ? 'Expirée' : labelOf(evidenceStatusLabel, item.status)}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>
		</div>
	</div>

	{#if access.manageImplementations}
		<ImplementationFormModal
			bind:open={editOpen}
			controlId={implementation.controlId}
			controlLabel={implementation.control?.code ?? String(implementation.controlId)}
			{implementation}
			onsaved={(saved) => (implementation = saved)}
		/>
	{/if}
{/if}
