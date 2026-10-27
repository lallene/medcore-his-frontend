<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		getGrcControl,
		linkGrcControlRisk,
		linkGrcRequirementControl,
		listGrcControlRequirements,
		listGrcControlRisks,
		listGrcImplementations,
		searchGrcRequirements,
		searchGrcRisks,
		unlinkGrcControlRisk,
		unlinkGrcRequirementControl
	} from '$lib/api/grc';
	import type {
		GrcControl,
		GrcControlImplementation,
		GrcRequirement,
		GrcRisk
	} from '$lib/types/grc';
	import ControlFormModal from '$lib/components/grc/ControlFormModal.svelte';
	import ImplementationFormModal from '$lib/components/grc/ImplementationFormModal.svelte';
	import RelationLinker from '$lib/components/grc/RelationLinker.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import { requirementStatusLabel } from '$lib/components/grc/compliance-state';
	import { riskStatusLabel, scoreText } from '$lib/components/grc/risk-state';
	import {
		canMapRequirements,
		canMapRisks,
		controlAccess,
		controlStatusLabel,
		countLabel,
		implementationStatusLabel,
		labelOf,
		type ControlAccess
	} from '$lib/components/grc/control-state';
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

	let control = $state<GrcControl | null>(null);
	let access = $state<ControlAccess | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);

	let requirements = $state<GrcRequirement[] | null>(null);
	let risks = $state<GrcRisk[] | null>(null);
	let implementations = $state<GrcControlImplementation[] | null>(null);
	let relationErrors = $state({ requirements: '', risks: '', implementations: '' });

	let editOpen = $state(false);
	let implementationOpen = $state(false);
	let pendingUnlink = $state<{ kind: 'requirement' | 'risk'; id: number; label: string } | null>(
		null
	);
	let unlinkOpen = $state(false);
	let unlinkError = $state('');

	const controlId = $derived(Number(page.params.id));

	async function loadRelations() {
		if (!access) return;
		const tasks: Promise<void>[] = [];
		if (access.readRequirements)
			tasks.push(
				listGrcControlRequirements(controlId)
					.then((p) => void (requirements = p.items))
					.catch(
						(e) =>
							void (relationErrors.requirements = resolveUserErrorMessage(
								e,
								'Exigences indisponibles.'
							))
					)
			);
		if (access.readRisks)
			tasks.push(
				listGrcControlRisks(controlId)
					.then((p) => void (risks = p.items))
					.catch(
						(e) =>
							void (relationErrors.risks = resolveUserErrorMessage(e, 'Risques indisponibles.'))
					)
			);
		if (access.readImplementations)
			tasks.push(
				listGrcImplementations({ controlId, limit: 100 })
					.then((p) => void (implementations = p.items))
					.catch(
						(e) =>
							void (relationErrors.implementations = resolveUserErrorMessage(
								e,
								'Implémentations indisponibles.'
							))
					)
			);
		await Promise.all(tasks);
	}

	async function refresh() {
		control = await getGrcControl(controlId);
		await loadRelations();
	}

	async function confirmUnlink() {
		if (!pendingUnlink) return;
		unlinkError = '';
		try {
			if (pendingUnlink.kind === 'requirement')
				await unlinkGrcRequirementControl(pendingUnlink.id, controlId);
			else await unlinkGrcControlRisk(controlId, pendingUnlink.id);
			await refresh();
		} catch (e) {
			unlinkError = resolveUserErrorMessage(e, 'Impossible de retirer ce lien.');
		} finally {
			pendingUnlink = null;
		}
	}

	onMount(async () => {
		access = controlAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(controlId) || controlId <= 0) {
			error = 'Identifiant de contrôle invalide.';
			loading = false;
			return;
		}
		try {
			control = await getGrcControl(controlId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le contrôle.');
			loading = false;
			return;
		}
		loading = false;
		void loadRelations();
	});

	const assignable = $derived(
		control ? control.status !== 'INACTIVE' && control.status !== 'RETIRED' : false
	);
</script>

<svelte:head>
	<title>{control ? `${control.code} · Contrôle` : 'Contrôle'} | MedCore HIS</title>
</svelte:head>

{#snippet unlinkButton(kind: 'requirement' | 'risk', id: number, label: string)}
	<Button
		variant="ghost"
		size="sm"
		aria-label={`Retirer le lien avec ${label}`}
		data-testid={`grc-unlink-${kind}-${id}`}
		onclick={() => {
			pendingUnlink = { kind, id, label };
			unlinkOpen = true;
		}}>Retirer</Button
	>
{/snippet}

{#if loading}
	<LoadingState label="Chargement du contrôle…" />
{:else if accessDenied}
	<AccessDenied
		title="Contrôle non disponible"
		description="Votre profil n'inclut pas la permission de lecture des contrôles GRC."
	/>
{:else if !control || !access}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Contrôle introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/controls')} variant="secondary">Retour au registre</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-control-detail">
		<PageHeader eyebrow="Contrôles" title={control.name} description={control.code}>
			{#snippet meta()}
				<StatusBadge
					status={control?.status ?? ''}
					label={`Statut : ${labelOf(controlStatusLabel, control?.status ?? '')}`}
					data-testid="grc-control-status"
				/>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/controls')} variant="secondary">Registre</LinkButton>
					{#if access?.manage}
						<Button onclick={() => (editOpen = true)} data-testid="grc-control-edit"
							>Modifier</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if unlinkError}<Alert tone="danger">{unlinkError}</Alert>{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Définition" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{#each [['Code', control.code], ['Catégorie', control.category || 'Non renseignée'], ['Statut', labelOf(controlStatusLabel, control.status)], ['Mis à jour le', formatAssetDate(control.updatedAt)]] as [label, value] (label)}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
							<dd class="mt-1 break-words text-sm text-foreground">{value}</dd>
						</div>
					{/each}
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{control.description || 'Aucune description'}
						</dd>
					</div>
				</dl>
			</Card>
			<Card title="Responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{#each [['Propriétaire', ownerLabel(control.ownerProfile)], ['Service propriétaire', serviceLabel(control.owningService)], ['Créé le', formatAssetDate(control.createdAt)], ['Relations', `${countLabel(control.requirementCount, 'exigence', 'exigences')} · ${countLabel(control.riskCount, 'risque', 'risques')} · ${countLabel(control.implementationCount, 'implémentation', 'implémentations')}`]] as [label, value] (label)}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
							<dd class="mt-1 break-words text-sm text-foreground">{value}</dd>
						</div>
					{/each}
				</dl>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Exigences couvertes" subtitle="Mapping de conformité (GRC-05)" class="min-w-0">
				<div class="space-y-3" data-testid="grc-control-requirements">
					{#if !access.readRequirements}
						<p class="text-sm text-muted-foreground" data-testid="grc-control-requirements-denied">
							La consultation nécessite la lecture des exigences de conformité.
						</p>
					{:else if relationErrors.requirements}
						<Alert tone="danger">{relationErrors.requirements}</Alert>
					{:else if requirements === null}
						<LoadingState label="Chargement…" />
					{:else if requirements.length === 0}
						<p class="text-sm text-muted-foreground" data-testid="grc-control-requirements-empty">
							Aucune exigence liée.
						</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each requirements as requirement (requirement.id)}
								<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
									<a
										class="min-w-0"
										href={resolve('/grc/compliance/requirements/[id]', {
											id: String(requirement.id)
										})}
									>
										<b>{requirement.code}</b> · {requirement.title}
									</a>
									<span class="flex items-center gap-2">
										<StatusBadge
											status={requirement.status}
											label={labelOf(requirementStatusLabel, requirement.status)}
										/>
										{#if canMapRequirements(access)}{@render unlinkButton(
												'requirement',
												requirement.id,
												requirement.code
											)}{/if}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
					{#if canMapRequirements(access) && requirements !== null}
						<RelationLinker
							id="grc-control-requirement"
							title="Lier une exigence"
							placeholder="Code ou titre d’exigence"
							linked={requirements.map((r) => r.id)}
							search={async (term) =>
								(await searchGrcRequirements(term)).items.map((r) => ({
									id: r.id,
									label: `${r.framework?.code ?? ''} ${r.code} — ${r.title}`.trim()
								}))}
							onlink={async (id) => {
								await linkGrcRequirementControl(id, controlId);
								await refresh();
							}}
						/>
					{/if}
				</div>
			</Card>

			<Card title="Risques traités" subtitle="Relation contrôle ↔ risque" class="min-w-0">
				<div class="space-y-3" data-testid="grc-control-risks">
					{#if !access.readRisks}
						<p class="text-sm text-muted-foreground" data-testid="grc-control-risks-denied">
							La consultation nécessite la lecture du registre des risques.
						</p>
					{:else if relationErrors.risks}
						<Alert tone="danger">{relationErrors.risks}</Alert>
					{:else if risks === null}
						<LoadingState label="Chargement…" />
					{:else if risks.length === 0}
						<p class="text-sm text-muted-foreground" data-testid="grc-control-risks-empty">
							Aucun risque lié.
						</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each risks as risk (risk.id)}
								<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
									<a class="min-w-0" href={resolve('/grc/risks/[id]', { id: String(risk.id) })}>
										<b>{risk.reference}</b> · {risk.title}
										<span class="block text-xs text-muted-foreground"
											>Résiduel : {scoreText(risk.residualScore, risk.residualLevel)}</span
										>
									</a>
									<span class="flex items-center gap-2">
										<StatusBadge
											status={risk.status}
											label={labelOf(riskStatusLabel, risk.status)}
										/>
										{#if canMapRisks(access)}{@render unlinkButton(
												'risk',
												risk.id,
												risk.reference
											)}{/if}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
					{#if canMapRisks(access) && risks !== null}
						<RelationLinker
							id="grc-control-risk"
							title="Lier un risque"
							placeholder="Référence ou titre du risque"
							linked={risks.map((r) => r.id)}
							search={async (term) =>
								(await searchGrcRisks(term)).items.map((r) => ({
									id: r.id,
									label: `${r.reference} — ${r.title}`
								}))}
							onlink={async (id) => {
								await linkGrcControlRisk(controlId, id);
								await refresh();
							}}
						/>
					{/if}
				</div>
			</Card>
		</div>

		<section
			class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs"
			data-testid="grc-control-implementations"
		>
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
			>
				<h2 class="text-base font-semibold text-foreground">Implémentations</h2>
				{#if access.manageImplementations && access.readAssets}
					<Button
						size="sm"
						disabled={!assignable}
						onclick={() => (implementationOpen = true)}
						data-testid="grc-implementation-create">Nouvelle implémentation</Button
					>
				{/if}
			</div>
			{#if access.manageImplementations && access.readAssets && !assignable}
				<p class="px-4 pt-3 text-xs text-muted-foreground">
					Un contrôle inactif ou retiré ne peut pas recevoir de nouvelle implémentation.
				</p>
			{/if}
			{#if !access.readImplementations}
				<p
					class="p-4 text-sm text-muted-foreground"
					data-testid="grc-control-implementations-denied"
				>
					La consultation nécessite la lecture des implémentations de contrôles.
				</p>
			{:else if relationErrors.implementations}
				<Alert tone="danger" class="m-4">{relationErrors.implementations}</Alert>
			{:else}
				<Table variant="plain" minWidth="760px" caption="Implémentations du contrôle">
					<thead>
						<tr>
							<th>Actif</th>
							<th>Statut</th>
							<th>Propriétaire</th>
							<th>Service</th>
							<th>Dernière revue</th>
						</tr>
					</thead>
					<tbody
						>{#if implementations === null}<TableState
								state="loading"
								colspan={5}
								rows={2}
							/>{:else if implementations.length === 0}<TableState
								state="empty"
								colspan={5}
								title="Aucune implémentation"
								data-testid="grc-control-implementations-empty"
							/>{:else}
							{#each implementations as implementation (implementation.id)}
								<tr data-testid={`grc-implementation-row-${implementation.id}`}>
									<td class="font-medium">
										<a
											href={resolve('/grc/controls/implementations/[id]', {
												id: String(implementation.id)
											})}
										>
											{implementation.asset
												? `${implementation.asset.code} — ${implementation.asset.name}`
												: `Actif n° ${implementation.assetId}`}
										</a>
									</td>
									<td>
										<StatusBadge
											status={implementation.status}
											label={labelOf(implementationStatusLabel, implementation.status)}
										/>
									</td>
									<td>{ownerLabel(implementation.ownerProfile)}</td>
									<td>{serviceLabel(implementation.owningService)}</td>
									<td class="whitespace-nowrap"
										>{implementation.lastReviewedAt
											? formatAssetDate(implementation.lastReviewedAt)
											: '—'}</td
									>
								</tr>
							{/each}
						{/if}</tbody
					>
				</Table>
			{/if}
		</section>
	</div>

	{#if access.manage}
		<ControlFormModal bind:open={editOpen} {control} onsaved={(saved) => (control = saved)} />
	{/if}
	{#if access.manageImplementations && access.readAssets}
		<ImplementationFormModal
			bind:open={implementationOpen}
			controlId={control.id}
			controlLabel={control.code}
			onsaved={() => void refresh()}
		/>
	{/if}
	<ConfirmDialog
		bind:open={unlinkOpen}
		title="Retirer ce lien ?"
		description={pendingUnlink
			? `Le lien entre ${control.code} et ${pendingUnlink.label} sera supprimé${pendingUnlink.kind === 'requirement' ? ' ; la couverture de conformité sera recalculée' : ''}.`
			: ''}
		confirmLabel="Retirer le lien"
		onconfirm={confirmUnlink}
		oncancel={() => (pendingUnlink = null)}
	/>
{/if}
