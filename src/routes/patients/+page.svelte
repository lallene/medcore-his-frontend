<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import {
		BadgeCheck,
		BadgeX,
		ChevronLeft,
		ChevronRight,
		FolderOpen,
		HeartPulse,
		MapPin,
		Search,
		Shield,
		UserPlus,
		Users
	} from 'lucide-svelte';

	import { getPatients } from '$lib/api/patients';
	import type { Patient } from '$lib/types/patient';

	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { medcoreColors } from '$lib/design/theme';

	type InsuranceFilter = 'all' | 'insured' | 'uninsured';
	type SexFilter = 'all' | 'M' | 'F';

	let patients = $state<Patient[]>([]);

	let totalPatients = $state(0);
	let totalPages = $state(1);

	let loading = $state(true);
	let error = $state('');

	let search = $state('');
	let insuranceFilter = $state<InsuranceFilter>('all');
	let sexFilter = $state<SexFilter>('all');

	let currentPage = $state(1);
	let pageSize = $state(20);

	const insuredPatientsOnPage = $derived(patients.filter((patient) => patient.isAssure).length);

	const uninsuredPatientsOnPage = $derived(patients.filter((patient) => !patient.isAssure).length);

	const pageInsuredRate = $derived(
		patients.length > 0 ? Math.round((insuredPatientsOnPage / patients.length) * 100) : 0
	);

	const pageUninsuredRate = $derived(
		patients.length > 0 ? Math.round((uninsuredPatientsOnPage / patients.length) * 100) : 0
	);

	const filteredPatients = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return patients.filter((patient) => {
			const matchesSearch =
				query.length === 0 ||
				patient.codePatient?.toLowerCase().includes(query) ||
				patient.numeroDossier?.toLowerCase().includes(query) ||
				patient.nom?.toLowerCase().includes(query) ||
				patient.prenoms?.toLowerCase().includes(query) ||
				patient.telephone?.toLowerCase().includes(query) ||
				patient.quartier?.toLowerCase().includes(query) ||
				patient.matriculeAssure?.toLowerCase().includes(query);

			const matchesInsurance =
				insuranceFilter === 'all' ||
				(insuranceFilter === 'insured' && patient.isAssure) ||
				(insuranceFilter === 'uninsured' && !patient.isAssure);

			const normalizedSex = patient.sexe?.trim().toUpperCase();

			const matchesSex = sexFilter === 'all' || normalizedSex === sexFilter;

			return matchesSearch && matchesInsurance && matchesSex;
		});
	});

	const visibleStart = $derived(totalPatients === 0 ? 0 : (currentPage - 1) * pageSize + 1);

	const visibleEnd = $derived(Math.min(currentPage * pageSize, totalPatients));

	function fullName(patient: Patient): string {
		const value = `${patient.nom ?? ''} ${patient.prenoms ?? ''}`.trim();

		return value || 'Patient sans identité';
	}

	function patientDisplayCode(patient: Patient): string {
		const code = patient.codePatient?.trim();

		if (code) {
			return code;
		}

		return `P${String(patient.id).padStart(5, '0')}`;
	}

	function formatSex(value?: string | null): string {
		const normalized = value?.trim().toUpperCase();

		switch (normalized) {
			case 'M':
				return 'Homme';

			case 'F':
				return 'Femme';

			default:
				return '—';
		}
	}

	function formatBirthDate(value?: string | null): string {
		if (!value) {
			return 'Date inconnue';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Date inconnue';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	}

	function calculateAgeInMonths(value?: string | null): number | null {
		if (!value) {
			return null;
		}

		const birthDate = new Date(value);

		if (Number.isNaN(birthDate.getTime())) {
			return null;
		}

		const today = new Date();

		let months =
			(today.getFullYear() - birthDate.getFullYear()) * 12 +
			today.getMonth() -
			birthDate.getMonth();

		if (today.getDate() < birthDate.getDate()) {
			months--;
		}

		return Math.max(0, months);
	}

	function formatAge(age: number | null | undefined, birthDate?: string | null): string {
		if (age === null || age === undefined) {
			return 'Âge inconnu';
		}

		if (age > 0) {
			return `${age} an${age > 1 ? 's' : ''}`;
		}

		const months = calculateAgeInMonths(birthDate);

		if (months === null) {
			return 'Moins d’un an';
		}

		if (months === 0) {
			return 'Nouveau-né';
		}

		return `${months} mois`;
	}

	function ageCategory(age: number | null | undefined): string {
		if (age === null || age === undefined) {
			return 'Profil non renseigné';
		}

		if (age === 0) {
			return 'Nourrisson';
		}

		if (age < 13) {
			return 'Enfant';
		}

		if (age < 18) {
			return 'Adolescent';
		}

		if (age < 65) {
			return 'Adulte';
		}

		return 'Senior';
	}

	function normalizedCoverageRate(patient: Patient): number {
		if (!patient.isAssure) {
			return 0;
		}

		return Math.max(0, Math.min(patient.tauxCouverture ?? 0, 100));
	}

	function coverageClass(patient: Patient): string {
		const rate = normalizedCoverageRate(patient);

		if (rate >= 80) {
			return 'text-emerald-700';
		}

		if (rate >= 50) {
			return 'text-amber-700';
		}

		if (rate > 0) {
			return 'text-orange-700';
		}

		return 'text-red-600';
	}

	async function loadPatients(): Promise<void> {
		loading = true;
		error = '';

		try {
			const result = await getPatients(currentPage, pageSize);

			patients = result.data;
			totalPatients = result.meta.total;
			totalPages = Math.max(1, result.meta.totalPages);

			if (currentPage > totalPages) {
				currentPage = totalPages;
				await loadPatients();
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger les patients.';
		} finally {
			loading = false;
		}
	}

	function selectInsuranceFilter(value: InsuranceFilter): void {
		insuranceFilter = value;
	}

	function selectSexFilter(value: SexFilter): void {
		sexFilter = value;
	}

	function resetFilters(): void {
		search = '';
		insuranceFilter = 'all';
		sexFilter = 'all';
	}

	async function changePageSize(): Promise<void> {
		currentPage = 1;
		await loadPatients();
	}

	async function goToPreviousPage(): Promise<void> {
		if (currentPage <= 1) {
			return;
		}

		currentPage--;
		await loadPatients();
	}

	async function goToNextPage(): Promise<void> {
		if (currentPage >= totalPages) {
			return;
		}

		currentPage++;
		await loadPatients();
	}

	onMount(() => {
		void loadPatients();
	});
</script>

<svelte:head>
	<title>Patients | MedCore HIS</title>
</svelte:head>

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
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
					Patient Center
				</p>

				<h1 class="mt-3 text-4xl font-bold leading-tight">Gestion des patients</h1>

				<p class="mt-3 max-w-2xl text-lg text-blue-50">
					Suivi des dossiers patients, identités, assurances, contacts et parcours médicaux.
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						👥 {totalPatients} patient(s)
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🛡️ {insuredPatientsOnPage} assuré(s) sur cette page
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						📁 {totalPatients} dossiers actifs
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🩺 Vue Patient 360°
					</span>
				</div>
			</div>

			<Button variant="secondary" onclick={() => goto(resolve('/patients/create'))}>
				<UserPlus size={16} />
				Nouveau patient
			</Button>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			icon={Users}
			title="Patients"
			value={String(totalPatients)}
			detail="Dossiers enregistrés"
			trend={`${patients.length} sur cette page`}
			progress={Math.min((patients.length / Math.max(totalPatients, 1)) * 100, 100)}
			accent={medcoreColors.primary}
		/>

		<MetricCard
			icon={Shield}
			title="Assurés sur la page"
			value={String(insuredPatientsOnPage)}
			detail={`${uninsuredPatientsOnPage} non assuré(s)`}
			trend={`${pageInsuredRate} % de cette page`}
			progress={pageInsuredRate}
			accent={medcoreColors.semantic.info}
		/>

		<MetricCard
			icon={BadgeX}
			title="Non assurés"
			value={String(uninsuredPatientsOnPage)}
			detail={`${insuredPatientsOnPage} assuré(s)`}
			trend={`${pageUninsuredRate} % de cette page`}
			progress={pageUninsuredRate}
			accent={medcoreColors.semantic.warning}
		/>

		<MetricCard
			icon={FolderOpen}
			title="Dossiers actifs"
			value={String(totalPatients)}
			detail="Accès Patient 360°"
			trend="Suivi longitudinal"
			progress={totalPatients > 0 ? 100 : 0}
			accent={medcoreColors.brandAccent}
		/>
	</div>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<Card title="Liste des patients" subtitle="Patients enregistrés dans MedCore HIS">
		<div class="mb-6 space-y-4">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="relative w-full max-w-xl">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

					<input
						data-testid="qa-patient-search"
						bind:value={search}
						placeholder="Nom, code patient, téléphone, quartier, matricule..."
						class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#0E4C92] focus:bg-white"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<select
						bind:value={pageSize}
						onchange={changePageSize}
						aria-label="Nombre de patients par page"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
					>
						<option value={10}>10 par page</option>
						<option value={20}>20 par page</option>
						<option value={50}>50 par page</option>
						<option value={100}>100 par page</option>
					</select>

					<Button variant="secondary" onclick={resetFilters}>Réinitialiser</Button>
				</div>
			</div>

			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex gap-2 overflow-x-auto pb-1">
					<button
						type="button"
						onclick={() => selectInsuranceFilter('all')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							insuranceFilter === 'all'
								? 'border-[#0E4C92] bg-[#0E4C92] text-white'
								: 'border-slate-200 bg-white text-slate-600 hover:bg-blue-50'
						}`}
					>
						Tous
					</button>

					<button
						type="button"
						onclick={() => selectInsuranceFilter('insured')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							insuranceFilter === 'insured'
								? 'border-emerald-600 bg-emerald-600 text-white'
								: 'border-slate-200 bg-white text-slate-600 hover:bg-emerald-50'
						}`}
					>
						Assurés
					</button>

					<button
						type="button"
						onclick={() => selectInsuranceFilter('uninsured')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							insuranceFilter === 'uninsured'
								? 'border-amber-600 bg-amber-600 text-white'
								: 'border-slate-200 bg-white text-slate-600 hover:bg-amber-50'
						}`}
					>
						Non assurés
					</button>
				</div>

				<div class="flex gap-2 overflow-x-auto pb-1">
					<button
						type="button"
						onclick={() => selectSexFilter('all')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							sexFilter === 'all'
								? 'border-slate-700 bg-slate-700 text-white'
								: 'border-slate-200 bg-white text-slate-600'
						}`}
					>
						Tous sexes
					</button>

					<button
						type="button"
						onclick={() => selectSexFilter('M')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							sexFilter === 'M'
								? 'border-blue-600 bg-blue-600 text-white'
								: 'border-slate-200 bg-white text-slate-600'
						}`}
					>
						Hommes
					</button>

					<button
						type="button"
						onclick={() => selectSexFilter('F')}
						class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
							sexFilter === 'F'
								? 'border-pink-600 bg-pink-600 text-white'
								: 'border-slate-200 bg-white text-slate-600'
						}`}
					>
						Femmes
					</button>
				</div>
			</div>
		</div>

		{#if loading}
			<LoadingState label="Chargement des patients…" />
		{:else if filteredPatients.length === 0}
			<EmptyState
				title="Aucun patient trouvé"
				description="Modifiez votre recherche ou réinitialisez les filtres."
			>
				{#snippet cta()}
					<Button onclick={resetFilters}>Réinitialiser</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-slate-200">
				<div
					class="hidden items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 xl:grid xl:grid-cols-[minmax(260px,1.35fr)_minmax(175px,1fr)_minmax(170px,0.9fr)_minmax(145px,0.8fr)_minmax(90px,0.55fr)_auto]"
				>
					<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Patient</p>

					<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Profil</p>

					<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Téléphone</p>

					<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Quartier</p>

					<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Couverture</p>

					<p class="text-right text-[11px] font-black uppercase tracking-wide text-slate-400">
						Actions
					</p>
				</div>

				{#each filteredPatients as patient (patient.id)}
					<article
						class="border-b border-slate-100 bg-white px-5 py-4 transition last:border-b-0 hover:bg-slate-50"
					>
						<div
							class="grid gap-5 xl:grid-cols-[minmax(260px,1.35fr)_minmax(175px,1fr)_minmax(170px,0.9fr)_minmax(145px,0.8fr)_minmax(90px,0.55fr)_auto] xl:items-center xl:gap-4"
						>
							<div class="flex min-w-0 items-center gap-4">
								<div
									class="flex h-12 min-w-[84px] shrink-0 items-center justify-center rounded-2xl bg-blue-50 px-3 text-sm font-black text-[#0E4C92]"
								>
									{patientDisplayCode(patient)}
								</div>

								<div class="min-w-0">
									<p class="truncate text-base font-black text-slate-900">
										{fullName(patient)}
									</p>

									<div class="mt-1.5">
										{#if patient.isAssure}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700"
											>
												<BadgeCheck size={12} />
												Assuré
											</span>
										{:else}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700"
											>
												<BadgeX size={12} />
												Non assuré
											</span>
										{/if}
									</div>
								</div>
							</div>

							<div>
								<p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
									Profil
								</p>

								<p class="mt-1 text-sm font-black text-slate-700">
									{formatSex(patient.sexe)} ·
									{formatAge(patient.age, patient.dateNaissance)}
								</p>

								<p class="mt-1 text-xs font-semibold text-slate-500">
									{ageCategory(patient.age)}
								</p>

								<p class="mt-0.5 text-xs text-slate-400">
									{formatBirthDate(patient.dateNaissance)}
								</p>
							</div>

							<div>
								<p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
									Téléphone
								</p>

								<p class="mt-1 truncate text-sm font-black text-slate-700">
									{patient.telephone || '—'}
								</p>
							</div>

							<div>
								<p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
									Quartier
								</p>

								<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
									<MapPin size={14} class="shrink-0 text-slate-500" />

									<span class="truncate">
										{patient.quartier || '—'}
									</span>
								</p>
							</div>

							<div>
								<p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">
									Couverture
								</p>

								<p class={`mt-1 text-base font-black ${coverageClass(patient)}`}>
									{normalizedCoverageRate(patient)} %
								</p>
							</div>

							<div class="flex shrink-0 items-center gap-2 xl:justify-end">
								<button
									type="button"
									onclick={() => goto(resolve(`/patients/${patient.id}/consultations/create`))}
									class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition hover:border-slate-300 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E4C92]/30"
									title="Nouvelle consultation"
									aria-label={`Nouvelle consultation pour ${fullName(patient)}`}
								>
									<HeartPulse size={16} />
								</button>

								<button
									type="button"
									onclick={() => goto(resolve(`/patients/${patient.id}`))}
									class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
									title="Voir le dossier patient"
									aria-label={`Voir le dossier de ${fullName(patient)}`}
								>
									<FolderOpen size={16} />
								</button>
							</div>
						</div>
					</article>
				{/each}
			</div>

			<div
				class="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"
			>
				<p class="text-sm text-slate-500">
					Affichage de
					<span class="font-black text-slate-700">
						{visibleStart}
					</span>
					à
					<span class="font-black text-slate-700">
						{visibleEnd}
					</span>
					sur
					<span class="font-black text-slate-700">
						{totalPatients}
					</span>
					patient(s)
				</p>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={goToPreviousPage}
						disabled={currentPage <= 1}
						class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						aria-label="Page précédente"
					>
						<ChevronLeft size={18} />
					</button>

					<span class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
						Page {currentPage} / {totalPages}
					</span>

					<button
						type="button"
						onclick={goToNextPage}
						disabled={currentPage >= totalPages}
						class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						aria-label="Page suivante"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		{/if}
	</Card>
</div>
