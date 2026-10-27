<script lang="ts">
	import { onMount } from 'svelte';

	import { getGrcReporting } from '$lib/api/grc';
	import type { GrcCount, GrcReporting } from '$lib/types/grc';
	import {
		GRC_WINDOW_DEFAULT,
		REPORTING_FRAMEWORK_FILTER_LABEL,
		canReadGrcReporting,
		frameworkOptionList,
		isReportingZero,
		levelRows,
		reportingLabel,
		reportingRows,
		reportingWindow,
		severityRows,
		toggleFramework
	} from '$lib/components/grc/reporting-state';
	import {
		coverageDetail,
		formatGeneratedAt,
		formatGrcNumber,
		formatGrcPercent
	} from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import DonutChart from '$lib/components/ui/DonutChart.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import RankedBarList from '$lib/components/ui/RankedBarList.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';
	import type { GrcDistributionRow } from '$lib/components/grc/dashboard-state';

	let report = $state<GrcReporting | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let evidenceDays = $state(String(GRC_WINDOW_DEFAULT));
	let actionDays = $state(String(GRC_WINDOW_DEFAULT));
	let selectedFrameworks = $state<number[]>([]);
	let frameworkOptions = $state<Array<{ id: number; label: string }>>([]);

	const permissions = getStoredPermissions();
	const allowed = canReadGrcReporting(permissions);

	function rowsOf(
		counts: GrcCount[],
		kind: 'status' | 'level' | 'severity' = 'status'
	): GrcDistributionRow[] {
		if (kind === 'level') return levelRows(counts);
		if (kind === 'severity') return severityRows(counts);
		return reportingRows(counts);
	}

	function chartRows(counts: GrcCount[], kind: 'status' | 'level' | 'severity' = 'status') {
		return rowsOf(counts, kind).map((row) => ({
			label: row.label,
			value: row.value,
			tone: row.tone
		}));
	}

	async function load(): Promise<void> {
		const evidence = reportingWindow(evidenceDays);
		const action = reportingWindow(actionDays);
		if (evidence === null || action === null) {
			error = 'Chaque fenêtre doit être un nombre entier de jours entre 1 et 365.';
			loading = false;
			return;
		}
		loading = report === null;
		try {
			const next = await getGrcReporting({
				evidenceExpiringSoonDays: evidence,
				actionDueSoonDays: action,
				frameworkIds: selectedFrameworks
			});
			report = next;
			if (selectedFrameworks.length === 0) {
				frameworkOptions = frameworkOptionList(next.compliance.byFramework);
			}
			error = '';
		} catch (cause) {
			if (isAccessDeniedError(cause)) accessDenied = true;
			else error = resolveUserErrorMessage(cause, 'Impossible de charger le reporting GRC.');
		} finally {
			loading = false;
		}
	}

	function onFramework(id: number): void {
		selectedFrameworks = toggleFramework(selectedFrameworks, id);
		void load();
	}

	onMount(() => {
		if (!allowed) {
			loading = false;
			return;
		}
		void load();
	});
</script>

{#snippet metrics(
	items: Array<{ title: string; value: number; display?: string; detail?: string }>
)}
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
		{#each items as item (item.title)}
			<MetricCard
				title={item.title}
				value={item.display ?? formatGrcNumber(item.value)}
				detail={item.detail ?? ''}
			/>
		{/each}
	</div>
{/snippet}

{#snippet distribution(
	title: string,
	counts: GrcCount[],
	kind: 'status' | 'level' | 'severity' = 'status'
)}
	<div class="min-w-0 rounded-xl border border-border bg-surface p-4">
		<h3 class="mb-3 text-sm font-semibold text-foreground">{title}</h3>
		<DonutChart rows={chartRows(counts, kind)} ariaLabel={title} centerLabel="Total" />
		<ul class="mt-3 space-y-1 text-sm" aria-label={`${title}, valeurs`}>
			{#each rowsOf(counts, kind) as row (row.id)}
				<li class="flex items-baseline justify-between gap-3">
					<span class="truncate">{row.label}</span>
					<span class="tabular-nums">{formatGrcNumber(row.value)}</span>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet serviceBars(title: string, rows: GrcReporting['policies']['byOwningService'])}
	<div class="min-w-0 rounded-xl border border-border bg-surface p-4">
		<h3 class="mb-3 text-sm font-semibold text-foreground">{title}</h3>
		{#if rows.length === 0}
			<p class="text-sm text-muted-foreground">Aucun rattachement.</p>
		{:else}
			<RankedBarList
				label={title}
				unit="élément"
				rows={rows.map((row) => ({
					id: row.serviceId ?? 'none',
					label: row.code ? `${row.code} — ${row.name}` : 'Sans service',
					value: row.count
				}))}
			/>
		{/if}
	</div>
{/snippet}

<div class="min-w-0 space-y-8">
	<PageHeader
		eyebrow="Sécurité & Conformité"
		title="Reporting"
		description="Répartition analytique de l'état courant. Ce n'est pas le tableau de bord opérationnel, ni une évolution historique."
	/>

	{#if !allowed || accessDenied}
		<AccessDenied />
	{:else if loading && !report}
		<LoadingState label="Chargement du reporting" />
	{:else}
		<form
			class="grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface p-4 md:grid-cols-2"
			onsubmit={(event) => {
				event.preventDefault();
				void load();
			}}
		>
			<label class="block min-w-0 text-sm" for="evidence-window">
				<span class="mb-1 block font-medium">Preuves expirant bientôt (jours)</span>
				<Input id="evidence-window" bind:value={evidenceDays} />
			</label>
			<label class="block min-w-0 text-sm" for="action-window">
				<span class="mb-1 block font-medium">Actions dues bientôt (jours)</span>
				<Input id="action-window" bind:value={actionDays} />
			</label>
			<fieldset class="min-w-0 md:col-span-2">
				<legend class="mb-2 text-sm font-medium">{REPORTING_FRAMEWORK_FILTER_LABEL}</legend>
				<p class="mb-2 text-sm text-muted-foreground">
					Ce filtre ne s'applique qu'à la conformité et aux indicateurs de mapping de la vue
					d'ensemble. Les autres sections restent globales.
				</p>
				{#if frameworkOptions.length === 0}
					<p class="text-sm text-muted-foreground">Aucun référentiel.</p>
				{:else}
					<div class="flex max-h-40 flex-wrap gap-3 overflow-y-auto">
						{#each frameworkOptions as option (option.id)}
							<label class="inline-flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selectedFrameworks.includes(option.id)}
									onchange={() => onFramework(option.id)}
								/>
								<span>{option.label}</span>
							</label>
						{/each}
					</div>
				{/if}
			</fieldset>
			<div>
				<button
					type="submit"
					class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
				>
					Actualiser
				</button>
			</div>
		</form>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		{#if report}
			<p class="text-sm text-muted-foreground">
				Calculé le {formatGeneratedAt(report.generatedAt)}. Fenêtres utilisées :
				{report.windows.evidenceExpiringSoonDays} jours pour les preuves,
				{report.windows.actionDueSoonDays} jours pour les actions.
			</p>
			{#if isReportingZero(report)}
				<p class="text-sm text-muted-foreground">
					Aucune donnée GRC. Les compteurs restent à zéro.
				</p>
			{/if}

			<section class="space-y-3" aria-labelledby="reporting-overview">
				<h2 id="reporting-overview" class="text-lg font-semibold">Vue d'ensemble</h2>
				{@render metrics([
					{ title: 'Risques ouverts', value: report.executive.openRisks },
					{
						title: 'Risques élevés ou critiques',
						value: report.executive.highCriticalOpenRisks,
						detail: 'Score résiduel, risques ouverts'
					},
					{
						title: 'Couverture du mapping',
						value: report.executive.mappingCoverage.percent,
						display: formatGrcPercent(report.executive.mappingCoverage.percent),
						detail: coverageDetail(report.executive.mappingCoverage)
					},
					{ title: 'Preuves expirées', value: report.executive.evidenceExpired },
					{ title: 'Actions en retard', value: report.executive.overdueActions },
					{ title: 'Constats ouverts', value: report.executive.openFindings },
					{ title: 'Constats en retard', value: report.executive.overdueFindings },
					{ title: 'Incidents actifs', value: report.executive.activeIncidents },
					{ title: 'Politiques publiées', value: report.executive.publishedPolicies }
				])}
				<p class="text-sm text-muted-foreground">
					La couverture du mapping n'est pas un score de conformité. Une politique publiée n'est pas
					une attestation.
				</p>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-risks">
				<h2 id="reporting-risks" class="text-lg font-semibold">Risques</h2>
				<p class="text-sm text-muted-foreground">
					Les niveaux portent sur les risques ouverts. Le niveau résiduel et le niveau inhérent sont
					distincts. Élevé ou critique opérationnel = résiduel.
				</p>
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Par statut', report.risks.byStatus)}
					{@render distribution('Par traitement', report.risks.byTreatment)}
					{@render distribution(
						'Niveau résiduel des risques ouverts',
						report.risks.openByResidualLevel,
						'level'
					)}
					{@render distribution(
						'Niveau inhérent des risques ouverts',
						report.risks.openByInherentLevel,
						'level'
					)}
					{@render distribution(
						"Criticité d'actif des risques ouverts",
						report.risks.openByAssetCriticality
					)}
					{@render serviceBars('Risques ouverts par service', report.risks.openByOwningService)}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-compliance">
				<h2 id="reporting-compliance" class="text-lg font-semibold">Conformité</h2>
				{@render metrics([
					{ title: 'Référentiels actifs', value: report.compliance.activeFrameworks },
					{ title: 'Exigences actives', value: report.compliance.activeRequirements },
					{ title: 'Exigences applicables', value: report.compliance.applicableRequirements },
					{ title: 'Exigences mappées', value: report.compliance.mappedRequirements }
				])}
				<p class="text-sm">
					Couverture du mapping :
					{formatGrcPercent(report.compliance.mappingCoverage.percent)} —
					{coverageDetail(report.compliance.mappingCoverage)}
				</p>
				<div class="overflow-x-auto rounded-xl border border-border">
					<table class="min-w-[720px] w-full text-left text-sm">
						<caption class="sr-only">Couverture du mapping par référentiel</caption>
						<thead>
							<tr class="border-b border-border text-muted-foreground">
								<th class="p-3 font-medium">Code</th>
								<th class="p-3 font-medium">Nom</th>
								<th class="p-3 font-medium">Statut</th>
								<th class="p-3 font-medium">Applicables</th>
								<th class="p-3 font-medium">Mappées</th>
								<th class="p-3 font-medium">Couverture du mapping</th>
							</tr>
						</thead>
						<tbody>
							{#each report.compliance.byFramework as framework (framework.frameworkId)}
								<tr class="border-b border-border last:border-0">
									<td class="p-3">{framework.code}</td>
									<td class="p-3">{framework.name}</td>
									<td class="p-3">{reportingLabel[framework.status] ?? framework.status}</td>
									<td class="p-3 tabular-nums"
										>{formatGrcNumber(framework.applicableRequirements)}</td
									>
									<td class="p-3 tabular-nums">{formatGrcNumber(framework.mappedRequirements)}</td>
									<td class="p-3 tabular-nums"
										>{formatGrcPercent(framework.mappingCoverage.percent)}</td
									>
								</tr>
							{:else}
								<tr>
									<td class="p-3 text-muted-foreground" colspan="6"
										>Aucun référentiel dans ce filtre.</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-controls">
				<h2 id="reporting-controls" class="text-lg font-semibold">Contrôles</h2>
				{@render metrics([
					{ title: 'Contrôles', value: report.controls.total },
					{ title: 'Mises en œuvre', value: report.controls.implementationsTotal }
				])}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Contrôles par statut', report.controls.byStatus)}
					{@render distribution(
						'Mises en œuvre par statut',
						report.controls.implementationsByStatus
					)}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-evidence">
				<h2 id="reporting-evidence" class="text-lg font-semibold">Preuves</h2>
				<p class="text-sm text-muted-foreground">
					États exclusifs. Une preuve qui expire exactement à l'instant du calcul n'est pas expirée.
				</p>
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Validité', report.evidence.byValidity)}
					{@render distribution('Type', report.evidence.byType)}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-actions">
				<h2 id="reporting-actions" class="text-lg font-semibold">Plans d'actions</h2>
				<p class="text-sm text-muted-foreground">
					Une échéance exactement à l'instant du calcul n'est pas en retard.
				</p>
				{@render metrics([
					{ title: 'Actions ouvertes', value: report.actions.open },
					{ title: 'En retard', value: report.actions.overdue },
					{ title: 'Échéance proche', value: report.actions.dueSoon }
				])}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
					{@render distribution('Par statut', report.actions.byStatus)}
					{@render distribution("État d'échéance", report.actions.byDueState)}
					{@render distribution(
						'Actions ouvertes par priorité',
						report.actions.openByPriority,
						'severity'
					)}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-audits">
				<h2 id="reporting-audits" class="text-lg font-semibold">Audits & constats</h2>
				{@render metrics([
					{ title: 'Audits actifs', value: report.audits.active, detail: 'Planifiés ou en cours' },
					{ title: 'Audits terminés', value: report.audits.completed },
					{
						title: 'Constats ouverts',
						value: report.findings.open,
						detail: 'Hors clos et acceptés'
					},
					{ title: 'Constats en retard', value: report.findings.overdue }
				])}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Audits par statut', report.audits.byStatus)}
					{@render distribution('Audits par type', report.audits.byType)}
					{@render distribution('Constats par statut', report.findings.byStatus)}
					{@render distribution('Constats par sévérité', report.findings.bySeverity, 'severity')}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-incidents">
				<h2 id="reporting-incidents" class="text-lg font-semibold">Incidents</h2>
				<p class="text-sm text-muted-foreground">
					Un incident actif est tout incident qui n'est pas clôturé. Pas de délai moyen de
					résolution.
				</p>
				{@render metrics([{ title: 'Incidents actifs', value: report.incidents.active }])}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Par statut', report.incidents.byStatus)}
					{@render distribution('Par sévérité', report.incidents.bySeverity, 'severity')}
				</div>
			</section>

			<section class="space-y-3" aria-labelledby="reporting-policies">
				<h2 id="reporting-policies" class="text-lg font-semibold">Gouvernance</h2>
				<p class="text-sm text-muted-foreground">
					Publiée signifie inscrite au registre. Cela ne mesure ni l'efficacité ni l'attestation.
				</p>
				{@render metrics([
					{ title: 'Politiques publiées', value: report.policies.published },
					{ title: 'Politiques en revue', value: report.policies.inReview }
				])}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{@render distribution('Par statut', report.policies.byStatus)}
					{@render serviceBars('Par service propriétaire', report.policies.byOwningService)}
				</div>
			</section>
		{/if}
	{/if}
</div>
