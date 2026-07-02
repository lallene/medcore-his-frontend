<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Activity,
		AlertTriangle,
		BadgeCheck,
		CreditCard,
		FileText,
		HeartPulse,
		Shield,
		Users
	} from 'lucide-svelte';

	import { getDashboard } from '$lib/api/dashboard';
	import ActivityTimeline from '$lib/components/dashboard/ActivityTimeline.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { DashboardResponse } from '$lib/types/dashboard';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import ProcessItem from '$lib/components/dashboard/ProcessItem.svelte';
	import ScheduleItem from '$lib/components/dashboard/ScheduleItem.svelte';
	import AlertItem from '$lib/components/dashboard/AlertItem.svelte';

	let dashboard = $state<DashboardResponse | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			dashboard = await getDashboard();
		} catch {
			error = 'Impossible de charger le dashboard.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Command Center | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du Command Center...</p>
{:else if error}
	<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
{:else if dashboard}
	<div class="space-y-6">
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-6 right-10 text-[180px] font-black leading-none text-white/5"
			>
				+
			</div>
			<div
				class="pointer-events-none absolute bottom-10 left-1/2 text-7xl font-bold tracking-[0.4em] text-white/5"
			>
				ECG
			</div>
			<div class="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
						MedCore Command Center
					</p>

					<h1 class="mt-3 text-4xl font-bold leading-tight">Clinique Médicale Saint Raphaël</h1>

					<p class="mt-3 max-w-2xl text-lg text-blue-50">
						Vue exécutive temps réel des patients, consultations, assurances et opérations
						médicales.
					</p>

					<div class="mt-6 flex flex-wrap gap-3">
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur"
							>❤️ {dashboard.patients} Patients</span
						>
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur"
							>🩺 42 Consultations</span
						>
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur"
							>🛡 {dashboard.vouchers} PEC</span
						>
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur"
							>💰 18.2M FCFA</span
						>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
						<p class="text-xs text-blue-100">Disponibilité</p>
						<p class="mt-1 text-2xl font-bold">99.8%</p>
					</div>

					<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
						<p class="text-xs text-blue-100">Alertes</p>
						<p class="mt-1 text-2xl font-bold">4</p>
					</div>

					<div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
						<p class="text-xs text-blue-100">Priorités</p>
						<p class="mt-1 text-2xl font-bold">12</p>
					</div>
				</div>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={Users}
				title="Patients"
				value={dashboard.patients}
				detail="Patients suivis"
				trend="+12%"
				progress={78}
				accent="#0E4C92"
			/>

			<MetricCard
				icon={HeartPulse}
				title="Consultations"
				value="42"
				detail="Aujourd’hui"
				trend="+8%"
				progress={64}
				accent="#18B893"
			/>

			<MetricCard
				icon={Shield}
				title="Assurances"
				value={dashboard.companies}
				detail="Partenaires"
				trend="+3%"
				progress={52}
				accent="#7C3AED"
			/>

			<MetricCard
				icon={FileText}
				title="Bons PEC"
				value={dashboard.vouchers}
				detail="Enregistrés"
				trend="+18%"
				progress={82}
				accent="#F59E0B"
			/>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={BadgeCheck}
				title="Validés"
				value={dashboard.validated}
				detail="Prises en charge"
				trend="+6%"
				progress={76}
				accent="#22C55E"
			/>

			<MetricCard
				icon={Activity}
				title="En attente"
				value={dashboard.pending}
				detail="À traiter"
				trend="+4%"
				progress={60}
				accent="#0EA5E9"
			/>

			<MetricCard
				icon={AlertTriangle}
				title="Rejetés"
				value={dashboard.rejected}
				detail="À reprendre"
				trend="-2%"
				progress={28}
				accent="#EF4444"
			/>

			<MetricCard
				icon={CreditCard}
				title="Facturation"
				value="18.2M"
				detail="FCFA estimés"
				trend="+15%"
				progress={72}
				accent="#EA580C"
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<Card title="Flux opérationnel" subtitle="Chaîne de soins et de prise en charge">
					<div class="grid gap-3 md:grid-cols-7">
						<ProcessItem icon={Users} title="Accueil" value="Admission patient" />
						<ProcessItem icon={HeartPulse} title="Consultation" value="Diagnostic" />
						<ProcessItem icon={FileText} title="Prescription" value="Ordonnance" />
						<ProcessItem icon={Activity} title="Laboratoire" value="Analyses" />
						<ProcessItem icon={BadgeCheck} title="Imagerie" value="Examens" />
						<ProcessItem icon={Shield} title="Assurance" value="PEC" />
						<ProcessItem icon={CreditCard} title="Facturation" value="Paiement" />
					</div>
				</Card>

				<Card title="Planning clinique" subtitle="Aperçu de la journée">
					<div class="space-y-4">
						<ScheduleItem time="08:00" title="Ouverture admissions" badge="Accueil" />
						<ScheduleItem time="09:30" title="Consultations externes" badge="Médecine générale" />
						<ScheduleItem time="11:00" title="Contrôle bons assurance" badge="Assurance" />
						<ScheduleItem time="15:00" title="Rapport activité journée" badge="Direction" />
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<ActivityTimeline activities={dashboard.recentActivities} />

				<Card title="Alertes prioritaires" subtitle="Éléments à surveiller">
					<div class="space-y-4">
						<AlertItem
							title="Bons PEC en attente"
							description="60 demandes nécessitent un contrôle."
						/>
						<AlertItem
							title="Dossiers incomplets"
							description="Certains patients n'ont pas d'assurance liée."
						/>
						<AlertItem title="Facturation" description="Module prêt pour le prochain sprint." />
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
