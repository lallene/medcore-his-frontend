<script lang="ts">
	import { medcoreColors } from '$lib/design/theme';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		BadgeCheck,
		Building2,
		CheckCircle2,
		Clock3,
		FileText,
		Shield,
		WalletCards,
		XCircle
	} from 'lucide-svelte';

	import { getInsuranceCompanies } from '$lib/api/insurance';
	import Card from '$lib/components/ui/Card.svelte';
	import DataTable from '$lib/components/table/DataTable.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';

	import WorkflowStep from '$lib/components/insurance/WorkflowStep.svelte';
	import TimelineItem from '$lib/components/insurance/TimelineItem.svelte';
	import AlertBox from '$lib/components/insurance/AlertBox.svelte';
	import Indicator from '$lib/components/insurance/Indicator.svelte';

	import type { CompanyRow, InsuranceCompany } from '$lib/types/insurance';
	import type { TableAction, TableColumn } from '$lib/types/table';

	let companies = $state<CompanyRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const pendingVouchers = 60;
	const validatedVouchers = 70;
	const rejectedVouchers = 20;
	const totalAmount = '18.2M';

	const columns: TableColumn[] = [
		{ key: 'code', label: 'Code' },
		{ key: 'name', label: 'Compagnie' },
		{ key: 'city', label: 'Ville' },
		{ key: 'status', label: 'Statut' }
	];

	const actions: TableAction[] = [
		{
			label: 'Ouvrir',
			onClick: (row) => {
				const company = row as CompanyRow;
				void goto(resolve(`/insurance/companies/${company.id}`));
			}
		}
	];

	function toRow(company: InsuranceCompany): CompanyRow {
		return {
			id: company.id,
			code: company.code,
			name: company.name,
			city: company.city ?? '—',
			status: company.isActive ? 'Active' : 'Inactive'
		};
	}

	onMount(async () => {
		try {
			const data = await getInsuranceCompanies();
			companies = data.map(toRow);
		} catch {
			error = "Impossible de charger l'espace assurance.";
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Assurance Center | MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
					Assurance Command Center
				</p>

				<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
					Pilotage des prises en charge
				</h1>

				<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
					Suivi des compagnies, bons PEC, validations, rejets et délais de traitement.
				</p>

				<div class="mt-4 flex flex-wrap gap-2">
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{companies.length} Compagnies
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{pendingVouchers + validatedVouchers + rejectedVouchers} Bons PEC
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{validatedVouchers} Validés
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{totalAmount} FCFA
					</span>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
					<p class="text-xs text-muted-foreground">Délai moyen</p>
					<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">48h</p>
				</div>

				<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
					<p class="text-xs text-muted-foreground">Taux validation</p>
					<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">78%</p>
				</div>

				<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
					<p class="text-xs text-muted-foreground">Alertes</p>
					<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">12</p>
				</div>
			</div>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			icon={Building2}
			title="Compagnies"
			value={companies.length}
			detail="Partenaires actifs"
			trend="+3%"
			progress={68}
			accent={medcoreColors.primary}
		/>

		<MetricCard
			icon={Clock3}
			title="En attente"
			value={pendingVouchers}
			detail="À contrôler"
			trend="+4%"
			progress={60}
			accent={medcoreColors.semantic.warning}
		/>

		<MetricCard
			icon={BadgeCheck}
			title="Validés"
			value={validatedVouchers}
			detail="PEC acceptées"
			trend="+8%"
			progress={78}
			accent={medcoreColors.semantic.success}
		/>

		<MetricCard
			icon={WalletCards}
			title="Montant"
			value={totalAmount}
			detail="FCFA estimés"
			trend="+15%"
			progress={72}
			accent={medcoreColors.semantic.warning}
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="min-w-0 space-y-6 xl:col-span-2">
			<Card title="Workflow assurance" subtitle="Cycle de vie d’un bon de prise en charge">
				<div class="grid gap-3 md:grid-cols-5">
					<WorkflowStep
						icon={FileText}
						title="Créé"
						detail="Bon généré"
						color={medcoreColors.primary}
					/>
					<WorkflowStep
						icon={Clock3}
						title="Soumis"
						detail="Envoyé assurance"
						color={medcoreColors.semantic.info}
					/>
					<WorkflowStep
						icon={Shield}
						title="Contrôle"
						detail="Pièces vérifiées"
						color={medcoreColors.semantic.warning}
					/>
					<WorkflowStep
						icon={CheckCircle2}
						title="Validé"
						detail="PEC acceptée"
						color={medcoreColors.semantic.success}
					/>
					<WorkflowStep
						icon={XCircle}
						title="Rejeté"
						detail="Correction requise"
						color={medcoreColors.semantic.danger}
					/>
				</div>
			</Card>

			{#if error}
				<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
			{/if}

			<DataTable
				title="Compagnies d’assurance"
				description="Organismes partenaires configurés dans MedCore"
				{columns}
				rows={companies}
				{actions}
				{loading}
				emptyMessage="Aucune compagnie trouvée"
			/>
		</div>

		<div class="space-y-6">
			<Card title="Alertes assurance" subtitle="Dossiers à surveiller">
				<div class="space-y-4">
					<AlertBox
						title="Bons en attente"
						description="60 demandes nécessitent un contrôle assurance."
						level="warning"
					/>

					<AlertBox
						title="Dossiers incomplets"
						description="Certains patients n’ont pas encore de garant associé."
						level="danger"
					/>

					<AlertBox
						title="Validation rapide"
						description="78% des demandes sont validées en moins de 48h."
						level="success"
					/>
				</div>
			</Card>

			<Card title="Indicateurs clés" subtitle="Pilotage des performances">
				<div class="space-y-4">
					<Indicator
						label="Total bons"
						value={pendingVouchers + validatedVouchers + rejectedVouchers}
					/>
					<Indicator label="En contrôle" value={pendingVouchers} color="text-amber-600" />
					<Indicator label="Validés" value={validatedVouchers} color="text-green-600" />
					<Indicator label="Rejetés" value={rejectedVouchers} color="text-red-600" />
					<Indicator label="Délai moyen" value="48h" color="text-primary" />
				</div>
			</Card>

			<Card title="Activité assurance" subtitle="Timeline récente">
				<div class="space-y-5">
					<TimelineItem
						title="Bon PEC créé"
						detail="Patient Workspace · Aujourd’hui"
						color={medcoreColors.primary}
					/>
					<TimelineItem
						title="Demande en contrôle"
						detail="ATLANTIQUE · 48h estimées"
						color={medcoreColors.semantic.warning}
					/>
					<TimelineItem
						title="PEC validée"
						detail="Workflow assurance · Validation"
						color={medcoreColors.semantic.success}
					/>
				</div>
			</Card>
		</div>
	</div>
</div>
