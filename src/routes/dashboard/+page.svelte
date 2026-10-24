<script lang="ts">
	import { medcoreColors } from '$lib/design/theme';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
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
	import { canReadAgenda } from '$lib/components/agenda/state';
	import ActivityTimeline from '$lib/components/dashboard/ActivityTimeline.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import type { DashboardResponse } from '$lib/types/dashboard';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import ProcessItem from '$lib/components/dashboard/ProcessItem.svelte';
	import AlertItem from '$lib/components/dashboard/AlertItem.svelte';
	import {
		can,
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let dashboard = $state<DashboardResponse | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);

	onMount(async () => {
		const perms = getStoredPermissions();
		if (!can(perms, 'dashboard.read')) {
			accessDenied = true;
			loading = false;
			return;
		}
		try {
			dashboard = await getDashboard();
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le dashboard.');
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Command Center | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du Command Center…" />
{:else if accessDenied}
	<AccessDenied
		title="Tableau de bord non disponible"
		description="Votre profil n'inclut pas l'accès au tableau de bord exécutif. Utilisez le menu pour accéder à vos modules autorisés."
	/>
{:else if error}
	<Alert tone="danger">{error}</Alert>
{:else if dashboard}
	<div class="space-y-6">
		<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<div class="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
						MedCore Command Center
					</p>

					<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
						Clinique Médicale Saint Raphaël
					</h1>

					<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
						Vue exécutive temps réel des patients, consultations, assurances et opérations
						médicales.
					</p>

					<div class="mt-4 flex flex-wrap gap-2">
						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
							>{dashboard.patients} Patients</span
						>
						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
							>42 Consultations</span
						>
						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
							>{dashboard.vouchers} PEC</span
						>
						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
							>18.2M FCFA</span
						>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
						<p class="text-xs text-muted-foreground">Disponibilité</p>
						<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">99.8%</p>
					</div>

					<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
						<p class="text-xs text-muted-foreground">Alertes</p>
						<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">4</p>
					</div>

					<div class="rounded-lg border border-border bg-surface-muted px-4 py-3">
						<p class="text-xs text-muted-foreground">Priorités</p>
						<p class="mt-1 text-xl font-semibold tabular-nums text-foreground">12</p>
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
				accent={medcoreColors.primary}
			/>

			<MetricCard
				icon={HeartPulse}
				title="Consultations"
				value="42"
				detail="Aujourd’hui"
				trend="+8%"
				progress={64}
				accent={medcoreColors.semantic.success}
			/>

			<MetricCard
				icon={Shield}
				title="Assurances"
				value={dashboard.companies}
				detail="Partenaires"
				trend="+3%"
				progress={52}
				accent={medcoreColors.primary}
			/>

			<MetricCard
				icon={FileText}
				title="Bons PEC"
				value={dashboard.vouchers}
				detail="Enregistrés"
				trend="+18%"
				progress={82}
				accent={medcoreColors.semantic.warning}
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
				accent={medcoreColors.semantic.success}
			/>

			<MetricCard
				icon={Activity}
				title="En attente"
				value={dashboard.pending}
				detail="À traiter"
				trend="+4%"
				progress={60}
				accent={medcoreColors.semantic.info}
			/>

			<MetricCard
				icon={AlertTriangle}
				title="Rejetés"
				value={dashboard.rejected}
				detail="À reprendre"
				trend="-2%"
				progress={28}
				accent={medcoreColors.semantic.danger}
			/>

			<MetricCard
				icon={CreditCard}
				title="Facturation"
				value="18.2M"
				detail="FCFA estimés"
				trend="+15%"
				progress={72}
				accent={medcoreColors.semantic.warning}
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="min-w-0 space-y-6 xl:col-span-2">
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

				<Card title="Planning clinique" subtitle="Agenda médical">
					{#if canReadAgenda(getStoredPermissions())}
						<div class="space-y-3" data-testid="dashboard-agenda-cta">
							<p class="text-sm text-slate-600">
								Consultez les rendez-vous du jour et de la semaine, réservez un créneau et suivez le
								parcours check-in → file.
							</p>
							<LinkButton href={resolve('/agenda')} data-testid="dashboard-open-agenda">
								Voir l’agenda
							</LinkButton>
						</div>
					{:else}
						<p class="text-sm text-slate-500">
							L’agenda médical n’est pas disponible pour votre profil.
						</p>
					{/if}
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
{:else}
	<EmptyState
		title="Aucun indicateur disponible"
		description="Le tableau de bord n'a pas pu être chargé pour votre profil."
	/>
{/if}
