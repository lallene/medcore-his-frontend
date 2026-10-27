<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import {
		getGrcRequirement,
		linkGrcRequirementControl,
		listGrcRequirementControls,
		searchGrcControls,
		unlinkGrcRequirementControl
	} from '$lib/api/grc';
	import type { GrcLinkedControl, GrcRequirement } from '$lib/types/grc';
	import {
		canManageMapping,
		canReadControls,
		canReadRequirements,
		labelOf,
		mappingLabel,
		requirementStatusLabel
	} from '$lib/components/grc/compliance-state';
	import { formatAssetDate } from '$lib/components/grc/asset-state';
	import { statusLabel } from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
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

	let requirement = $state<GrcRequirement | null>(null);
	let controls = $state<GrcLinkedControl[]>([]);
	let loading = $state(true);
	let controlsLoading = $state(false);
	let error = $state('');
	let controlsError = $state('');
	let accessDenied = $state(false);
	let controlsAllowed = $state(false);
	let mappingAllowed = $state(false);

	// Ajout d'un lien : recherche parmi les contrôles (grc.control.read) puis lien (grc.control.manage).
	let search = $state('');
	let candidates = $state<GrcLinkedControl[]>([]);
	let selectedControl = $state('');
	let mappingError = $state('');
	let mappingBusy = $state(false);
	let unlinkTarget = $state<GrcLinkedControl | null>(null);
	let unlinkOpen = $state(false);

	const requirementId = $derived(Number(page.params.id));

	async function loadControls() {
		controlsLoading = true;
		controlsError = '';
		try {
			controls = (await listGrcRequirementControls(requirementId)).items;
		} catch (e) {
			controlsError = resolveUserErrorMessage(e, 'Impossible de charger les contrôles liés.');
		} finally {
			controlsLoading = false;
		}
	}

	async function refresh() {
		requirement = await getGrcRequirement(requirementId);
		await loadControls();
	}

	async function searchCandidates() {
		mappingError = '';
		try {
			candidates = (await searchGrcControls(search.trim())).items;
			selectedControl = '';
		} catch (e) {
			mappingError = resolveUserErrorMessage(e, 'Recherche de contrôles indisponible.');
		}
	}

	async function link() {
		if (!selectedControl) return;
		mappingBusy = true;
		mappingError = '';
		try {
			await linkGrcRequirementControl(requirementId, Number(selectedControl));
			selectedControl = '';
			await refresh();
		} catch (e) {
			mappingError = resolveUserErrorMessage(e, 'Impossible de lier ce contrôle.');
		} finally {
			mappingBusy = false;
		}
	}

	async function unlink() {
		if (!unlinkTarget) return;
		mappingBusy = true;
		mappingError = '';
		try {
			await unlinkGrcRequirementControl(requirementId, unlinkTarget.id);
			await refresh();
		} catch (e) {
			mappingError = resolveUserErrorMessage(e, 'Impossible de retirer ce lien.');
		} finally {
			mappingBusy = false;
			unlinkTarget = null;
		}
	}

	onMount(async () => {
		const permissions = getStoredPermissions();
		if (!canReadRequirements(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		controlsAllowed = canReadControls(permissions);
		// Gérer le mapping suppose aussi de voir les contrôles à lier.
		mappingAllowed = controlsAllowed && canManageMapping(permissions);
		if (!Number.isInteger(requirementId) || requirementId <= 0) {
			error = 'Identifiant d’exigence invalide.';
			loading = false;
			return;
		}
		try {
			requirement = await getGrcRequirement(requirementId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’exigence.');
			loading = false;
			return;
		}
		loading = false;
		if (controlsAllowed) void loadControls();
		if (mappingAllowed) void searchCandidates();
	});

	const linkable = $derived(candidates.filter((c) => !controls.some((l) => l.id === c.id)));
</script>

<svelte:head>
	<title>{requirement ? `${requirement.code} · Exigence` : 'Exigence'} | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement de l’exigence…" />
{:else if accessDenied}
	<AccessDenied
		title="Exigence non disponible"
		description="Votre profil n'inclut pas la permission de lecture des exigences de conformité."
	/>
{:else if !requirement}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Exigence introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/compliance')} variant="secondary"
			>Retour à la conformité</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-requirement-detail">
		<PageHeader eyebrow="Exigence" title={requirement.title} description={requirement.code}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={requirement?.status ?? ''}
						label={`Statut : ${labelOf(requirementStatusLabel, requirement?.status ?? '')}`}
						data-testid="grc-requirement-status"
					/>
					<StatusBadge
						status={(requirement?.mappedControls ?? 0) > 0 ? 'COMPLETED' : 'PENDING'}
						label={mappingLabel(requirement?.mappedControls ?? 0)}
						data-testid="grc-requirement-mapping"
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<LinkButton
					href={resolve('/grc/compliance/frameworks/[id]', {
						id: String(requirement?.frameworkId)
					})}
					variant="secondary"
				>
					Référentiel
				</LinkButton>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Exigence" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Référentiel</dt>
						<dd class="mt-1 text-sm text-foreground" data-testid="grc-requirement-framework">
							{#if requirement.framework}
								<a
									href={resolve('/grc/compliance/frameworks/[id]', {
										id: String(requirement.framework.id)
									})}
									>{requirement.framework.code} — {requirement.framework.name} ({requirement
										.framework.version})</a
								>
							{:else}
								Référentiel n° {requirement.frameworkId}
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs font-medium text-muted-foreground">Exigence parente</dt>
						<dd class="mt-1 text-sm text-foreground">
							{#if requirement.parentRequirement}
								<a
									href={resolve('/grc/compliance/requirements/[id]', {
										id: String(requirement.parentRequirement.id)
									})}
									>{requirement.parentRequirement.code} — {requirement.parentRequirement.title}</a
								>
							{:else}
								Aucune
							{/if}
						</dd>
					</div>
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{requirement.description || 'Aucune description'}
						</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-muted-foreground">Créée le</dt>
						<dd class="mt-1 text-sm">{formatAssetDate(requirement.createdAt)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-muted-foreground">Mise à jour le</dt>
						<dd class="mt-1 text-sm">{formatAssetDate(requirement.updatedAt)}</dd>
					</div>
				</dl>
			</Card>

			<Card
				title="Contrôles liés"
				subtitle={mappingLabel(requirement.mappedControls)}
				class="min-w-0"
			>
				<div class="space-y-4" data-testid="grc-requirement-controls">
					{#if !controlsAllowed}
						<p class="text-sm text-muted-foreground" data-testid="grc-requirement-controls-denied">
							La consultation des contrôles nécessite la permission de lecture des contrôles GRC.
						</p>
					{:else if controlsLoading}
						<LoadingState label="Chargement des contrôles…" />
					{:else if controlsError}
						<Alert tone="danger">{controlsError}</Alert>
					{:else if controls.length === 0}
						<p class="text-sm text-muted-foreground" data-testid="grc-requirement-controls-empty">
							Aucun contrôle lié : l’exigence n’est pas couverte.
						</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each controls as control (control.id)}
								<li
									class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
									data-testid={`grc-linked-control-${control.id}`}
								>
									<span class="min-w-0"><b>{control.code}</b> · {control.name}</span>
									<span class="flex items-center gap-2">
										<StatusBadge
											status={control.status}
											label={labelOf(statusLabel, control.status)}
										/>
										{#if mappingAllowed}
											<Button
												variant="ghost"
												size="sm"
												disabled={mappingBusy}
												aria-label={`Retirer le lien avec ${control.code}`}
												onclick={() => {
													unlinkTarget = control;
													unlinkOpen = true;
												}}
												data-testid={`grc-unlink-${control.id}`}
											>
												Retirer
											</Button>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					{/if}

					{#if mappingAllowed}
						<div class="space-y-2 border-t border-border pt-4" data-testid="grc-mapping-form">
							<p class="text-sm font-medium text-foreground">Lier un contrôle</p>
							<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
								<Input
									id="grc-control-search"
									bind:value={search}
									placeholder="Code, nom ou catégorie"
									data-testid="grc-control-search"
								/>
								<Button variant="secondary" onclick={searchCandidates}>Rechercher</Button>
							</div>
							<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
								<select
									aria-label="Contrôle à lier"
									class="min-h-control w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
									bind:value={selectedControl}
									data-testid="grc-control-select"
								>
									<option value="">Choisir un contrôle…</option>
									{#each linkable as control (control.id)}
										<option value={String(control.id)}>
											{control.code} — {control.name} ({labelOf(statusLabel, control.status)})
										</option>
									{/each}
								</select>
								<Button
									onclick={link}
									disabled={!selectedControl || mappingBusy}
									data-testid="grc-link-control">Lier</Button
								>
							</div>
							{#if mappingError}<Alert tone="danger">{mappingError}</Alert>{/if}
						</div>
					{/if}
				</div>
			</Card>
		</div>
	</div>

	<ConfirmDialog
		bind:open={unlinkOpen}
		title="Retirer ce lien ?"
		description={unlinkTarget
			? `Le contrôle ${unlinkTarget.code} ne couvrira plus l’exigence ${requirement.code}. La couverture du référentiel sera recalculée.`
			: ''}
		confirmLabel="Retirer le lien"
		loading={mappingBusy}
		onconfirm={unlink}
		oncancel={() => (unlinkTarget = null)}
	/>
{/if}
