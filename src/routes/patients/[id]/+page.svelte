<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		Activity,
		FileText,
		HeartPulse,
		Phone,
		Printer,
		Shield,
		User,
		UserPlus,
		WalletCards
	} from 'lucide-svelte';

	import { getPatient } from '$lib/api/patients';
	import type { Patient } from '$lib/types/patient';

	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import InfoBlock from '$lib/components/patients/InfoBlock.svelte';
	import MiniInfo from '$lib/components/patients/MiniInfo.svelte';
	import JourneyStep from '$lib/components/patients/JourneyStep.svelte';
	import TimelineItem from '$lib/components/patients/TimelineItem.svelte';

	let patient = $state<Patient | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const id = Number(page.params.id);
			patient = await getPatient(id);
		} catch {
			error = 'Impossible de charger la fiche patient.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Patient 360° | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du dossier patient...</p>
{:else if error}
	<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
{:else if patient}
	{@const p = patient}

	<div class="space-y-6">
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-4 right-10 text-[140px] font-black leading-none text-white/5"
			>
				PAT
			</div>

			<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div class="flex items-center gap-5">
					<div class="rounded-3xl bg-white/15 p-3 backdrop-blur">
						<Avatar name={`${p.prenoms} ${p.nom}`} />
					</div>

					<div>
						<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
							Patient 360°
						</p>

						<div class="mt-3 flex flex-wrap items-center gap-3">
							<h1 class="text-4xl font-bold leading-tight">
								{p.nom}
								{p.prenoms}
							</h1>

							<Badge variant="success">Actif</Badge>
						</div>

						<p class="mt-3 text-lg text-blue-50">
							Dossier {p.numeroDossier ?? `#${p.id}`} · {p.telephone || 'Téléphone non renseigné'}
						</p>

						<div class="mt-6 flex flex-wrap gap-3">
							<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
								👤 Identité vérifiée
							</span>
							<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
								📁 {p.numeroDossier ?? `PAT-${p.id}`}
							</span>
							<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
								🩺 Parcours médical
							</span>
						</div>
					</div>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/patients'))}>Retour</Button>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={Shield}
				title="Assurances"
				value="0"
				detail="À connecter"
				trend="+0%"
				progress={10}
				accent="#7C3AED"
			/>

			<MetricCard
				icon={FileText}
				title="Bons PEC"
				value="0"
				detail="Aucun bon actif"
				trend="+0%"
				progress={5}
				accent="#F59E0B"
			/>

			<MetricCard
				icon={HeartPulse}
				title="Consultations"
				value="0"
				detail="Module à venir"
				trend="+0%"
				progress={8}
				accent="#18B893"
			/>

			<MetricCard
				icon={WalletCards}
				title="Factures"
				value="0"
				detail="Module à venir"
				trend="+0%"
				progress={8}
				accent="#EA580C"
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<Card title="Informations patient" subtitle="Identité, dossier et coordonnées">
					<div class="grid gap-4 md:grid-cols-2">
						<InfoBlock label="Nom" value={p.nom} />
						<InfoBlock label="Prénoms" value={p.prenoms} />
						<InfoBlock label="Téléphone" value={p.telephone || '—'} />
						<InfoBlock label="Numéro dossier" value={p.numeroDossier ?? `#${p.id}`} />
					</div>
				</Card>

				<Card title="Assurances et prise en charge" subtitle="Couvertures, garants et bons PEC">
					<div class="grid gap-4 md:grid-cols-3">
						<MiniInfo title="Compagnie" value="À connecter" />
						<MiniInfo title="Taux couverture" value="—" />
						<MiniInfo title="Bons actifs" value="0" />
					</div>
				</Card>

				<Card title="Parcours patient" subtitle="Vue synthétique du parcours dans la clinique">
					<div class="grid gap-3 md:grid-cols-5">
						<JourneyStep icon={User} title="Accueil" detail="Dossier créé" color="#0E4C92" />
						<JourneyStep
							icon={HeartPulse}
							title="Consultation"
							detail="À planifier"
							color="#18B893"
						/>
						<JourneyStep icon={Shield} title="Assurance" detail="À connecter" color="#7C3AED" />
						<JourneyStep icon={FileText} title="Bon PEC" detail="Aucun actif" color="#F59E0B" />
						<JourneyStep icon={WalletCards} title="Facturation" detail="À venir" color="#EA580C" />
					</div>
				</Card>

				<Card title="Historique patient" subtitle="Timeline administrative et médicale">
					<div class="space-y-5">
						<TimelineItem
							icon={User}
							title="Dossier patient consulté"
							detail="Aujourd’hui · MedCore HIS"
							color="#0E4C92"
						/>

						<TimelineItem
							icon={Activity}
							title="Patient actif dans le système"
							detail="Statut administratif validé"
							color="#22C55E"
						/>
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Opérations sur le dossier">
					<div class="space-y-3">
						<Button
							fullWidth
							onclick={() => goto(resolve(`/patients/${p.id}/consultations/create`))}
						>
							<HeartPulse size={16} />
							Nouvelle consultation
						</Button>

						<Button fullWidth onclick={() => goto(resolve(`/patients/${p.id}/vouchers/create`))}>
							<FileText size={16} />
							Créer un bon PEC
						</Button>

						<Button
							fullWidth
							variant="secondary"
							onclick={() => goto(resolve(`/patients/${p.id}/insurances/create`))}
						>
							<Shield size={16} />
							Ajouter assurance
						</Button>

						<Button fullWidth variant="secondary">
							<UserPlus size={16} />
							Modifier patient
						</Button>

						<Button fullWidth variant="secondary">
							<Printer size={16} />
							Imprimer dossier
						</Button>
					</div>
				</Card>

				<Card title="Contact" subtitle="Coordonnées principales">
					<div class="space-y-4">
						<div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
							<div class="rounded-xl bg-white p-2 text-[#0E4C92] shadow-sm">
								<Phone size={18} />
							</div>

							<div>
								<p class="text-sm text-slate-500">Téléphone</p>
								<p class="font-semibold text-slate-900">{p.telephone || '—'}</p>
							</div>
						</div>

						<div class="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
							<p class="font-semibold text-slate-800">Contact d’urgence</p>
							<p class="mt-1 text-sm text-slate-500">Non renseigné</p>
						</div>
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
