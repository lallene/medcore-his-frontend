<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type PreviousContraception = {
		type: string;
		startDate: string;
		endDate: string;
	};

	type GynecologicalInfection = {
		type: string;
		date: string;
		treatment: string;
	};

	type GynecologicalSurgery = {
		procedure: string;
		date: string;
		complications: string;
	};

	type PregnancyHistory = {
		year: number | null;
		term: string;
		deliveryType: string;
		babyWeightKg: number | null;
		babySex: string;
		maternalComplications: string;
		neonatalComplications: string;
		outcome: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		menarcheAge: null as number | null,
		lastMenstrualPeriod: '',
		menstrualCycleRegularity: '',
		averageCycleLengthDays: null as number | null,
		menstruationDurationDays: null as number | null,
		menstruationAbundance: '',
		dysmenorrhea: false,

		menopauseStatus: '',
		menopauseDate: '',
		menopauseSymptoms: '',

		currentContraceptionType: '',
		currentContraceptionStartDate: '',
		pregnancyDesire: false,

		knownInfertility: false,
		infertilityDuration: '',
		fertilityExams: '',

		stiHistory: '',
		cervicalScreeningDate: '',
		cervicalScreeningResult: '',
		mammographyDate: '',
		breastUltrasoundDate: '',
		breastPathologies: '',

		gravidity: 0,
		parity: 0,
		livingChildren: 0,

		miscarriagesCount: 0,
		miscarriagesDetails: '',

		abortionsCount: 0,
		abortionsDetails: '',

		ectopicPregnanciesCount: 0,
		ectopicPregnanciesDetails: '',

		cesareansCount: 0,
		cesareanIndications: ''
	});

	let previousContraceptions = $state<PreviousContraception[]>([]);
	let gynecologicalInfections = $state<GynecologicalInfection[]>([]);
	let gynecologicalSurgeries = $state<GynecologicalSurgery[]>([]);
	let pregnancyHistories = $state<PregnancyHistory[]>([]);

	let initialized = $state(false);

	$effect(() => {
		if (initialized) {
			return;
		}

		form.menarcheAge = toNullableNumber(data.menarcheAge);
		form.lastMenstrualPeriod = String(data.lastMenstrualPeriod ?? '');
		form.menstrualCycleRegularity = String(data.menstrualCycleRegularity ?? '');
		form.averageCycleLengthDays = toNullableNumber(data.averageCycleLengthDays);
		form.menstruationDurationDays = toNullableNumber(data.menstruationDurationDays);
		form.menstruationAbundance = String(data.menstruationAbundance ?? '');
		form.dysmenorrhea = Boolean(data.dysmenorrhea ?? false);

		form.menopauseStatus = String(data.menopauseStatus ?? '');
		form.menopauseDate = String(data.menopauseDate ?? '');
		form.menopauseSymptoms = String(data.menopauseSymptoms ?? '');

		form.currentContraceptionType = String(data.currentContraceptionType ?? '');
		form.currentContraceptionStartDate = String(data.currentContraceptionStartDate ?? '');
		form.pregnancyDesire = Boolean(data.pregnancyDesire ?? false);

		form.knownInfertility = Boolean(data.knownInfertility ?? false);
		form.infertilityDuration = String(data.infertilityDuration ?? '');
		form.fertilityExams = String(data.fertilityExams ?? '');

		form.stiHistory = String(data.stiHistory ?? '');
		form.cervicalScreeningDate = String(data.cervicalScreeningDate ?? '');
		form.cervicalScreeningResult = String(data.cervicalScreeningResult ?? '');
		form.mammographyDate = String(data.mammographyDate ?? '');
		form.breastUltrasoundDate = String(data.breastUltrasoundDate ?? '');
		form.breastPathologies = String(data.breastPathologies ?? '');

		form.gravidity = Number(data.gravidity ?? 0);
		form.parity = Number(data.parity ?? 0);
		form.livingChildren = Number(data.livingChildren ?? 0);

		form.miscarriagesCount = Number(data.miscarriagesCount ?? 0);
		form.miscarriagesDetails = String(data.miscarriagesDetails ?? '');

		form.abortionsCount = Number(data.abortionsCount ?? 0);
		form.abortionsDetails = String(data.abortionsDetails ?? '');

		form.ectopicPregnanciesCount = Number(data.ectopicPregnanciesCount ?? 0);
		form.ectopicPregnanciesDetails = String(data.ectopicPregnanciesDetails ?? '');

		form.cesareansCount = Number(data.cesareansCount ?? 0);
		form.cesareanIndications = String(data.cesareanIndications ?? '');

		previousContraceptions = toArray<PreviousContraception>(data.previousContraceptions);

		gynecologicalInfections = toArray<GynecologicalInfection>(data.gynecologicalInfections);

		gynecologicalSurgeries = toArray<GynecologicalSurgery>(data.gynecologicalSurgeries);

		pregnancyHistories = toArray<PregnancyHistory>(data.pregnancyHistories);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			previousContraceptions,
			gynecologicalInfections,
			gynecologicalSurgeries,
			pregnancyHistories
		});
	});

	function toNullableNumber(value: unknown): number | null {
		if (value === null || value === undefined || value === '') {
			return null;
		}

		const parsed = Number(value);

		return Number.isNaN(parsed) ? null : parsed;
	}

	function toArray<T>(value: unknown): T[] {
		return Array.isArray(value) ? (value as T[]) : [];
	}

	function addPreviousContraception() {
		previousContraceptions = [
			...previousContraceptions,
			{
				type: '',
				startDate: '',
				endDate: ''
			}
		];
	}

	function removePreviousContraception(index: number) {
		previousContraceptions = previousContraceptions.filter((_, itemIndex) => itemIndex !== index);
	}

	function addGynecologicalInfection() {
		gynecologicalInfections = [
			...gynecologicalInfections,
			{
				type: '',
				date: '',
				treatment: ''
			}
		];
	}

	function removeGynecologicalInfection(index: number) {
		gynecologicalInfections = gynecologicalInfections.filter((_, itemIndex) => itemIndex !== index);
	}

	function addGynecologicalSurgery() {
		gynecologicalSurgeries = [
			...gynecologicalSurgeries,
			{
				procedure: '',
				date: '',
				complications: ''
			}
		];
	}

	function removeGynecologicalSurgery(index: number) {
		gynecologicalSurgeries = gynecologicalSurgeries.filter((_, itemIndex) => itemIndex !== index);
	}

	function addPregnancyHistory() {
		pregnancyHistories = [
			...pregnancyHistories,
			{
				year: null,
				term: '',
				deliveryType: '',
				babyWeightKg: null,
				babySex: '',
				maternalComplications: '',
				neonatalComplications: '',
				outcome: ''
			}
		];
	}

	function removePregnancyHistory(index: number) {
		pregnancyHistories = pregnancyHistories.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Cycle menstruel</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Règles et ménopause</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="menarche-age" class="mb-2 block text-sm font-bold text-slate-700">
					Âge des premières règles
				</label>

				<input
					id="menarche-age"
					type="number"
					min="5"
					max="30"
					bind:value={form.menarcheAge}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="lmp" class="mb-2 block text-sm font-bold text-slate-700">
					Date des dernières règles
				</label>

				<input
					id="lmp"
					type="date"
					bind:value={form.lastMenstrualPeriod}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="cycle-regularity" class="mb-2 block text-sm font-bold text-slate-700">
					Régularité du cycle
				</label>

				<select
					id="cycle-regularity"
					bind:value={form.menstrualCycleRegularity}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				>
					<option value="">Sélectionner</option>
					<option value="REGULAR">Régulier</option>
					<option value="IRREGULAR">Irrégulier</option>
					<option value="ABSENT">Absent</option>
				</select>
			</div>

			<div>
				<label for="cycle-length" class="mb-2 block text-sm font-bold text-slate-700">
					Durée moyenne du cycle
				</label>

				<input
					id="cycle-length"
					type="number"
					min="1"
					bind:value={form.averageCycleLengthDays}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
					placeholder="Nombre de jours"
				/>
			</div>

			<div>
				<label for="period-duration" class="mb-2 block text-sm font-bold text-slate-700">
					Durée des règles
				</label>

				<input
					id="period-duration"
					type="number"
					min="1"
					bind:value={form.menstruationDurationDays}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
					placeholder="Nombre de jours"
				/>
			</div>

			<div>
				<label for="period-abundance" class="mb-2 block text-sm font-bold text-slate-700">
					Abondance
				</label>

				<select
					id="period-abundance"
					bind:value={form.menstruationAbundance}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				>
					<option value="">Sélectionner</option>
					<option value="LOW">Faible</option>
					<option value="NORMAL">Normale</option>
					<option value="HEAVY">Abondante</option>
				</select>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.dysmenorrhea} />
				<span class="text-sm font-bold text-slate-700"> Douleurs menstruelles </span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="menopause-status" class="mb-2 block text-sm font-bold text-slate-700">
					Statut ménopause
				</label>

				<select
					id="menopause-status"
					bind:value={form.menopauseStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				>
					<option value="">Sélectionner</option>
					<option value="NO">Non ménopausée</option>
					<option value="PERIMENOPAUSE">Périménopause</option>
					<option value="MENOPAUSE">Ménopausée</option>
				</select>
			</div>

			<div>
				<label for="menopause-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date de ménopause
				</label>

				<input
					id="menopause-date"
					type="date"
					bind:value={form.menopauseDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="menopause-symptoms" class="mb-2 block text-sm font-bold text-slate-700">
					Symptômes de ménopause
				</label>

				<input
					id="menopause-symptoms"
					type="text"
					bind:value={form.menopauseSymptoms}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Contraception et fertilité
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Projet de grossesse et infections</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="current-contraception" class="mb-2 block text-sm font-bold text-slate-700">
					Contraception actuelle
				</label>

				<input
					id="current-contraception"
					type="text"
					bind:value={form.currentContraceptionType}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label
					for="current-contraception-start"
					class="mb-2 block text-sm font-bold text-slate-700"
				>
					Date de début
				</label>

				<input
					id="current-contraception-start"
					type="date"
					bind:value={form.currentContraceptionStartDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.pregnancyDesire} />
				<span class="text-sm font-bold text-slate-700"> Désir de grossesse </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.knownInfertility} />
				<span class="text-sm font-bold text-slate-700"> Infertilité connue </span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="infertility-duration" class="mb-2 block text-sm font-bold text-slate-700">
					Durée de l’infertilité
				</label>

				<input
					id="infertility-duration"
					type="text"
					bind:value={form.infertilityDuration}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="fertility-exams" class="mb-2 block text-sm font-bold text-slate-700">
					Examens de fertilité réalisés
				</label>

				<input
					id="fertility-exams"
					type="text"
					bind:value={form.fertilityExams}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="sti-history" class="mb-2 block text-sm font-bold text-slate-700">
					Antécédents d’IST
				</label>

				<textarea
					id="sti-history"
					bind:value={form.stiHistory}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				></textarea>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Contraceptions antérieures</p>
					<p class="mt-1 text-sm text-slate-500">Types et périodes d’utilisation.</p>
				</div>

				<button
					type="button"
					onclick={addPreviousContraception}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each previousContraceptions as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_48px]"
					>
						<input
							type="text"
							bind:value={item.type}
							placeholder="Type"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="date"
							bind:value={item.startDate}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="date"
							bind:value={item.endDate}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removePreviousContraception(index)}
							class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
							aria-label={`Supprimer la contraception ${index + 1}`}
						>
							<Trash2 size={17} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Dépistage et interventions
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Col, seins, infections et chirurgies</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="cervical-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du frottis
				</label>

				<input
					id="cervical-date"
					type="date"
					bind:value={form.cervicalScreeningDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="cervical-result" class="mb-2 block text-sm font-bold text-slate-700">
					Résultat du frottis
				</label>

				<input
					id="cervical-result"
					type="text"
					bind:value={form.cervicalScreeningResult}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="mammography-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date mammographie
				</label>

				<input
					id="mammography-date"
					type="date"
					bind:value={form.mammographyDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="breast-ultrasound-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date échographie mammaire
				</label>

				<input
					id="breast-ultrasound-date"
					type="date"
					bind:value={form.breastUltrasoundDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="breast-pathologies" class="mb-2 block text-sm font-bold text-slate-700">
					Pathologies mammaires
				</label>

				<textarea
					id="breast-pathologies"
					bind:value={form.breastPathologies}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Infections gynécologiques</p>
						<p class="mt-1 text-sm text-slate-500">Type, date et traitement.</p>
					</div>

					<button
						type="button"
						onclick={addGynecologicalInfection}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each gynecologicalInfections as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="text"
								bind:value={item.type}
								placeholder="Type d’infection"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="date"
								bind:value={item.date}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.treatment}
									placeholder="Traitement"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeGynecologicalInfection(index)}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									aria-label={`Supprimer l’infection ${index + 1}`}
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Chirurgies gynécologiques</p>
						<p class="mt-1 text-sm text-slate-500">Intervention, date et complications.</p>
					</div>

					<button
						type="button"
						onclick={addGynecologicalSurgery}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each gynecologicalSurgeries as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="text"
								bind:value={item.procedure}
								placeholder="Intervention"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="date"
								bind:value={item.date}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.complications}
									placeholder="Complications"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeGynecologicalSurgery(index)}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									aria-label={`Supprimer la chirurgie ${index + 1}`}
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Antécédents obstétricaux
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Grossesses et accouchements</h4>
		</div>

		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
			<input
				type="number"
				min="0"
				bind:value={form.gravidity}
				placeholder="Gestité"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.parity}
				placeholder="Parité"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.livingChildren}
				placeholder="Enfants vivants"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.miscarriagesCount}
				placeholder="Fausses couches"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.abortionsCount}
				placeholder="IVG"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.ectopicPregnanciesCount}
				placeholder="GEU"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.cesareansCount}
				placeholder="Césariennes"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.miscarriagesDetails}
				rows="3"
				placeholder="Détails des fausses couches"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.abortionsDetails}
				rows="3"
				placeholder="Détails des IVG"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.ectopicPregnanciesDetails}
				rows="3"
				placeholder="Détails des grossesses extra-utérines"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.cesareanIndications}
				rows="3"
				placeholder="Indications des césariennes"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Historique des grossesses</p>
					<p class="mt-1 text-sm text-slate-500">
						Année, terme, accouchement, nouveau-né et issue.
					</p>
				</div>

				<button
					type="button"
					onclick={addPregnancyHistory}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter une grossesse
				</button>
			</div>

			<div class="mt-4 space-y-4">
				{#each pregnancyHistories as item, index (index)}
					<article class="rounded-2xl border border-slate-200 bg-white p-5">
						<div class="flex items-center justify-between gap-4">
							<p class="font-black text-slate-900">
								Grossesse #{index + 1}
							</p>

							<button
								type="button"
								onclick={() => removePregnancyHistory(index)}
								class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								aria-label={`Supprimer la grossesse ${index + 1}`}
							>
								<Trash2 size={17} />
							</button>
						</div>

						<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							<input
								type="number"
								min="1900"
								max="2100"
								bind:value={item.year}
								placeholder="Année"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.term}
								placeholder="Terme"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.deliveryType}
								placeholder="Type d’accouchement"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								min="0"
								step="0.01"
								bind:value={item.babyWeightKg}
								placeholder="Poids du bébé (kg)"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<select
								bind:value={item.babySex}
								aria-label={`Sexe du bébé de la grossesse ${index + 1}`}
								class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							>
								<option value="">Sexe du bébé</option>
								<option value="F">Féminin</option>
								<option value="M">Masculin</option>
								<option value="UNKNOWN">Non précisé</option>
							</select>

							<input
								type="text"
								bind:value={item.outcome}
								placeholder="Issue"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<textarea
								bind:value={item.maternalComplications}
								rows="2"
								placeholder="Complications maternelles"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2"
							></textarea>

							<textarea
								bind:value={item.neonatalComplications}
								rows="2"
								placeholder="Complications néonatales"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2"
							></textarea>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>
</div>
