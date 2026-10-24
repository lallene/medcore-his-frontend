<script lang="ts">
	import FilterChip from '$lib/components/ui/FilterChip.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import {
		BadgeCheck,
		BadgeX,
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
	<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">Patient Center</p>

				<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
					Gestion des patients
				</h1>

				<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
					Suivi des dossiers patients, identités, assurances, contacts et parcours médicaux.
				</p>

				<div class="mt-4 flex flex-wrap gap-2">
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{totalPatients} patient(s)
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{insuredPatientsOnPage} assuré(s) sur cette page
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{totalPatients} dossiers actifs
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						Vue Patient 360°
					</span>
				</div>
			</div>

			<Button onclick={() => goto(resolve('/patients/create'))}>
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
		<div class="mb-4 space-y-3">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="relative w-full max-w-xl">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground"
						size={16}
						aria-hidden="true"
					/>

					<input
						data-testid="qa-patient-search"
						bind:value={search}
						placeholder="Nom, code patient, téléphone, quartier, matricule..."
						aria-label="Rechercher un patient"
						class="min-h-control w-full rounded-lg border border-input bg-surface py-2 pr-3 pl-9 text-sm shadow-xs outline-none transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:ring-3 focus:ring-primary/15"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<select
						bind:value={pageSize}
						onchange={changePageSize}
						aria-label="Nombre de patients par page"
						class="rounded-lg border border-input bg-white px-3 py-2 text-sm font-semibold text-slate-600"
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
				<div class="flex gap-2 overflow-x-auto pb-1" role="group">
					<FilterChip
						selected={insuranceFilter === 'all'}
						onclick={() => selectInsuranceFilter('all')}>Tous</FilterChip
					>

					<FilterChip
						selected={insuranceFilter === 'insured'}
						onclick={() => selectInsuranceFilter('insured')}>Assurés</FilterChip
					>

					<FilterChip
						selected={insuranceFilter === 'uninsured'}
						onclick={() => selectInsuranceFilter('uninsured')}>Non assurés</FilterChip
					>
				</div>

				<div class="flex gap-2 overflow-x-auto pb-1" role="group">
					<FilterChip selected={sexFilter === 'all'} onclick={() => selectSexFilter('all')}
						>Tous sexes</FilterChip
					>

					<FilterChip selected={sexFilter === 'M'} onclick={() => selectSexFilter('M')}
						>Hommes</FilterChip
					>

					<FilterChip selected={sexFilter === 'F'} onclick={() => selectSexFilter('F')}
						>Femmes</FilterChip
					>
				</div>
			</div>
		</div>

		<Table minWidth="900px" aria-label="Liste des patients">
			<thead>
				<tr>
					<th>Patient</th>
					<th>Profil</th>
					<th>Téléphone</th>
					<th>Quartier</th>
					<th class="mc-num">Couverture</th>
					<th class="mc-actions">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<TableState state="loading" colspan={6} rows={5} title="Chargement des patients…" />
				{:else if error && patients.length === 0}
					<TableState state="error" colspan={6} />
				{:else if filteredPatients.length === 0}
					<TableState
						state="empty"
						colspan={6}
						title="Aucun patient trouvé"
						description="Modifiez votre recherche ou réinitialisez les filtres."
					>
						{#snippet action()}
							<Button variant="secondary" size="sm" onclick={resetFilters}>Réinitialiser</Button>
						{/snippet}
					</TableState>
				{:else}
					{#each filteredPatients as patient (patient.id)}
						<tr>
							<td>
								<div class="flex min-w-0 items-center gap-3">
									<span
										class="mc-id shrink-0 rounded-md bg-primary-soft px-2 py-1 text-xs text-primary"
									>
										{patientDisplayCode(patient)}
									</span>
									<div class="min-w-0">
										<p class="truncate font-semibold text-foreground">{fullName(patient)}</p>
										<div class="mt-1">
											{#if patient.isAssure}
												<Badge variant="success"
													><BadgeCheck size={12} aria-hidden="true" /> Assuré</Badge
												>
											{:else}
												<Badge variant="warning"
													><BadgeX size={12} aria-hidden="true" /> Non assuré</Badge
												>
											{/if}
										</div>
									</div>
								</div>
							</td>
							<td>
								<p class="text-foreground">
									{formatSex(patient.sexe)} · {formatAge(patient.age, patient.dateNaissance)}
								</p>
								<p class="text-xs text-muted-foreground">
									{ageCategory(patient.age)} · {formatBirthDate(patient.dateNaissance)}
								</p>
							</td>
							<td class="whitespace-nowrap">{patient.telephone || '—'}</td>
							<td>
								<span class="inline-flex items-center gap-1.5">
									<MapPin size={14} class="shrink-0 text-subtle-foreground" aria-hidden="true" />
									<span class="truncate">{patient.quartier || '—'}</span>
								</span>
							</td>
							<td class={`mc-num font-semibold ${coverageClass(patient)}`}>
								{normalizedCoverageRate(patient)} %
							</td>
							<td class="mc-actions">
								<IconButton
									size="sm"
									label={`Nouvelle consultation pour ${fullName(patient)}`}
									title="Nouvelle consultation"
									onclick={() => goto(resolve(`/patients/${patient.id}/consultations/create`))}
								>
									<HeartPulse size={16} aria-hidden="true" />
								</IconButton>
								<IconButton
									size="sm"
									label={`Voir le dossier de ${fullName(patient)}`}
									title="Voir le dossier patient"
									class="bg-primary-soft text-primary hover:bg-primary-border/60 hover:text-primary-active"
									onclick={() => goto(resolve(`/patients/${patient.id}`))}
								>
									<FolderOpen size={16} aria-hidden="true" />
								</IconButton>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</Table>

		{#if !loading && filteredPatients.length > 0}
			<Pagination
				class="mt-3"
				page={currentPage}
				{totalPages}
				disabled={loading}
				onpage={(next) => {
					if (next === currentPage - 1) return void goToPreviousPage();
					if (next === currentPage + 1) return void goToNextPage();
					currentPage = next;
					void loadPatients();
				}}
			>
				{#snippet summary()}
					Affichage de <span class="font-medium text-foreground">{visibleStart}</span> à
					<span class="font-medium text-foreground">{visibleEnd}</span> sur
					<span class="font-medium text-foreground">{totalPatients}</span> patient(s)
				{/snippet}
			</Pagination>
		{/if}
	</Card>
</div>
