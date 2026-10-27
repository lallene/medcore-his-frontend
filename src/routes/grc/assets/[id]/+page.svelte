<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { getGrcAsset, listGrcAssetRisks } from '$lib/api/grc';
	import type { GrcAsset, GrcPage, GrcRiskSummary } from '$lib/types/grc';
	import AssetFormModal from '$lib/components/grc/AssetFormModal.svelte';
	import {
		assetCriticalityLabel,
		assetStatusLabel,
		assetTypeLabel,
		canManageAssets,
		canReadAssetRisks,
		canReadAssets,
		formatAssetDate,
		labelOf,
		ownerLabel,
		serviceLabel
	} from '$lib/components/grc/asset-state';
	import { riskStatusLabel, scoreText } from '$lib/components/grc/risk-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
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

	let asset = $state<GrcAsset | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canManage = $state(false);
	let canReadRisks = $state(false);
	let formOpen = $state(false);

	let risks = $state<GrcPage<GrcRiskSummary> | null>(null);
	let risksLoading = $state(false);
	let risksError = $state('');

	const assetId = $derived(Number(page.params.id));

	async function loadRisks(id: number) {
		risksLoading = true;
		risksError = '';
		try {
			risks = await listGrcAssetRisks(id);
		} catch (e) {
			risksError = resolveUserErrorMessage(e, 'Impossible de charger les risques associés.');
		} finally {
			risksLoading = false;
		}
	}

	onMount(async () => {
		const permissions = getStoredPermissions();
		if (!canReadAssets(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		canManage = canManageAssets(permissions);
		canReadRisks = canReadAssetRisks(permissions);
		if (!Number.isInteger(assetId) || assetId <= 0) {
			error = 'Identifiant d’actif invalide.';
			loading = false;
			return;
		}
		try {
			asset = await getGrcAsset(assetId);
			if (canReadRisks) void loadRisks(assetId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’actif.');
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{asset ? `${asset.code} · Actif GRC` : 'Actif GRC'} | MedCore HIS</title>
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
	<LoadingState label="Chargement de l’actif…" />
{:else if accessDenied}
	<AccessDenied
		title="Actif non disponible"
		description="Votre profil n'inclut pas la permission de lecture des actifs GRC."
	/>
{:else if !asset}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Actif introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/assets')} variant="secondary">Retour au registre</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-asset-detail">
		<PageHeader eyebrow="Registre des actifs" title={asset.name} description={asset.code}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={asset?.criticality ?? ''}
						label={`Criticité : ${labelOf(assetCriticalityLabel, asset?.criticality ?? '')}`}
						data-testid="grc-asset-criticality"
					/>
					<StatusBadge
						status={asset?.status ?? ''}
						label={`Statut : ${labelOf(assetStatusLabel, asset?.status ?? '')}`}
						data-testid="grc-asset-status"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/assets')} variant="secondary">Registre</LinkButton>
					{#if canManage}
						<Button onclick={() => (formOpen = true)} data-testid="grc-asset-edit">Modifier</Button>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Identité et classification" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Code', asset.code, 'grc-asset-code')}
					{@render field('Nom', asset.name)}
					{@render field('Type', labelOf(assetTypeLabel, asset.type), 'grc-asset-type')}
					{@render field('Criticité', labelOf(assetCriticalityLabel, asset.criticality))}
					{@render field('Statut', labelOf(assetStatusLabel, asset.status))}
					<div class="sm:col-span-2">
						{@render field('Description', asset.description || 'Aucune description')}
					</div>
				</dl>
			</Card>
			<Card title="Responsabilités et traçabilité" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Propriétaire', ownerLabel(asset.ownerProfile), 'grc-asset-owner')}
					{@render field(
						'Service propriétaire',
						serviceLabel(asset.owningService),
						'grc-asset-service'
					)}
					{@render field('Créé le', formatAssetDate(asset.createdAt))}
					{@render field('Mis à jour le', formatAssetDate(asset.updatedAt))}
				</dl>
			</Card>
		</div>

		<Card
			title="Risques associés"
			subtitle="Risques dont l’actif concerné est cet actif"
			class="min-w-0"
		>
			{#if !canReadRisks}
				<p class="text-sm text-muted-foreground" data-testid="grc-asset-risks-denied">
					La consultation des risques nécessite la permission de lecture des risques GRC.
				</p>
			{:else}
				{#if risksError}<Alert tone="danger">{risksError}</Alert>{/if}
				<Table
					variant="plain"
					minWidth="640px"
					caption="Risques associés à l’actif"
					data-testid="grc-asset-risks"
				>
					<thead>
						<tr>
							<th>Référence</th>
							<th>Titre</th>
							<th>Risque résiduel</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody
						>{#if risksLoading}<TableState
								state="loading"
								colspan={4}
								rows={2}
							/>{:else if !risks || risks.items.length === 0}<TableState
								state="empty"
								colspan={4}
								title="Aucun risque associé"
							/>{:else}
							{#each risks.items as risk (risk.id)}
								<tr>
									<td class="font-medium whitespace-nowrap">
										<a href={resolve('/grc/risks/[id]', { id: String(risk.id) })}
											>{risk.reference}</a
										>
									</td>
									<td>{risk.title}</td>
									<td>{scoreText(risk.residualScore, risk.residualLevel)}</td>
									<td>
										<StatusBadge
											status={risk.status}
											label={labelOf(riskStatusLabel, risk.status)}
										/>
									</td>
								</tr>
							{/each}
						{/if}</tbody
					>
				</Table>
				{#if risks && risks.total > risks.items.length}
					<p class="mt-3 text-xs text-muted-foreground">
						{risks.items.length} risque(s) affiché(s) sur {risks.total}.
					</p>
				{/if}
			{/if}
		</Card>
	</div>

	{#if canManage}
		<AssetFormModal bind:open={formOpen} {asset} onsaved={(saved) => (asset = saved)} />
	{/if}
{/if}
