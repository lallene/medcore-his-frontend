<script lang="ts">
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
	<section
		class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-700 via-[#0E4C92] to-[#18B893] p-8 text-white shadow-xl"
	>
		<div
			class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute bottom-4 right-10 text-[160px] font-black leading-none text-white/5"
		>
			PEC
		</div>

		<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
					Assurance Command Center
				</p>

				<h1 class="mt-3 text-4xl font-bold leading-tight">Pilotage des prises en charge</h1>

				<p class="mt-3 max-w-2xl text-lg text-blue-50">
					Suivi des compagnies, bons PEC, validations, rejets et délais de traitement.
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🛡 {companies.length} Compagnies
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						📄 {pendingVouchers + validatedVouchers + rejectedVouchers} Bons PEC
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						✅ {validatedVouchers} Validés
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						💰 {totalAmount} FCFA
					</span>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
					<p class="text-xs text-blue-100">Délai moyen</p>
					<p class="mt-1 text-2xl font-bold">48h</p>
				</div>

				<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
					<p class="text-xs text-blue-100">Taux validation</p>
					<p class="mt-1 text-2xl font-bold">78%</p>
				</div>

				<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
					<p class="text-xs text-blue-100">Alertes</p>
					<p class="mt-1 text-2xl font-bold">12</p>
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
			accent="#7C3AED"
		/>

		<MetricCard
			icon={Clock3}
			title="En attente"
			value={pendingVouchers}
			detail="À contrôler"
			trend="+4%"
			progress={60}
			accent="#F59E0B"
		/>

		<MetricCard
			icon={BadgeCheck}
			title="Validés"
			value={validatedVouchers}
			detail="PEC acceptées"
			trend="+8%"
			progress={78}
			accent="#22C55E"
		/>

		<MetricCard
			icon={WalletCards}
			title="Montant"
			value={totalAmount}
			detail="FCFA estimés"
			trend="+15%"
			progress={72}
			accent="#EA580C"
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card title="Workflow assurance" subtitle="Cycle de vie d’un bon de prise en charge">
				<div class="grid gap-3 md:grid-cols-5">
					<WorkflowStep icon={FileText} title="Créé" detail="Bon généré" color="#0E4C92" />
					<WorkflowStep icon={Clock3} title="Soumis" detail="Envoyé assurance" color="#0EA5E9" />
					<WorkflowStep icon={Shield} title="Contrôle" detail="Pièces vérifiées" color="#F59E0B" />
					<WorkflowStep icon={CheckCircle2} title="Validé" detail="PEC acceptée" color="#22C55E" />
					<WorkflowStep icon={XCircle} title="Rejeté" detail="Correction requise" color="#EF4444" />
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
					<Indicator label="Délai moyen" value="48h" color="text-[#0E4C92]" />
				</div>
			</Card>

			<Card title="Activité assurance" subtitle="Timeline récente">
				<div class="space-y-5">
					<TimelineItem
						title="Bon PEC créé"
						detail="Patient Workspace · Aujourd’hui"
						color="#0E4C92"
					/>
					<TimelineItem
						title="Demande en contrôle"
						detail="ATLANTIQUE · 48h estimées"
						color="#F59E0B"
					/>
					<TimelineItem
						title="PEC validée"
						detail="Workflow assurance · Validation"
						color="#22C55E"
					/>
				</div>
			</Card>
		</div>
	</div>
</div>
