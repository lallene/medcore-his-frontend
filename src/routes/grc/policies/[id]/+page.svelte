<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { approveGrcPolicy, getGrcPolicy, publishGrcPolicy, retireGrcPolicy } from '$lib/api/grc';
	import type { GrcGovernancePolicy } from '$lib/types/grc';
	import PolicyFormModal from '$lib/components/grc/PolicyFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		labelOf,
		policyAccess,
		policyActions,
		policyStatusLabel,
		policyStatusMeaning,
		type PolicyAccess
	} from '$lib/components/grc/policy-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
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

	let policy = $state<GrcGovernancePolicy | null>(null);
	let loading = $state(true);
	let error = $state('');
	let transitionError = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);
	let retireOpen = $state(false);
	let busy = $state(false);
	let access = $state<PolicyAccess | null>(null);

	const id = $derived(Number(page.params.id));
	const can = $derived(policy && access ? policyActions(policy, access) : null);

	async function load() {
		loading = true;
		error = '';
		try {
			policy = await getGrcPolicy(id);
		} catch (cause) {
			policy = null;
			if (isAccessDeniedError(cause)) accessDenied = true;
			else error = resolveUserErrorMessage(cause, 'Impossible de charger la politique.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		access = policyAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		void load();
	});

	async function run(action: () => Promise<GrcGovernancePolicy>) {
		busy = true;
		transitionError = '';
		try {
			policy = await action();
		} catch (cause) {
			transitionError = resolveUserErrorMessage(cause, 'Action impossible.');
		} finally {
			busy = false;
		}
	}

	async function approve() {
		const current = policy;
		if (!current) return;
		await run(() => approveGrcPolicy(current.id));
	}

	async function publish() {
		const current = policy;
		if (!current) return;
		await run(() => publishGrcPolicy(current.id));
	}

	async function retire() {
		const current = policy;
		if (!current) return;
		await run(() => retireGrcPolicy(current.id));
	}

	const day = (iso: string | null) => iso?.slice(0, 10) || '—';
</script>

<svelte:head>
	<title>{policy ? policy.reference : 'Politique'} | MedCore HIS</title>
</svelte:head>

{#snippet field(label: string, value: string)}
	<div class="min-w-0">
		<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
		<dd class="mt-1 break-words text-sm whitespace-pre-line text-foreground">{value}</dd>
	</div>
{/snippet}

{#if loading}
	<LoadingState label="Chargement de la politique…" />
{:else if accessDenied}
	<AccessDenied
		title="Politique non disponible"
		description="Votre profil n'inclut pas la permission de lecture des politiques de gouvernance."
	/>
{:else if !policy || !access || !can}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Politique introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/policies')} variant="secondary"
			>Retour aux politiques</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-policy-detail">
		<PageHeader eyebrow="Politiques" title={policy.title} description={policy.reference}>
			{#snippet meta()}
				<StatusBadge
					status={policy?.status ?? ''}
					label={`Statut : ${labelOf(policyStatusLabel, policy?.status ?? '')}`}
					data-testid="grc-policy-status"
				/>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/policies')} variant="secondary">Politiques</LinkButton>
					{#if can.edit}
						<Button
							variant="secondary"
							onclick={() => (editOpen = true)}
							data-testid="grc-policy-edit">Modifier</Button
						>
					{/if}
					{#if can.approve}
						<Button
							onclick={approve}
							disabled={can.approveBlocked || busy}
							data-testid="grc-policy-approve"
						>
							Approuver
						</Button>
					{/if}
					{#if can.publish}
						<Button
							onclick={publish}
							disabled={can.publishBlocked || busy}
							data-testid="grc-policy-publish"
						>
							Publier
						</Button>
					{/if}
					{#if can.retire}
						<Button onclick={() => (retireOpen = true)} data-testid="grc-policy-retire"
							>Retirer</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if can.approve && can.approveBlocked}
			<Alert tone="warning">Un approbateur doit être désigné avant l’approbation.</Alert>
		{/if}
		{#if can.publish && can.publishBlocked}
			<Alert tone="warning">Un début d’effet est obligatoire pour publier la politique.</Alert>
		{/if}
		{#if transitionError}
			<div data-testid="grc-policy-transition-error">
				<Alert tone="danger">{transitionError}</Alert>
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-2">
			<Card title="Identification">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Référence', policy.reference)}
					{@render field('Titre', policy.title)}
					<div class="sm:col-span-2">
						{@render field('Description', policy.description || 'Aucune description')}
					</div>
				</dl>
			</Card>
			<Card title="Version">
				<dl class="grid gap-4">
					{@render field('Version', policy.version)}
					<p class="text-sm text-muted-foreground">
						La version est saisie explicitement. Elle n’est pas calculée.
					</p>
				</dl>
			</Card>
			<Card title="Cycle de vie">
				<dl class="grid gap-4">
					{@render field('Statut', labelOf(policyStatusLabel, policy.status))}
					{@render field('Signification', policyStatusMeaning[policy.status] ?? '—')}
				</dl>
			</Card>
			<Card title="Dates d’effet">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Début d’effet', day(policy.effectiveFrom))}
					{@render field('Fin d’effet', day(policy.effectiveTo))}
					<p class="text-sm text-muted-foreground sm:col-span-2">
						Une date de fin passée ne retire pas la politique. Le retrait reste explicite.
					</p>
				</dl>
			</Card>
			<Card title="Gouvernance">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Service', serviceLabel(policy.owningService))}
					{@render field('Propriétaire', ownerLabel(policy.ownerProfile))}
					{@render field('Approbateur', ownerLabel(policy.approverProfile))}
					{@render field(
						'Approuvée le',
						policy.approvedAt ? formatAssetDate(policy.approvedAt) : '—'
					)}
					{@render field(
						'Publiée le',
						policy.publishedAt ? formatAssetDate(policy.publishedAt) : '—'
					)}
					{@render field('Retirée le', policy.retiredAt ? formatAssetDate(policy.retiredAt) : '—')}
				</dl>
			</Card>
			<Card title="Métadonnées">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Créée le', formatAssetDate(policy.createdAt))}
					{@render field('Modifiée le', formatAssetDate(policy.updatedAt))}
				</dl>
			</Card>
			<Card title="Référentiels">
				{#if policy.frameworks?.length}
					<ul class="space-y-2 text-sm">
						{#each policy.frameworks as link (link.id)}
							<li>
								{#if access.readFrameworks}
									<a href={resolve('/grc/compliance/frameworks/[id]', { id: String(link.id) })}
										>{link.code} — {link.name}</a
									>
								{:else}
									{link.code} — {link.name}
								{/if}
								<span class="text-muted-foreground"> · {link.status}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground">Aucun référentiel lié.</p>
				{/if}
			</Card>
			<Card title="Contrôles">
				{#if policy.controls?.length}
					<ul class="space-y-2 text-sm">
						{#each policy.controls as link (link.id)}
							<li>
								{#if access.readControls}
									<a href={resolve('/grc/controls/[id]', { id: String(link.id) })}
										>{link.code} — {link.name}</a
									>
								{:else}
									{link.code} — {link.name}
								{/if}
								<span class="text-muted-foreground"> · {link.status}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground">Aucun contrôle lié.</p>
				{/if}
			</Card>
		</div>
	</div>

	<PolicyFormModal bind:open={editOpen} {policy} onsaved={(saved) => (policy = saved)} />
	<ConfirmDialog
		bind:open={retireOpen}
		title="Retirer la politique"
		description="Le retrait est définitif. La politique ne pourra plus être modifiée."
		confirmLabel="Retirer"
		loading={busy}
		onconfirm={retire}
	/>
{/if}
