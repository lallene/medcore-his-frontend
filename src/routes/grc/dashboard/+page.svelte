<script lang="ts">
	import { onMount } from 'svelte';
	import {
		AlertTriangle,
		ClipboardCheck,
		FileWarning,
		Layers,
		ListChecks,
		Server,
		ShieldAlert,
		Wrench
	} from 'lucide-svelte';

	import { getGrcDashboard } from '$lib/api/grc';
	import type { GrcDashboard } from '$lib/types/grc';
	import {
		GRC_WINDOW_DEFAULT,
		GRC_WINDOW_OPTIONS,
		assessmentResultLabel,
		assessmentResultTone,
		attentionItems,
		canReadGrcDashboard,
		coverageDetail,
		distributionRows,
		formatGeneratedAt,
		formatGrcNumber,
		formatGrcPercent,
		isGrcDashboardEmpty,
		parseGrcWindow,
		riskLevelLabel,
		riskLevelTone,
		severityLabel,
		type GrcDistributionRow
	} from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import DonutChart from '$lib/components/ui/DonutChart.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import RankedBarList from '$lib/components/ui/RankedBarList.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let dashboard = $state<GrcDashboard | null>(null);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state('');
	let accessDenied = $state(false);

	let expiringSoonDays = $state(String(GRC_WINDOW_DEFAULT));
	let dueSoonDays = $state(String(GRC_WINDOW_DEFAULT));

	const windowOptions = GRC_WINDOW_OPTIONS.map((days) => ({
		value: String(days),
		label: `${days} jours`
	}));

	async function load(): Promise<void> {
		const expiring = parseGrcWindow(expiringSoonDays);
		const due = parseGrcWindow(dueSoonDays);
		if (expiring === null || due === null) {
			error = 'La fenêtre doit être un nombre entier de jours entre 1 et 365.';
			return;
		}
		try {
			dashboard = await getGrcDashboard({ expiringSoonDays: expiring, dueSoonDays: due });
			error = '';
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le tableau de bord GRC.');
		}
	}

	// La valeur est lue sur l'événement : l'ordre avec bind:value n'est pas garanti.
	const selected = (e: Event) => (e.currentTarget as HTMLSelectElement).value;

	async function refresh(): Promise<void> {
		refreshing = true;
		await load();
		refreshing = false;
	}

	onMount(async () => {
		if (!canReadGrcDashboard(getStoredPermissions())) {
			accessDenied = true;
			loading = false;
			return;
		}
		await load();
		loading = false;
	});

	const empty = $derived(dashboard ? isGrcDashboardEmpty(dashboard) : false);
	const attention = $derived(dashboard ? attentionItems(dashboard) : []);
	const attentionTotal = $derived(attention.reduce((sum, item) => sum + item.count, 0));

	const residualRows = $derived(
		dashboard
			? distributionRows(dashboard.risks.residualByLevel, riskLevelLabel, riskLevelTone)
			: []
	);
	const inherentRows = $derived(
		dashboard
			? distributionRows(dashboard.risks.inherentByLevel, riskLevelLabel, riskLevelTone)
			: []
	);
	const assessmentRows = $derived(
		dashboard
			? distributionRows(
					dashboard.controls.implementationsByLatestAssessmentResult,
					assessmentResultLabel,
					assessmentResultTone
				)
			: []
	);

	interface SummaryCard {
		label: string;
		value: number;
		hint: string;
		icon: typeof Server;
		testId: string;
	}

	const summaryCards: SummaryCard[] = $derived(
		dashboard
			? [
					{
						label: 'Actifs',
						value: dashboard.summary.assets,
						hint: `${formatGrcNumber(dashboard.assets.active)} actifs en service · ${formatGrcNumber(dashboard.assets.critical)} critique(s)`,
						icon: Server,
						testId: 'grc-kpi-assets'
					},
					{
						label: 'Risques ouverts',
						value: dashboard.summary.openRisks,
						hint: 'Statut ouvert ou en traitement',
						icon: ShieldAlert,
						testId: 'grc-kpi-open-risks'
					},
					{
						label: 'Risques critiques ou élevés',
						value: dashboard.summary.criticalOrHighRisks,
						hint: 'Risques ouverts, score résiduel ≥ 10',
						icon: AlertTriangle,
						testId: 'grc-kpi-critical-high'
					},
					{
						label: 'Contrôles',
						value: dashboard.summary.controls,
						hint: `${formatGrcNumber(dashboard.controls.implementations)} mise(s) en œuvre`,
						icon: Layers,
						testId: 'grc-kpi-controls'
					},
					{
						label: 'Preuves non valides',
						value: dashboard.summary.evidenceIssues,
						hint: 'Brouillon, révoquée ou expirée',
						icon: FileWarning,
						testId: 'grc-kpi-evidence-issues'
					},
					{
						label: 'Actions ouvertes',
						value: dashboard.summary.openRemediationActions,
						hint: 'Ouvertes, en cours ou bloquées',
						icon: Wrench,
						testId: 'grc-kpi-open-actions'
					},
					{
						label: 'Constats ouverts',
						value: dashboard.summary.openFindings,
						hint: 'Hors clôturés et acceptés',
						icon: ClipboardCheck,
						testId: 'grc-kpi-open-findings'
					},
					{
						label: 'Éléments en retard',
						value: dashboard.summary.overdueItems,
						hint: 'Actions et constats dont l’échéance est dépassée',
						icon: ListChecks,
						testId: 'grc-kpi-overdue'
					}
				]
			: []
	);
</script>

{#snippet countList(title: string, rows: GrcDistributionRow[], testId: string)}
	<div class="min-w-0" data-testid={testId}>
		<p class="text-sm font-medium text-foreground">{title}</p>
		<dl class="mt-2 divide-y divide-border rounded-lg border border-border">
			{#each rows as row (row.id)}
				<div class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
					<dt class="min-w-0 truncate text-muted-foreground">{row.label}</dt>
					<dd class="shrink-0 font-semibold tabular-nums text-foreground">
						{formatGrcNumber(row.value)}
					</dd>
				</div>
			{/each}
		</dl>
	</div>
{/snippet}

{#snippet figure(label: string, value: number, testId: string)}
	<div class="rounded-lg border border-border bg-surface-muted px-3 py-2" data-testid={testId}>
		<p class="text-xs text-muted-foreground">{label}</p>
		<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatGrcNumber(value)}</p>
	</div>
{/snippet}

<svelte:head>
	<title>Tableau de bord GRC | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du tableau de bord GRC…" />
{:else if accessDenied}
	<AccessDenied
		title="Tableau de bord GRC non disponible"
		description="Votre profil n'inclut pas la permission de lecture du tableau de bord GRC."
	/>
{:else if !dashboard}
	<Alert tone="danger">{error || 'Impossible de charger le tableau de bord GRC.'}</Alert>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-dashboard">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Tableau de bord GRC"
			description="Synthèse en lecture seule des actifs, risques, contrôles, preuves, actions, évaluations, audits et constats."
		>
			{#snippet meta()}
				<p class="text-xs text-muted-foreground" data-testid="grc-generated-at">
					Calculé le {formatGeneratedAt(dashboard?.generatedAt ?? '')}
				</p>
			{/snippet}
			{#snippet actions()}
				<div class="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
					<label class="space-y-1 text-xs font-medium text-muted-foreground">
						<span>Preuves expirant sous</span>
						<Select
							options={windowOptions}
							bind:value={expiringSoonDays}
							disabled={refreshing}
							aria-label="Fenêtre d’expiration des preuves, en jours"
							data-testid="grc-window-expiring"
							onchange={(e) => {
								expiringSoonDays = selected(e);
								void refresh();
							}}
						/>
					</label>
					<label class="space-y-1 text-xs font-medium text-muted-foreground">
						<span>Actions à échéance sous</span>
						<Select
							options={windowOptions}
							bind:value={dueSoonDays}
							disabled={refreshing}
							aria-label="Fenêtre d’échéance des actions, en jours"
							data-testid="grc-window-due"
							onchange={(e) => {
								dueSoonDays = selected(e);
								void refresh();
							}}
						/>
					</label>
				</div>
			{/snippet}
		</PageHeader>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		{#if empty}
			<EmptyState
				title="Aucune donnée GRC"
				description="Aucun actif, risque, contrôle, référentiel, preuve, action, évaluation, audit ou constat n’est encore enregistré."
			/>
		{:else}
			<section aria-label="Indicateurs clés" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{#each summaryCards as card (card.testId)}
					<div data-testid={card.testId} class="min-w-0">
						<MetricCard
							icon={card.icon}
							title={card.label}
							value={formatGrcNumber(card.value)}
							detail={card.hint}
						/>
					</div>
				{/each}
			</section>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Card
					title="Points d’attention"
					subtitle={attentionTotal === 0
						? 'Aucun point d’attention'
						: `${formatGrcNumber(attentionTotal)} élément(s) à traiter`}
					class="min-w-0"
				>
					<ul class="space-y-2" data-testid="grc-attention">
						{#each attention as item (item.id)}
							<li
								class={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
									item.count === 0
										? 'border-border bg-surface'
										: item.tone === 'danger'
											? 'border-danger-border bg-danger-soft/55'
											: 'border-warning-border bg-warning-soft/55'
								}`}
								data-testid={`grc-attention-${item.id}`}
							>
								<div class="min-w-0">
									<p class="text-sm font-medium text-foreground">{item.label}</p>
									<p class="text-xs text-muted-foreground">{item.description}</p>
								</div>
								<p class="shrink-0 text-right">
									<span class="text-lg font-semibold tabular-nums text-foreground">
										{formatGrcNumber(item.count)}
									</span>
									<span class="block text-xs text-muted-foreground">
										{item.count === 0
											? 'Aucun'
											: item.tone === 'danger'
												? 'Prioritaire'
												: 'À surveiller'}
									</span>
								</p>
							</li>
						{/each}
					</ul>
				</Card>

				<Card
					title="Couverture du mapping"
					subtitle="Exigences actives des référentiels actifs liées à au moins un contrôle"
					class="min-w-0"
				>
					<div class="space-y-4" data-testid="grc-coverage">
						<MetricCard
							title="Exigences couvertes"
							value={formatGrcPercent(dashboard.compliance.controlMappingCoverage.percent)}
							progress={dashboard.compliance.controlMappingCoverage.percent}
							detail={coverageDetail(dashboard.compliance.controlMappingCoverage)}
						/>
						<p class="text-xs text-muted-foreground">
							Mesure la couverture des exigences par des contrôles, pas un niveau de conformité.
						</p>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{@render figure('Référentiels', dashboard.compliance.frameworks, 'grc-frameworks')}
							{@render figure('Exigences', dashboard.compliance.requirements, 'grc-requirements')}
							{@render figure(
								'Applicables',
								dashboard.compliance.applicableRequirements,
								'grc-applicable'
							)}
							{@render figure(
								'Non couvertes',
								dashboard.compliance.unmappedRequirements,
								'grc-unmapped'
							)}
						</div>
					</div>
				</Card>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<Card
					title="Risques ouverts par niveau résiduel"
					subtitle="Référence des indicateurs critiques et élevés"
					class="min-w-0"
				>
					<div data-testid="grc-risks-residual">
						<DonutChart
							rows={residualRows}
							centerLabel="Ouverts"
							unit="risques"
							ariaLabel="Répartition des risques ouverts par niveau de score résiduel"
						/>
					</div>
				</Card>
				<Card
					title="Risques ouverts par niveau inhérent"
					subtitle="Avant traitement, même grille de niveaux"
					class="min-w-0"
				>
					<div data-testid="grc-risks-inherent">
						<DonutChart
							rows={inherentRows}
							centerLabel="Ouverts"
							unit="risques"
							ariaLabel="Répartition des risques ouverts par niveau de score inhérent"
						/>
					</div>
				</Card>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<Card
					title="Mises en œuvre par dernière évaluation"
					subtitle="Résultat de la dernière évaluation terminée de chaque mise en œuvre"
					class="min-w-0"
				>
					<div data-testid="grc-controls-assessment">
						<RankedBarList
							rows={assessmentRows}
							label="Mises en œuvre de contrôles par résultat de dernière évaluation"
							unit="mise(s) en œuvre"
						/>
					</div>
				</Card>
				<Card title="Preuves" subtitle="Validité à l’instant du calcul" class="min-w-0">
					<div class="space-y-4" data-testid="grc-evidence">
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{@render figure('Valides', dashboard.evidence.valid, 'grc-evidence-valid')}
							{@render figure('Expirées', dashboard.evidence.expired, 'grc-evidence-expired')}
							{@render figure(
								`Expirent sous ${dashboard.windows.expiringSoonDays} j`,
								dashboard.evidence.expiringSoon,
								'grc-evidence-soon'
							)}
							{@render figure('Non valides', dashboard.evidence.invalid, 'grc-evidence-invalid')}
						</div>
						{@render countList(
							'Par statut',
							distributionRows(dashboard.evidence.byStatus),
							'grc-evidence-status'
						)}
					</div>
				</Card>
			</div>

			<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				<Card title="Actions de remédiation" class="min-w-0">
					<div class="space-y-4" data-testid="grc-actions">
						<div class="grid grid-cols-2 gap-3">
							{@render figure('En retard', dashboard.actions.overdue, 'grc-actions-overdue')}
							{@render figure(
								`Échéance sous ${dashboard.windows.dueSoonDays} j`,
								dashboard.actions.dueSoon,
								'grc-actions-soon'
							)}
						</div>
						{@render countList(
							'Par statut',
							distributionRows(dashboard.actions.byStatus),
							'grc-actions-status'
						)}
						{@render countList(
							'Par priorité',
							distributionRows(dashboard.actions.byPriority, severityLabel),
							'grc-actions-priority'
						)}
					</div>
				</Card>
				<Card title="Évaluations" class="min-w-0">
					<div class="space-y-4" data-testid="grc-assessments">
						<div class="grid grid-cols-2 gap-3">
							{@render figure(
								'Réévaluations dues',
								dashboard.assessments.reassessmentDue,
								'grc-assessments-due'
							)}
							{@render figure(
								'Preuves non valides',
								dashboard.assessments.hasInvalidEvidence,
								'grc-assessments-invalid'
							)}
						</div>
						{@render countList(
							'Par statut',
							distributionRows(dashboard.assessments.byStatus),
							'grc-assessments-status'
						)}
					</div>
				</Card>
				<Card title="Audits" class="min-w-0">
					<div class="space-y-4" data-testid="grc-audits">
						{@render figure('Total', dashboard.audits.total, 'grc-audits-total')}
						{@render countList(
							'Par statut',
							distributionRows(dashboard.audits.byStatus),
							'grc-audits-status'
						)}
					</div>
				</Card>
				<Card title="Constats" class="min-w-0">
					<div class="space-y-4" data-testid="grc-findings">
						<div class="grid grid-cols-2 gap-3">
							{@render figure('Ouverts', dashboard.findings.open, 'grc-findings-open')}
							{@render figure('En retard', dashboard.findings.overdue, 'grc-findings-overdue')}
						</div>
						{@render countList(
							'Par sévérité',
							distributionRows(dashboard.findings.bySeverity, severityLabel),
							'grc-findings-severity'
						)}
					</div>
				</Card>
			</div>
		{/if}
	</div>
{/if}
