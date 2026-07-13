<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type GrowthRecord = {
		date: string;
		weightKg: number | null;
		heightCm: number | null;
		bmi: number | null;
		headCircumferenceCm: number | null;
		weightPercentile: number | null;
		heightPercentile: number | null;
		bmiPercentile: number | null;
		headCircumferencePercentile: number | null;
	};

	type FoodAllergy = {
		food: string;
		reaction: string;
		severity: string;
	};

	type VaccinationRecord = {
		vaccine: string;
		dose: string;
		scheduledDate: string;
		administeredDate: string;
		batchNumber: string;
		center: string;
		status: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		birthDate: '',
		birthPlace: '',

		gestationalAgeWeeks: null as number | null,
		premature: false,
		prematurityLevel: '',

		deliveryMethod: '',

		birthWeightKg: null as number | null,
		birthHeightCm: null as number | null,
		birthHeadCircumferenceCm: null as number | null,

		apgarScore1Minute: null as number | null,
		apgarScore5Minutes: null as number | null,
		apgarScore10Minutes: null as number | null,

		neonatalComplications: '',
		neonatalComplicationsManagement: '',

		neonatalHospitalization: false,
		neonatalHospitalizationService: '',
		neonatalHospitalizationDuration: '',
		neonatalHospitalizationReason: '',

		headControlAgeMonths: null as number | null,
		sittingAgeMonths: null as number | null,
		walkingAgeMonths: null as number | null,
		motorDevelopmentNotes: '',

		firstWordsAgeMonths: null as number | null,
		languageDevelopment: '',

		psychomotorAssessment: '',
		psychomotorObservations: '',

		schoolLevel: '',
		schoolDifficulties: '',

		feedingType: '',
		breastfeedingStartDate: '',
		breastfeedingEndDate: '',

		foodDiversificationDate: '',
		foodDiversificationEvolution: '',

		legalGuardianType: '',
		legalGuardianName: '',
		legalGuardianRelationship: '',
		legalGuardianPhone: '',
		legalGuardianEmail: '',
		legalGuardianAddress: ''
	});

	let growthHistory = $state<GrowthRecord[]>([]);
	let foodAllergies = $state<FoodAllergy[]>([]);
	let vaccinations = $state<VaccinationRecord[]>([]);

	let initialized = $state(false);

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

	$effect(() => {
		if (initialized) {
			return;
		}

		form.birthDate = String(data.birthDate ?? '');
		form.birthPlace = String(data.birthPlace ?? '');

		form.gestationalAgeWeeks = toNullableNumber(data.gestationalAgeWeeks);

		form.premature = Boolean(data.premature ?? false);
		form.prematurityLevel = String(data.prematurityLevel ?? '');

		form.deliveryMethod = String(data.deliveryMethod ?? '');

		form.birthWeightKg = toNullableNumber(data.birthWeightKg);
		form.birthHeightCm = toNullableNumber(data.birthHeightCm);

		form.birthHeadCircumferenceCm = toNullableNumber(data.birthHeadCircumferenceCm);

		form.apgarScore1Minute = toNullableNumber(data.apgarScore1Minute);

		form.apgarScore5Minutes = toNullableNumber(data.apgarScore5Minutes);

		form.apgarScore10Minutes = toNullableNumber(data.apgarScore10Minutes);

		form.neonatalComplications = String(data.neonatalComplications ?? '');

		form.neonatalComplicationsManagement = String(data.neonatalComplicationsManagement ?? '');

		form.neonatalHospitalization = Boolean(data.neonatalHospitalization ?? false);

		form.neonatalHospitalizationService = String(data.neonatalHospitalizationService ?? '');

		form.neonatalHospitalizationDuration = String(data.neonatalHospitalizationDuration ?? '');

		form.neonatalHospitalizationReason = String(data.neonatalHospitalizationReason ?? '');

		form.headControlAgeMonths = toNullableNumber(data.headControlAgeMonths);

		form.sittingAgeMonths = toNullableNumber(data.sittingAgeMonths);

		form.walkingAgeMonths = toNullableNumber(data.walkingAgeMonths);

		form.motorDevelopmentNotes = String(data.motorDevelopmentNotes ?? '');

		form.firstWordsAgeMonths = toNullableNumber(data.firstWordsAgeMonths);

		form.languageDevelopment = String(data.languageDevelopment ?? '');

		form.psychomotorAssessment = String(data.psychomotorAssessment ?? '');

		form.psychomotorObservations = String(data.psychomotorObservations ?? '');

		form.schoolLevel = String(data.schoolLevel ?? '');
		form.schoolDifficulties = String(data.schoolDifficulties ?? '');

		form.feedingType = String(data.feedingType ?? '');

		form.breastfeedingStartDate = String(data.breastfeedingStartDate ?? '');

		form.breastfeedingEndDate = String(data.breastfeedingEndDate ?? '');

		form.foodDiversificationDate = String(data.foodDiversificationDate ?? '');

		form.foodDiversificationEvolution = String(data.foodDiversificationEvolution ?? '');

		form.legalGuardianType = String(data.legalGuardianType ?? '');

		form.legalGuardianName = String(data.legalGuardianName ?? '');

		form.legalGuardianRelationship = String(data.legalGuardianRelationship ?? '');

		form.legalGuardianPhone = String(data.legalGuardianPhone ?? '');

		form.legalGuardianEmail = String(data.legalGuardianEmail ?? '');

		form.legalGuardianAddress = String(data.legalGuardianAddress ?? '');

		growthHistory = toArray<GrowthRecord>(data.growthHistory);

		foodAllergies = toArray<FoodAllergy>(data.foodAllergies);

		vaccinations = toArray<VaccinationRecord>(data.vaccinations);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			growthHistory,
			foodAllergies,
			vaccinations
		});
	});

	function addGrowthRecord() {
		growthHistory = [
			...growthHistory,
			{
				date: '',
				weightKg: null,
				heightCm: null,
				bmi: null,
				headCircumferenceCm: null,
				weightPercentile: null,
				heightPercentile: null,
				bmiPercentile: null,
				headCircumferencePercentile: null
			}
		];
	}

	function removeGrowthRecord(index: number) {
		growthHistory = growthHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addFoodAllergy() {
		foodAllergies = [
			...foodAllergies,
			{
				food: '',
				reaction: '',
				severity: ''
			}
		];
	}

	function removeFoodAllergy(index: number) {
		foodAllergies = foodAllergies.filter((_, itemIndex) => itemIndex !== index);
	}

	function addVaccination() {
		vaccinations = [
			...vaccinations,
			{
				vaccine: '',
				dose: '',
				scheduledDate: '',
				administeredDate: '',
				batchNumber: '',
				center: '',
				status: ''
			}
		];
	}

	function removeVaccination(index: number) {
		vaccinations = vaccinations.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Naissance et période néonatale
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Conditions de naissance</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="birth-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date de naissance
				</label>

				<input
					id="birth-date"
					type="date"
					bind:value={form.birthDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="birth-place" class="mb-2 block text-sm font-bold text-slate-700">
					Lieu de naissance
				</label>

				<input
					id="birth-place"
					type="text"
					bind:value={form.birthPlace}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="gestational-age" class="mb-2 block text-sm font-bold text-slate-700">
					Terme de grossesse
				</label>

				<input
					id="gestational-age"
					type="number"
					min="20"
					max="45"
					bind:value={form.gestationalAgeWeeks}
					placeholder="Semaines"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="delivery-method" class="mb-2 block text-sm font-bold text-slate-700">
					Mode d’accouchement
				</label>

				<select
					id="delivery-method"
					bind:value={form.deliveryMethod}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				>
					<option value="">Sélectionner</option>
					<option value="VAGINAL">Voie basse</option>
					<option value="CESAREAN">Césarienne</option>
					<option value="INSTRUMENTAL">Instrumental</option>
				</select>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.premature} />

				<span class="text-sm font-bold text-slate-700"> Prématurité </span>
			</label>

			<div>
				<label for="prematurity-level" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau de prématurité
				</label>

				<select
					id="prematurity-level"
					bind:value={form.prematurityLevel}
					disabled={!form.premature}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92] disabled:bg-slate-100 disabled:text-slate-400"
				>
					<option value="">Sélectionner</option>
					<option value="EXTREME">Extrême</option>
					<option value="SEVERE">Grande prématurité</option>
					<option value="MODERATE">Modérée</option>
					<option value="LATE">Tardive</option>
				</select>
			</div>
		</div>

		<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="birth-weight" class="mb-2 block text-sm font-bold text-slate-700">
					Poids à la naissance
				</label>

				<input
					id="birth-weight"
					type="number"
					min="0"
					step="0.01"
					bind:value={form.birthWeightKg}
					placeholder="kg"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="birth-height" class="mb-2 block text-sm font-bold text-slate-700">
					Taille à la naissance
				</label>

				<input
					id="birth-height"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.birthHeightCm}
					placeholder="cm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>

			<div>
				<label for="birth-head" class="mb-2 block text-sm font-bold text-slate-700">
					Périmètre crânien
				</label>

				<input
					id="birth-head"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.birthHeadCircumferenceCm}
					placeholder="cm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>
		</div>

		<div class="grid gap-5 sm:grid-cols-3">
			<div>
				<label for="apgar-1" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 1 minute
				</label>

				<input
					id="apgar-1"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore1Minute}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="apgar-5" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 5 minutes
				</label>

				<input
					id="apgar-5"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore5Minutes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="apgar-10" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 10 minutes
				</label>

				<input
					id="apgar-10"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore10Minutes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="neonatal-complications" class="mb-2 block text-sm font-bold text-slate-700">
					Complications néonatales
				</label>

				<textarea
					id="neonatal-complications"
					bind:value={form.neonatalComplications}
					rows="4"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div>
				<label for="neonatal-management" class="mb-2 block text-sm font-bold text-slate-700">
					Prise en charge
				</label>

				<textarea
					id="neonatal-management"
					bind:value={form.neonatalComplicationsManagement}
					rows="4"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<label class="flex items-center gap-3">
				<input type="checkbox" bind:checked={form.neonatalHospitalization} />

				<span class="text-sm font-black text-slate-800"> Hospitalisation néonatale </span>
			</label>

			<div class="mt-4 grid gap-4 md:grid-cols-3">
				<input
					type="text"
					bind:value={form.neonatalHospitalizationService}
					disabled={!form.neonatalHospitalization}
					placeholder="Service"
					class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>

				<input
					type="text"
					bind:value={form.neonatalHospitalizationDuration}
					disabled={!form.neonatalHospitalization}
					placeholder="Durée"
					class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>

				<input
					type="text"
					bind:value={form.neonatalHospitalizationReason}
					disabled={!form.neonatalHospitalization}
					placeholder="Motif"
					class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Croissance</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Mesures et courbes de croissance</h4>
			</div>

			<button
				type="button"
				onclick={addGrowthRecord}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une mesure
			</button>
		</div>

		<div class="space-y-4">
			{#each growthHistory as item, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Mesure #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removeGrowthRecord(index)}
							aria-label={`Supprimer la mesure ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
						<input
							type="date"
							bind:value={item.date}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.01"
							bind:value={item.weightKg}
							placeholder="Poids (kg)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={item.heightCm}
							placeholder="Taille (cm)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={item.bmi}
							placeholder="IMC"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={item.headCircumferenceCm}
							placeholder="PC (cm)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<input
							type="number"
							min="0"
							max="100"
							bind:value={item.weightPercentile}
							placeholder="Percentile poids"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							max="100"
							bind:value={item.heightPercentile}
							placeholder="Percentile taille"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							max="100"
							bind:value={item.bmiPercentile}
							placeholder="Percentile IMC"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							max="100"
							bind:value={item.headCircumferencePercentile}
							placeholder="Percentile PC"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Développement</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Développement moteur, langage et scolarité
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<input
				type="number"
				min="0"
				bind:value={form.headControlAgeMonths}
				placeholder="Tenue de tête (mois)"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.sittingAgeMonths}
				placeholder="Position assise (mois)"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.walkingAgeMonths}
				placeholder="Marche (mois)"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				bind:value={form.firstWordsAgeMonths}
				placeholder="Premiers mots (mois)"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.motorDevelopmentNotes}
				rows="4"
				placeholder="Observations sur le développement moteur"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.languageDevelopment}
				rows="4"
				placeholder="Évolution du langage"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.psychomotorAssessment}
				rows="4"
				placeholder="Évaluation psychomotrice"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.psychomotorObservations}
				rows="4"
				placeholder="Observations psychomotrices"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="school-level" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau scolaire
				</label>

				<input
					id="school-level"
					type="text"
					bind:value={form.schoolLevel}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="school-difficulties" class="mb-2 block text-sm font-bold text-slate-700">
					Difficultés scolaires
				</label>

				<input
					id="school-difficulties"
					type="text"
					bind:value={form.schoolDifficulties}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Alimentation</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Allaitement, diversification et allergies
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="feeding-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type d’alimentation
				</label>

				<select
					id="feeding-type"
					bind:value={form.feedingType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="BREASTFEEDING">Allaitement maternel</option>
					<option value="FORMULA">Allaitement artificiel</option>
					<option value="MIXED">Allaitement mixte</option>
				</select>
			</div>

			<div>
				<label for="breastfeeding-start" class="mb-2 block text-sm font-bold text-slate-700">
					Début de l’allaitement
				</label>

				<input
					id="breastfeeding-start"
					type="date"
					bind:value={form.breastfeedingStartDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="breastfeeding-end" class="mb-2 block text-sm font-bold text-slate-700">
					Fin de l’allaitement
				</label>

				<input
					id="breastfeeding-end"
					type="date"
					bind:value={form.breastfeedingEndDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="diversification-date" class="mb-2 block text-sm font-bold text-slate-700">
					Début de diversification
				</label>

				<input
					id="diversification-date"
					type="date"
					bind:value={form.foodDiversificationDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="diversification-evolution" class="mb-2 block text-sm font-bold text-slate-700">
					Évolution de la diversification
				</label>

				<textarea
					id="diversification-evolution"
					bind:value={form.foodDiversificationEvolution}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Allergies alimentaires</p>

					<p class="mt-1 text-sm text-slate-500">Aliment, réaction et niveau de gravité.</p>
				</div>

				<button
					type="button"
					onclick={addFoodAllergy}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each foodAllergies as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1.5fr_180px_48px]"
					>
						<input
							type="text"
							bind:value={item.food}
							placeholder="Aliment"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.reaction}
							placeholder="Réaction"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<select
							bind:value={item.severity}
							aria-label={`Gravité de l’allergie ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Gravité</option>
							<option value="LOW">Faible</option>
							<option value="MEDIUM">Modérée</option>
							<option value="HIGH">Sévère</option>
							<option value="ANAPHYLAXIS">Anaphylaxie</option>
						</select>

						<button
							type="button"
							onclick={() => removeFoodAllergy(index)}
							aria-label={`Supprimer l’allergie ${index + 1}`}
							class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Vaccinations</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Carnet vaccinal</h4>
			</div>

			<button
				type="button"
				onclick={addVaccination}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un vaccin
			</button>
		</div>

		<div class="space-y-4">
			{#each vaccinations as item, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Vaccination #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removeVaccination(index)}
							aria-label={`Supprimer la vaccination ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<input
							type="text"
							bind:value={item.vaccine}
							placeholder="Vaccin"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.dose}
							placeholder="Dose"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="date"
							bind:value={item.scheduledDate}
							aria-label={`Date prévue de la vaccination ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="date"
							bind:value={item.administeredDate}
							aria-label={`Date réalisée de la vaccination ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.batchNumber}
							placeholder="Numéro de lot"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.center}
							placeholder="Centre"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<select
							bind:value={item.status}
							aria-label={`Statut de la vaccination ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Statut</option>
							<option value="PLANNED">Prévue</option>
							<option value="COMPLETED">Réalisée</option>
							<option value="DELAYED">Retardée</option>
							<option value="MISSED">Non réalisée</option>
						</select>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Responsable légal</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Parent ou tuteur</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="guardian-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type
				</label>

				<select
					id="guardian-type"
					bind:value={form.legalGuardianType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="PARENT">Parent</option>
					<option value="LEGAL_GUARDIAN">Tuteur légal</option>
					<option value="OTHER">Autre responsable</option>
				</select>
			</div>

			<div>
				<label for="guardian-name" class="mb-2 block text-sm font-bold text-slate-700">
					Nom et prénoms
				</label>

				<input
					id="guardian-name"
					type="text"
					bind:value={form.legalGuardianName}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="guardian-relationship" class="mb-2 block text-sm font-bold text-slate-700">
					Lien avec l’enfant
				</label>

				<input
					id="guardian-relationship"
					type="text"
					bind:value={form.legalGuardianRelationship}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="guardian-phone" class="mb-2 block text-sm font-bold text-slate-700">
					Téléphone
				</label>

				<input
					id="guardian-phone"
					type="tel"
					bind:value={form.legalGuardianPhone}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="guardian-email" class="mb-2 block text-sm font-bold text-slate-700">
					Adresse e-mail
				</label>

				<input
					id="guardian-email"
					type="email"
					bind:value={form.legalGuardianEmail}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="guardian-address" class="mb-2 block text-sm font-bold text-slate-700">
					Adresse
				</label>

				<input
					id="guardian-address"
					type="text"
					bind:value={form.legalGuardianAddress}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>
</div>
