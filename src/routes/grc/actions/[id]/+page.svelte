<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { getGrcAction } from '$lib/api/grc';
	import type { GrcAction } from '$lib/types/grc';
	import ActionFormModal from '$lib/components/grc/ActionFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate, riskStatusLabel } from '$lib/components/grc/risk-state';
	import {
		actionAccess,
		actionDueStateLabel,
		actionDueStateTone,
		actionPriorityLabel,
		actionStatusLabel,
		findingStatusLabel,
		labelOf
	} from '$lib/components/grc/action-state';
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

	let action = $state<GrcAction | null>(null);
	let access = $state<ReturnType<typeof actionAccess> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);

	const actionId = $derived(Number(page.params.id));

	onMount(async () => {
		access = actionAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(actionId) || actionId <= 0) {
			error = 'Identifiant d’action invalide.';
			loading = false;
			return;
		}
		try {
			action = await getGrcAction(actionId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’action.');
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{action ? `${action.reference} · Action` : 'Action'} | MedCore HIS</title>
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
	<LoadingState label="Chargement de l’action…" />
{:else if accessDenied}
	<AccessDenied
		title="Action non disponible"
		description="Votre profil n'inclut pas la permission de lecture des actions de remédiation."
	/>
{:else if !action || !access}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Action introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/actions')} variant="secondary"
			>Retour au plan d’actions</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-action-detail">
		<PageHeader eyebrow="Plans d’actions" title={action.title} description={action.reference}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={action?.status ?? ''}
						label={`Statut : ${labelOf(actionStatusLabel, action?.status ?? '')}`}
						data-testid="grc-action-status"
					/>
					<StatusBadge
						status={actionDueStateTone[action?.dueState ?? ''] ?? ''}
						label={`Échéance : ${labelOf(actionDueStateLabel, action?.dueState ?? '')}`}
						data-testid="grc-action-due-state"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/actions')} variant="secondary">Plan d’actions</LinkButton>
					{#if access?.update}
						<Button onclick={() => (editOpen = true)} data-testid="grc-action-edit">Modifier</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Action" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Priorité', labelOf(actionPriorityLabel, action.priority))}
					{@render field('Statut', labelOf(actionStatusLabel, action.status))}
					{@render field(
						'Échéance',
						action.dueAt ? formatRiskDate(action.dueAt) : 'Sans échéance',
						'grc-action-due'
					)}
					{@render field('Suivi', labelOf(actionDueStateLabel, action.dueState))}
					{@render field(
						'Réalisée le',
						action.completedAt ? formatRiskDate(action.completedAt) : '—'
					)}
					{@render field('Mise à jour le', formatAssetDate(action.updatedAt))}
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{action.description || 'Aucune description'}
						</dd>
					</div>
				</dl>
			</Card>
			<Card title="Responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Responsable', ownerLabel(action.assigneeProfile))}
					{@render field('Service propriétaire', serviceLabel(action.owningService))}
					{@render field('Créée le', formatAssetDate(action.createdAt))}
				</dl>
			</Card>
		</div>

		<Card
			title="Cibles"
			subtitle="Constat, risque et implémentation de contrôle visés"
			class="min-w-0"
		>
			<dl class="grid gap-4 md:grid-cols-3" data-testid="grc-action-targets">
				<div class="min-w-0" data-testid="grc-action-finding">
					<dt class="text-xs font-medium text-muted-foreground">Constat</dt>
					<dd class="mt-1 text-sm">
						{#if action.finding}
							{#if access.readFindings}
								<a href={resolve('/grc/findings/[id]', { id: String(action.finding.id) })}
									>{action.finding.reference} — {action.finding.title}</a
								>
							{:else}
								{action.finding.reference} — {action.finding.title}
							{/if}
							<span class="block text-xs text-muted-foreground"
								>{labelOf(findingStatusLabel, action.finding.status)}</span
							>
						{:else}
							Aucun
						{/if}
					</dd>
				</div>
				<div class="min-w-0" data-testid="grc-action-risk">
					<dt class="text-xs font-medium text-muted-foreground">Risque</dt>
					<dd class="mt-1 text-sm">
						{#if action.risk && access.readRisks}
							<a href={resolve('/grc/risks/[id]', { id: String(action.risk.id) })}
								>{action.risk.reference} — {action.risk.title}</a
							>
						{:else if action.risk}
							{action.risk.reference} — {action.risk.title}
						{:else}
							Aucun
						{/if}
						{#if action.risk}
							<span class="block text-xs text-muted-foreground"
								>{labelOf(riskStatusLabel, action.risk.status)}</span
							>
						{/if}
					</dd>
				</div>
				<div class="min-w-0" data-testid="grc-action-implementation">
					<dt class="text-xs font-medium text-muted-foreground">Implémentation de contrôle</dt>
					<dd class="mt-1 text-sm">
						{#if action.controlImplementation}
							{#if access.readImplementations}
								<a
									href={resolve('/grc/controls/implementations/[id]', {
										id: String(action.controlImplementation.id)
									})}
								>
									{action.controlImplementation.control?.code ?? 'Contrôle'} sur {action
										.controlImplementation.asset?.code ?? 'actif'}
								</a>
							{:else}
								{action.controlImplementation.control?.code ?? 'Contrôle'} sur {action
									.controlImplementation.asset?.code ?? 'actif'}
							{/if}
							{#if action.controlImplementation.asset}
								<span class="block text-xs text-muted-foreground"
									>Actif : {action.controlImplementation.asset.name}</span
								>
							{/if}
						{:else}
							Aucune
						{/if}
					</dd>
				</div>
			</dl>
		</Card>
	</div>

	{#if access.update}
		<ActionFormModal bind:open={editOpen} {action} onsaved={(saved) => (action = saved)} />
	{/if}
{/if}
