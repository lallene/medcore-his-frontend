<script lang="ts">
	import { medcoreColors } from '$lib/design/theme';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Info from '$lib/components/ui/Info.svelte';
	import {
		AlertTriangle,
		BadgeCheck,
		Building2,
		CheckCircle2,
		Clock3,
		FileText,
		Shield,
		Users,
		WalletCards
	} from 'lucide-svelte';

	import { getInsuranceCompany } from '$lib/api/insurance';
	import AlertBox from '$lib/components/insurance/AlertBox.svelte';
	import Indicator from '$lib/components/insurance/Indicator.svelte';
	import TimelineItem from '$lib/components/insurance/TimelineItem.svelte';
	import WorkflowStep from '$lib/components/insurance/WorkflowStep.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import type { InsuranceCompany } from '$lib/types/insurance';

	let company = $state<InsuranceCompany | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			company = await getInsuranceCompany(Number(page.params.id));
		} catch {
			error = "Impossible de charger la compagnie d'assurance.";
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Compagnie assurance | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement de la compagnie...</p>
{:else if error}
	<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
{:else if company}
	{@const c = company}

	<div class="space-y-6">
		<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<div class="flex items-center gap-4">
						<div
							class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
						>
							<Building2 size={28} />
						</div>

						<div>
							<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
								Compagnie partenaire
							</p>

							<h1 class="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
								{c.name}
							</h1>

							<p class="mt-1 text-sm text-muted-foreground">Code compagnie : {c.code}</p>
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<Badge variant={c.isActive ? 'success' : 'danger'}>
							{c.isActive ? 'Active' : 'Inactive'}
						</Badge>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							Assurance santé
						</span>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							Délai moyen 48h
						</span>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							78% validation
						</span>
					</div>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/insurance'))}>Retour</Button>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={Users}
				title="Patients couverts"
				value="1 245"
				detail="Patients liés"
				trend="+12%"
				progress={74}
				accent={medcoreColors.primary}
			/>

			<MetricCard
				icon={Clock3}
				title="Bons en attente"
				value="34"
				detail="À contrôler"
				trend="+4%"
				progress={58}
				accent={medcoreColors.semantic.warning}
			/>

			<MetricCard
				icon={BadgeCheck}
				title="Bons validés"
				value="126"
				detail="PEC acceptées"
				trend="+9%"
				progress={82}
				accent={medcoreColors.semantic.success}
			/>

			<MetricCard
				icon={WalletCards}
				title="Montant engagé"
				value="12.5M"
				detail="FCFA estimés"
				trend="+15%"
				progress={72}
				accent={medcoreColors.semantic.warning}
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="min-w-0 space-y-6 xl:col-span-2">
				<Card title="Informations compagnie" subtitle="Coordonnées et identification">
					<div class="grid gap-4 md:grid-cols-2">
						<Info label="Code" value={c.code} />
						<Info label="Nom" value={c.name} />
						<Info label="Téléphone" value={c.phone ?? '—'} />
						<Info label="Email" value={c.email ?? '—'} />
						<Info label="Ville" value={c.city ?? '—'} />
						<Info label="Pays" value={c.country ?? '—'} />
					</div>
				</Card>

				<Card title="Workflow compagnie" subtitle="Traitement standard des prises en charge">
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
							detail="Envoyé compagnie"
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
							icon={AlertTriangle}
							title="Litige"
							detail="Dossier bloqué"
							color={medcoreColors.semantic.danger}
						/>
					</div>
				</Card>

				<Card title="Description">
					<p class="text-sm leading-7 text-slate-600">
						{c.description ??
							`Compagnie partenaire ${c.name} intégrée au workflow de prise en charge MedCore HIS.`}
					</p>
				</Card>
			</div>

			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Opérations compagnie">
					<div class="space-y-3">
						<Button fullWidth>Créer un bon PEC</Button>
						<Button fullWidth variant="secondary">Voir patients couverts</Button>
						<Button fullWidth variant="secondary">Voir contrats</Button>
						<Button fullWidth variant="secondary">Exporter</Button>
					</div>
				</Card>

				<Card title="Alertes compagnie" subtitle="À surveiller">
					<div class="space-y-4">
						<AlertBox
							title="Contrôle en attente"
							description="34 bons nécessitent une vérification."
							level="warning"
						/>

						<AlertBox
							title="Dossiers incomplets"
							description="8 patients ont des pièces manquantes."
							level="danger"
						/>

						<AlertBox
							title="Bon délai"
							description="Traitement moyen inférieur à 48h."
							level="success"
						/>
					</div>
				</Card>

				<Card title="Indicateurs">
					<div class="space-y-4">
						<Indicator label="Taux validation" value="78%" color="text-green-600" />
						<Indicator label="Délai moyen" value="48h" color="text-primary" />
						<Indicator label="Litiges" value="8" color="text-red-600" />
						<Indicator label="Contrats actifs" value="3" color="text-violet-600" />
					</div>
				</Card>

				<Card title="Activité récente" subtitle="Historique compagnie">
					<div class="space-y-5">
						<TimelineItem
							title="Bon PEC soumis"
							detail="Aujourd’hui · MedCore"
							color={medcoreColors.primary}
						/>
						<TimelineItem
							title="Contrôle en cours"
							detail="Service assurance"
							color={medcoreColors.semantic.warning}
						/>
						<TimelineItem
							title="PEC validée"
							detail="Workflow compagnie"
							color={medcoreColors.semantic.success}
						/>
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
