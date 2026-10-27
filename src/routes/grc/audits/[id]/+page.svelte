<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { completeGrcAudit, getGrcAudit, listGrcAuditFindings } from '$lib/api/grc';
	import type { GrcAudit, GrcFinding } from '$lib/types/grc';
	import AuditFormModal from '$lib/components/grc/AuditFormModal.svelte';
	import FindingFormModal from '$lib/components/grc/FindingFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		auditAccess,
		auditActions,
		auditStatusLabel,
		auditTypeLabel,
		findingCountText,
		findingSeverityLabel,
		findingStatusLabel,
		labelOf,
		type AuditAccess
	} from '$lib/components/grc/audit-state';
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

	let audit = $state<GrcAudit | null>(null);
	let access = $state<AuditAccess | null>(null);
	let findings = $state<GrcFinding[] | null>(null);
	let findingsError = $state('');
	let loading = $state(true);
	let error = $state('');
	let transitionError = $state('');
	let accessDenied = $state(false);
	let editOpen = $state(false);
	let findingOpen = $state(false);
	let completeOpen = $state(false);

	const auditId = $derived(Number(page.params.id));

	async function loadFindings() {
		if (!access?.readFindings) return;
		findingsError = '';
		try {
			findings = (await listGrcAuditFindings(auditId)).items;
		} catch (e) {
			findingsError = resolveUserErrorMessage(e, 'Constats indisponibles.');
		}
	}

	async function refresh() {
		audit = await getGrcAudit(auditId);
		await loadFindings();
	}

	async function complete() {
		transitionError = '';
		try {
			audit = await completeGrcAudit(auditId);
		} catch (e) {
			transitionError = resolveUserErrorMessage(e, 'Impossible de terminer l’audit.');
		}
	}

	onMount(async () => {
		access = auditAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		if (!Number.isInteger(auditId) || auditId <= 0) {
			error = 'Identifiant d’audit invalide.';
			loading = false;
			return;
		}
		try {
			audit = await getGrcAudit(auditId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’audit.');
			loading = false;
			return;
		}
		loading = false;
		void loadFindings();
	});

	const can = $derived(audit && access ? auditActions(audit, access) : null);
	// Risques visés par les constats de cet audit (relation Finding → Risk), sans doublon.
	const relatedRisks = $derived(
		findings
			? [...new Map(findings.filter((f) => f.risk).map((f) => [f.risk!.id, f.risk!])).values()]
			: []
	);
</script>

<svelte:head>
	<title>{audit ? `${audit.reference} · Audit` : 'Audit'} | MedCore HIS</title>
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
	<LoadingState label="Chargement de l’audit…" />
{:else if accessDenied}
	<AccessDenied
		title="Audit non disponible"
		description="Votre profil n'inclut pas la permission de lecture des audits GRC."
	/>
{:else if !audit || !access || !can}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Audit introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/audits')} variant="secondary">Retour aux audits</LinkButton>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-audit-detail">
		<PageHeader eyebrow="Audits" title={audit.title} description={audit.reference}>
			{#snippet meta()}
				<div class="flex flex-wrap gap-2">
					<StatusBadge
						status={audit?.status ?? ''}
						label={`Statut : ${labelOf(auditStatusLabel, audit?.status ?? '')}`}
						data-testid="grc-audit-status"
					/>
					<StatusBadge
						status="INFO"
						label={`Type : ${labelOf(auditTypeLabel, audit?.type ?? '')}`}
					/>
				</div>
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap gap-2">
					<LinkButton href={resolve('/grc/audits')} variant="secondary">Audits</LinkButton>
					{#if can?.edit}
						<Button
							variant="secondary"
							onclick={() => (editOpen = true)}
							data-testid="grc-audit-edit">Modifier</Button
						>
					{/if}
					{#if can?.complete}
						<Button onclick={() => (completeOpen = true)} data-testid="grc-audit-complete"
							>Terminer l’audit</Button
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if transitionError}
			<div data-testid="grc-audit-transition-error">
				<Alert tone="danger">{transitionError}</Alert>
			</div>
		{/if}
		{#if audit.status === 'COMPLETED' || audit.status === 'CANCELLED'}
			<Alert tone="info" role="status"
				>Audit {labelOf(auditStatusLabel, audit.status).toLowerCase()} : il n’est plus modifiable.</Alert
			>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Planification et cycle de vie" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2" data-testid="grc-audit-planning">
					{@render field('Début prévu', formatRiskDate(audit.plannedStartAt))}
					{@render field('Fin prévue', formatRiskDate(audit.plannedEndAt))}
					{@render field('Démarré le', formatRiskDate(audit.startedAt))}
					{@render field('Terminé le', formatRiskDate(audit.completedAt))}
					{@render field('Constats', findingCountText(audit), 'grc-audit-finding-counts')}
					{@render field('Mis à jour le', formatAssetDate(audit.updatedAt))}
				</dl>
			</Card>
			<Card title="Périmètre et responsabilités" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{@render field('Responsable de l’audit', ownerLabel(audit.leadAuditorProfile))}
					{@render field('Service propriétaire', serviceLabel(audit.owningService))}
					<div class="sm:col-span-2">
						{@render field('Périmètre', audit.scope || 'Non renseigné', 'grc-audit-scope')}
					</div>
					<div class="sm:col-span-2">
						{@render field('Description', audit.description || 'Aucune description')}
					</div>
				</dl>
			</Card>
		</div>

		<section
			class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs"
			data-testid="grc-audit-findings"
		>
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
			>
				<h2 class="text-base font-semibold text-foreground">Constats</h2>
				{#if can.addFinding}
					<Button size="sm" onclick={() => (findingOpen = true)} data-testid="grc-finding-create"
						>Nouveau constat</Button
					>
				{:else if access.createFindings && audit.status !== 'IN_PROGRESS'}
					<p class="text-xs text-muted-foreground">
						Les constats se saisissent pendant un audit en cours.
					</p>
				{/if}
			</div>
			{#if !access.readFindings}
				<p class="p-4 text-sm text-muted-foreground" data-testid="grc-audit-findings-denied">
					Vous n’avez pas l’autorisation de consulter les constats.
				</p>
			{:else if findingsError}
				<Alert tone="danger" class="m-4">{findingsError}</Alert>
			{:else}
				<Table variant="plain" minWidth="820px" caption="Constats de l’audit">
					<thead>
						<tr>
							<th>Référence</th>
							<th>Titre</th>
							<th>Sévérité</th>
							<th>Statut</th>
							<th>Échéance</th>
							<th>Risque</th>
						</tr>
					</thead>
					<tbody
						>{#if findings === null}<TableState
								state="loading"
								colspan={6}
								rows={2}
							/>{:else if findings.length === 0}<TableState
								state="empty"
								colspan={6}
								title="Aucun constat"
								data-testid="grc-audit-findings-empty"
							/>{:else}
							{#each findings as finding (finding.id)}
								<tr data-testid={`grc-finding-row-${finding.id}`}>
									<td class="font-medium whitespace-nowrap">
										<a href={resolve('/grc/findings/[id]', { id: String(finding.id) })}
											>{finding.reference}</a
										>
									</td>
									<td>{finding.title}</td>
									<td
										><StatusBadge
											status={finding.severity}
											label={labelOf(findingSeverityLabel, finding.severity)}
										/></td
									>
									<td
										><StatusBadge
											status={finding.status}
											label={labelOf(findingStatusLabel, finding.status)}
										/></td
									>
									<td class="whitespace-nowrap">
										{formatRiskDate(finding.dueAt)}
										{#if finding.overdue}<span class="block text-xs font-medium text-danger"
												>En retard</span
											>{/if}
									</td>
									<td>{finding.risk ? finding.risk.reference : '—'}</td>
								</tr>
							{/each}
						{/if}</tbody
					>
				</Table>
			{/if}
		</section>

		{#if access.readFindings && findings && findings.length > 0}
			<div class="grid gap-6 lg:grid-cols-2">
				<Card
					title="Risques visés par les constats"
					subtitle="Via la relation constat → risque"
					class="min-w-0"
				>
					<div data-testid="grc-audit-risks">
						{#if relatedRisks.length === 0}
							<p class="text-sm text-muted-foreground">Aucun constat n’est rattaché à un risque.</p>
						{:else}
							<ul class="divide-y divide-border">
								{#each relatedRisks as risk (risk.id)}
									<li class="py-2 text-sm">
										{#if access.readRisks}
											<a href={resolve('/grc/risks/[id]', { id: String(risk.id) })}
												><b>{risk.reference}</b></a
											>
										{:else}
											<b>{risk.reference}</b>
										{/if}
										· {risk.title}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</Card>
				<Card title="Actions de remédiation" subtitle="Via les constats" class="min-w-0">
					<div class="text-sm" data-testid="grc-audit-actions">
						{#if access.readActions}
							<p class="text-muted-foreground">
								Les actions sont suivies sur chaque constat et dans le plan d’actions.
							</p>
							<ul class="mt-2 space-y-1">
								{#each findings as finding (finding.id)}
									<li>
										<!-- eslint-disable svelte/no-navigation-without-resolve -- query after resolve('/grc/actions') -->
										<a href={`${resolve('/grc/actions')}?findingId=${finding.id}`}
											>Actions de {finding.reference}</a
										>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-muted-foreground" data-testid="grc-audit-actions-denied">
								Vous n’avez pas l’autorisation de consulter les actions de remédiation.
							</p>
						{/if}
					</div>
				</Card>
			</div>
		{/if}
	</div>

	{#if can.edit}
		<AuditFormModal bind:open={editOpen} {audit} onsaved={(saved) => (audit = saved)} />
	{/if}
	{#if can.addFinding}
		<FindingFormModal
			bind:open={findingOpen}
			auditId={audit.id}
			auditLabel={`audit ${audit.reference}`}
			onsaved={() => void refresh()}
		/>
	{/if}
	<ConfirmDialog
		bind:open={completeOpen}
		title="Terminer l’audit ?"
		description="L’audit passera au statut « Terminé » et ne pourra plus être modifié."
		confirmLabel="Terminer l’audit"
		danger={false}
		onconfirm={complete}
	/>
{/if}
