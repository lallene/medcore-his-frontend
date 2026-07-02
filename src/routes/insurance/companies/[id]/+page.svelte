<script lang="ts">
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
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-700 via-[#0E4C92] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-4 right-10 text-[150px] font-black leading-none text-white/5"
			>
				{c.code}
			</div>

			<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<div class="flex items-center gap-4">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"
						>
							<Building2 size={28} />
						</div>

						<div>
							<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
								Compagnie partenaire
							</p>

							<h1 class="mt-2 text-4xl font-bold leading-tight">{c.name}</h1>

							<p class="mt-1 text-blue-50">Code compagnie : {c.code}</p>
						</div>
					</div>

					<div class="mt-6 flex flex-wrap gap-3">
						<Badge variant={c.isActive ? 'success' : 'danger'}>
							{c.isActive ? 'Active' : 'Inactive'}
						</Badge>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							🛡 Assurance santé
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							⏱ Délai moyen 48h
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							✅ 78% validation
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
				accent="#0E4C92"
			/>

			<MetricCard
				icon={Clock3}
				title="Bons en attente"
				value="34"
				detail="À contrôler"
				trend="+4%"
				progress={58}
				accent="#F59E0B"
			/>

			<MetricCard
				icon={BadgeCheck}
				title="Bons validés"
				value="126"
				detail="PEC acceptées"
				trend="+9%"
				progress={82}
				accent="#22C55E"
			/>

			<MetricCard
				icon={WalletCards}
				title="Montant engagé"
				value="12.5M"
				detail="FCFA estimés"
				trend="+15%"
				progress={72}
				accent="#EA580C"
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
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
						<WorkflowStep icon={FileText} title="Créé" detail="Bon généré" color="#0E4C92" />
						<WorkflowStep icon={Clock3} title="Soumis" detail="Envoyé compagnie" color="#0EA5E9" />
						<WorkflowStep
							icon={Shield}
							title="Contrôle"
							detail="Pièces vérifiées"
							color="#F59E0B"
						/>
						<WorkflowStep
							icon={CheckCircle2}
							title="Validé"
							detail="PEC acceptée"
							color="#22C55E"
						/>
						<WorkflowStep
							icon={AlertTriangle}
							title="Litige"
							detail="Dossier bloqué"
							color="#EF4444"
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
						<Indicator label="Délai moyen" value="48h" color="text-[#0E4C92]" />
						<Indicator label="Litiges" value="8" color="text-red-600" />
						<Indicator label="Contrats actifs" value="3" color="text-violet-600" />
					</div>
				</Card>

				<Card title="Activité récente" subtitle="Historique compagnie">
					<div class="space-y-5">
						<TimelineItem title="Bon PEC soumis" detail="Aujourd’hui · MedCore" color="#0E4C92" />
						<TimelineItem title="Contrôle en cours" detail="Service assurance" color="#F59E0B" />
						<TimelineItem title="PEC validée" detail="Workflow compagnie" color="#22C55E" />
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
