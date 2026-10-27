<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		closeGrcIncident,
		getGrcAsset,
		getGrcIncident,
		getGrcRisk,
		listGrcActions
	} from '$lib/api/grc';
	import type { GrcAction, GrcAsset, GrcRisk, GrcSecurityIncident } from '$lib/types/grc';
	import IncidentFormModal from '$lib/components/grc/IncidentFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		actionDueStateLabel,
		actionPriorityLabel,
		actionStatusLabel,
		labelOf as actionLabel
	} from '$lib/components/grc/action-state';
	import {
		incidentAccess,
		incidentActions,
		incidentSeverityLabel,
		incidentStatusLabel,
		incidentStatusMeaning,
		incidentStatusOptions,
		labelOf,
		type IncidentAccess
	} from '$lib/components/grc/incident-state';
	import { riskLevelName } from '$lib/components/grc/risk-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let incident = $state<GrcSecurityIncident | null>(null);
	let access = $state<IncidentAccess | null>(null);
	let risk = $state<GrcRisk | null>(null);
	let asset = $state<GrcAsset | null>(null);
	let actions = $state<GrcAction[] | null>(null);
	let riskError = $state('');
	let assetError = $state('');
	let actionsError = $state('');
	let loading = $state(true);
	let error = $state('');
	let transitionError = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);
	let closeOpen = $state(false);

	const incidentId = $derived(Number(page.params.id));

	async function loadRelations(item: GrcSecurityIncident) {
		risk = null;
		asset = null;
		actions = null;
		riskError = '';
		assetError = '';
		actionsError = '';
		if (!access) return;
		if (item.riskId && access.readRisks) {
			try {
				risk = await getGrcRisk(item.riskId);
			} catch (e) {
				riskError = resolveUserErrorMessage(e, 'Risque indisponible.');
			}
		}
		if (item.assetId && access.readAssets) {
			try {
				asset = await getGrcAsset(item.assetId);
			} catch (e) {
				assetError = resolveUserErrorMessage(e, 'Actif indisponible.');
			}
		}
		if (item.riskId && access.readActions) {
			try {
				actions = (await listGrcActions({ riskId: item.riskId, limit: 50 })).items;
			} catch (e) {
				actionsError = resolveUserErrorMessage(e, 'Actions du risque indisponibles.');
			}
		}
	}

	async function closeIncident() {
		transitionError = '';
		try {
			incident = await closeGrcIncident(incidentId);
			if (incident) await loadRelations(incident);
		} catch (e) {
			transitionError = resolveUserErrorMessage(e, 'Impossible de clôturer l’incident.');
		}
	}

	onMount(async () => {
		access = incidentAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(incidentId) || incidentId <= 0) {
			error = 'Identifiant d’incident invalide.';
			loading = false;
			return;
		}
		try {
			const item = await getGrcIncident(incidentId);
			incident = item;
			loading = false;
			void loadRelations(item);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’incident.');
			loading = false;
		}
	});

	const can = $derived(incident && access ? incidentActions(incident, access) : null);
	const when = (iso: string | null) => (iso ? formatAssetDate(iso) : 'Non renseignée');
</script>

<svelte:head>
	<title>{incident ? `${incident.reference} · Incident` : 'Incident'} | MedCore HIS</title>
</svelte:head>

{#snippet field(label: string, value: string)}
	<div class="min-w-0">
		<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
		<dd class="mt-1 break-words text-sm whitespace-pre-line text-foreground">{value}</dd>
	</div>
{/snippet}

{#if loading}
	<LoadingState label="Chargement de l’incident…" />
{:else if accessDenied}
	<AccessDenied
		title="Incident non disponible"
		description="Votre profil n'inclut pas la permission de lecture des incidents de sécurité."
	/>
{:else if !incident || !access || !can}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Incident introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/incidents')} variant="secondary"
			>Retour aux incidents</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-incident-detail">
		<PageHeader
			eyebrow="Incidents de sécurité"
			title={incident.title}
			description={incident.reference}
		>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={incident?.status ?? ''}
						label={`Statut : ${labelOf(incidentStatusLabel, incident?.status ?? '')}`}
						data-testid="grc-incident-status"
					/>
					<StatusBadge
						status={incident?.severity ?? ''}
						label={`Sévérité : ${labelOf(incidentSeverityLabel, incident?.severity ?? '')}`}
						data-testid="grc-incident-severity"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/incidents')} variant="secondary">Incidents</LinkButton>
					{#if can.edit}
						<Button
							variant="secondary"
							onclick={() => (editOpen = true)}
							data-testid="grc-incident-edit">Modifier</Button
						>
					{/if}
					{#if can.close}
						<Button onclick={() => (closeOpen = true)} data-testid="grc-incident-close"
							>Clôturer l’incident</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if transitionError}
			<div data-testid="grc-incident-transition-error">
				<Alert tone="danger">{transitionError}</Alert>
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-2">
			<Card title="Identification">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Référence', incident.reference)}
					{@render field('Titre', incident.title)}
					<div class="sm:col-span-2">
						{@render field('Description', incident.description || 'Aucune description')}
					</div>
				</dl>
			</Card>
			<Card title="Classification">
				<dl class="grid gap-4">
					{@render field('Sévérité', labelOf(incidentSeverityLabel, incident.severity))}
					<p class="text-sm text-muted-foreground">
						La sévérité de l’incident est indépendante du niveau du risque lié.
					</p>
				</dl>
			</Card>
			<Card title="Cycle de vie">
				<dl class="grid gap-4">
					{@render field('Statut', labelOf(incidentStatusLabel, incident.status))}
					{@render field(
						'Signification',
						incidentStatusMeaning[incident.status] ?? incident.status
					)}
					{@render field(
						'Transitions possibles',
						incidentStatusOptions(incident.status)
							.filter((status) => status !== incident?.status)
							.map((status) => labelOf(incidentStatusLabel, status))
							.join(', ') || 'Aucune par mise à jour'
					)}
				</dl>
			</Card>
			<Card title="Chronologie">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Détecté le', when(incident.detectedAt))}
					{@render field('Survenu le', when(incident.occurredAt))}
					{@render field('Résolu le', when(incident.resolvedAt))}
					{@render field('Clôturé le', when(incident.closedAt))}
				</dl>
			</Card>
			<Card title="Responsabilités">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Propriétaire', ownerLabel(incident.ownerProfile))}
					{@render field('Service', serviceLabel(incident.owningService))}
				</dl>
			</Card>
			<Card title="Métadonnées">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Créé le', formatAssetDate(incident.createdAt))}
					{@render field('Mis à jour le', formatAssetDate(incident.updatedAt))}
					{@render field('Créé par', String(incident.createdBy))}
					{@render field('Mis à jour par', String(incident.updatedBy))}
				</dl>
			</Card>
		</div>

		<Card title="Risque">
			{#if !incident.riskId}
				<p class="text-sm text-muted-foreground">Aucun risque n’est rattaché à cet incident.</p>
			{:else if !access.readRisks}
				<p class="text-sm text-muted-foreground" data-testid="grc-incident-risk-denied">
					La lecture du risque nécessite la permission correspondante.
				</p>
			{:else if riskError}
				<Alert tone="danger">{riskError}</Alert>
			{:else if risk}
				<dl class="grid gap-4 sm:grid-cols-2">
					<div>
						<dt class="text-xs font-medium text-muted-foreground">Risque</dt>
						<dd class="mt-1 text-sm">
							<a href={resolve('/grc/risks/[id]', { id: String(risk.id) })}
								>{risk.reference} — {risk.title}</a
							>
						</dd>
					</div>
					{@render field('Niveau résiduel', labelOf(riskLevelName, risk.residualLevel))}
				</dl>
			{:else}
				<p class="text-sm text-muted-foreground">Chargement du risque…</p>
			{/if}
		</Card>

		<Card title="Actif">
			{#if !incident.assetId}
				<p class="text-sm text-muted-foreground">Aucun actif n’est identifié.</p>
			{:else if !access.readAssets}
				<p class="text-sm text-muted-foreground" data-testid="grc-incident-asset-denied">
					La lecture de l’actif nécessite la permission correspondante.
				</p>
			{:else if assetError}
				<Alert tone="danger">{assetError}</Alert>
			{:else if asset}
				<p class="text-sm">
					<a href={resolve('/grc/assets/[id]', { id: String(asset.id) })}
						>{asset.code} — {asset.name}</a
					>
				</p>
			{:else}
				<p class="text-sm text-muted-foreground">Chargement de l’actif…</p>
			{/if}
		</Card>

		<section
			class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs"
			data-testid="grc-incident-risk-actions"
		>
			<div class="border-b border-border px-4 py-3">
				<h2 class="text-base font-semibold text-foreground">Actions liées au risque</h2>
				<p class="text-xs text-muted-foreground">
					Relation indirecte : ces actions portent sur le risque, pas sur l’incident.
				</p>
			</div>
			{#if !incident.riskId}
				<p class="p-4 text-sm text-muted-foreground">
					Aucune action n’est accessible tant que l’incident n’est pas rattaché à un risque.
				</p>
			{:else if !access.readActions}
				<p class="p-4 text-sm text-muted-foreground">
					La lecture des actions de remédiation nécessite la permission correspondante.
				</p>
			{:else if actionsError}
				<Alert tone="danger" class="m-4">{actionsError}</Alert>
			{:else}
				<Table variant="plain" minWidth="760px" caption="Actions liées au risque">
					<thead>
						<tr>
							<th>Référence</th>
							<th>Titre</th>
							<th>Statut</th>
							<th>Priorité</th>
							<th>Échéance</th>
						</tr>
					</thead>
					<tbody>
						{#if !actions}
							<TableState state="loading" colspan={5} title="Chargement des actions…" />
						{:else if actions.length === 0}
							<TableState state="empty" colspan={5} title="Aucune action sur ce risque" />
						{:else}
							{#each actions as action (action.id)}
								<tr>
									<td class="whitespace-nowrap">
										<a href={resolve('/grc/actions/[id]', { id: String(action.id) })}
											>{action.reference}</a
										>
									</td>
									<td>{action.title}</td>
									<td>{actionLabel(actionStatusLabel, action.status)}</td>
									<td>{actionLabel(actionPriorityLabel, action.priority)}</td>
									<td>{actionLabel(actionDueStateLabel, action.dueState)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</Table>
			{/if}
		</section>
	</div>

	<IncidentFormModal
		bind:open={editOpen}
		{incident}
		onsaved={(saved) => {
			incident = saved;
			void loadRelations(saved);
		}}
	/>
	<ConfirmDialog
		bind:open={closeOpen}
		title="Clôturer l’incident"
		description="La clôture est définitive. L’incident ne pourra plus être rouvert."
		confirmLabel="Clôturer l’incident"
		onconfirm={closeIncident}
	/>
{/if}
