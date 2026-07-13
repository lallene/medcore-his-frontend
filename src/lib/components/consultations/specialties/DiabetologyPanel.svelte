<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type WeightRecord = {
		date: string;
		weightKg: number | null;
		heightCm: number | null;
		bmi: number | null;
	};

	type GlycemiaRecord = {
		dateTime: string;
		value: number | null;
		context: string;
	};

	type HbA1cRecord = {
		date: string;
		value: number | null;
	};

	type RenalFunctionRecord = {
		date: string;
		creatinine: number | null;
		egfr: number | null;
		otherResults: string;
	};

	type InsulinTreatment = {
		insulinType: string;
		dose: string;
		schedule: string;
	};

	type OralAntidiabeticTreatment = {
		medication: string;
		dosage: string;
		frequency: string;
	};

	type HypoglycemiaRecord = {
		dateTime: string;
		severity: string;
		circumstances: string;
		management: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		diabetesType: '',
		diagnosisDate: '',
		diagnosisCircumstances: '',
		familyDiabetesHistory: '',
		initialTreatment: '',

		targetHbA1c: null as number | null,
		ketonuriaResult: '',

		dietaryRecommendations: '',
		dietaryFollowUp: '',

		retinopathyStatus: '',
		retinopathyFollowUp: '',

		nephropathyStatus: '',
		nephropathyFollowUp: '',

		neuropathyStatus: '',
		neuropathyFollowUp: '',

		diabeticFootStatus: '',
		diabeticFootLesions: '',
		diabeticFootGrade: '',

		cardiovascularComplications: ''
	});

	let weightHistory = $state<WeightRecord[]>([]);
	let fastingGlycemiaHistory = $state<GlycemiaRecord[]>([]);
	let postprandialGlycemiaHistory = $state<GlycemiaRecord[]>([]);
	let hba1cHistory = $state<HbA1cRecord[]>([]);
	let renalFunctionHistory = $state<RenalFunctionRecord[]>([]);
	let insulinTreatments = $state<InsulinTreatment[]>([]);
	let oralAntidiabeticTreatments = $state<OralAntidiabeticTreatment[]>([]);
	let hypoglycemiaHistory = $state<HypoglycemiaRecord[]>([]);

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

		form.diabetesType = String(data.diabetesType ?? '');
		form.diagnosisDate = String(data.diagnosisDate ?? '');
		form.diagnosisCircumstances = String(data.diagnosisCircumstances ?? '');
		form.familyDiabetesHistory = String(data.familyDiabetesHistory ?? '');
		form.initialTreatment = String(data.initialTreatment ?? '');

		form.targetHbA1c = toNullableNumber(data.targetHbA1c);
		form.ketonuriaResult = String(data.ketonuriaResult ?? '');

		form.dietaryRecommendations = String(data.dietaryRecommendations ?? '');
		form.dietaryFollowUp = String(data.dietaryFollowUp ?? '');

		form.retinopathyStatus = String(data.retinopathyStatus ?? '');
		form.retinopathyFollowUp = String(data.retinopathyFollowUp ?? '');

		form.nephropathyStatus = String(data.nephropathyStatus ?? '');
		form.nephropathyFollowUp = String(data.nephropathyFollowUp ?? '');

		form.neuropathyStatus = String(data.neuropathyStatus ?? '');
		form.neuropathyFollowUp = String(data.neuropathyFollowUp ?? '');

		form.diabeticFootStatus = String(data.diabeticFootStatus ?? '');
		form.diabeticFootLesions = String(data.diabeticFootLesions ?? '');
		form.diabeticFootGrade = String(data.diabeticFootGrade ?? '');

		form.cardiovascularComplications = String(data.cardiovascularComplications ?? '');

		weightHistory = toArray<WeightRecord>(data.weightHistory);
		fastingGlycemiaHistory = toArray<GlycemiaRecord>(data.fastingGlycemiaHistory);
		postprandialGlycemiaHistory = toArray<GlycemiaRecord>(data.postprandialGlycemiaHistory);
		hba1cHistory = toArray<HbA1cRecord>(data.hba1cHistory);
		renalFunctionHistory = toArray<RenalFunctionRecord>(data.renalFunctionHistory);
		insulinTreatments = toArray<InsulinTreatment>(data.insulinTreatments);
		oralAntidiabeticTreatments = toArray<OralAntidiabeticTreatment>(
			data.oralAntidiabeticTreatments
		);
		hypoglycemiaHistory = toArray<HypoglycemiaRecord>(data.hypoglycemiaHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			weightHistory,
			fastingGlycemiaHistory,
			postprandialGlycemiaHistory,
			hba1cHistory,
			renalFunctionHistory,
			insulinTreatments,
			oralAntidiabeticTreatments,
			hypoglycemiaHistory
		});
	});

	function addWeightRecord() {
		weightHistory = [
			...weightHistory,
			{
				date: '',
				weightKg: null,
				heightCm: null,
				bmi: null
			}
		];
	}

	function calculateBMI(item: WeightRecord): number | null {
		if (item.weightKg === null || item.heightCm === null || item.heightCm <= 0) {
			return null;
		}

		const heightInMeters = item.heightCm / 100;
		const bmi = item.weightKg / (heightInMeters * heightInMeters);

		return Math.round(bmi * 10) / 10;
	}

	function removeWeightRecord(index: number) {
		weightHistory = weightHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addFastingGlycemia() {
		fastingGlycemiaHistory = [
			...fastingGlycemiaHistory,
			{
				dateTime: '',
				value: null,
				context: ''
			}
		];
	}

	function removeFastingGlycemia(index: number) {
		fastingGlycemiaHistory = fastingGlycemiaHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addPostprandialGlycemia() {
		postprandialGlycemiaHistory = [
			...postprandialGlycemiaHistory,
			{
				dateTime: '',
				value: null,
				context: ''
			}
		];
	}

	function removePostprandialGlycemia(index: number) {
		postprandialGlycemiaHistory = postprandialGlycemiaHistory.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}

	function addHbA1c() {
		hba1cHistory = [
			...hba1cHistory,
			{
				date: '',
				value: null
			}
		];
	}

	function removeHbA1c(index: number) {
		hba1cHistory = hba1cHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addRenalFunction() {
		renalFunctionHistory = [
			...renalFunctionHistory,
			{
				date: '',
				creatinine: null,
				egfr: null,
				otherResults: ''
			}
		];
	}

	function removeRenalFunction(index: number) {
		renalFunctionHistory = renalFunctionHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addInsulinTreatment() {
		insulinTreatments = [
			...insulinTreatments,
			{
				insulinType: '',
				dose: '',
				schedule: ''
			}
		];
	}

	function removeInsulinTreatment(index: number) {
		insulinTreatments = insulinTreatments.filter((_, itemIndex) => itemIndex !== index);
	}

	function addOralTreatment() {
		oralAntidiabeticTreatments = [
			...oralAntidiabeticTreatments,
			{
				medication: '',
				dosage: '',
				frequency: ''
			}
		];
	}

	function removeOralTreatment(index: number) {
		oralAntidiabeticTreatments = oralAntidiabeticTreatments.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}

	function addHypoglycemia() {
		hypoglycemiaHistory = [
			...hypoglycemiaHistory,
			{
				dateTime: '',
				severity: '',
				circumstances: '',
				management: ''
			}
		];
	}

	function removeHypoglycemia(index: number) {
		hypoglycemiaHistory = hypoglycemiaHistory.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Histoire du diabète
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Diagnostic et traitement initial</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="diabetes-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de diabète
				</label>

				<select
					id="diabetes-type"
					bind:value={form.diabetesType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="TYPE_1">Type 1</option>
					<option value="TYPE_2">Type 2</option>
					<option value="GESTATIONAL">Gestationnel</option>
					<option value="OTHER">Autre</option>
				</select>
			</div>

			<div>
				<label for="diabetes-diagnosis-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du diagnostic
				</label>

				<input
					id="diabetes-diagnosis-date"
					type="date"
					bind:value={form.diagnosisDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="diagnosis-circumstances" class="mb-2 block text-sm font-bold text-slate-700">
					Circonstances du diagnostic
				</label>

				<input
					id="diagnosis-circumstances"
					type="text"
					bind:value={form.diagnosisCircumstances}
					placeholder="Symptômes, dépistage ou urgence"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="family-diabetes-history" class="mb-2 block text-sm font-bold text-slate-700">
					Antécédents familiaux
				</label>

				<textarea
					id="family-diabetes-history"
					bind:value={form.familyDiabetesHistory}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div class="md:col-span-2">
				<label for="initial-treatment" class="mb-2 block text-sm font-bold text-slate-700">
					Traitement initial
				</label>

				<textarea
					id="initial-treatment"
					bind:value={form.initialTreatment}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Poids et IMC</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Historique anthropométrique</h4>
			</div>

			<button
				type="button"
				onclick={addWeightRecord}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une mesure
			</button>
		</div>

		<div class="space-y-3">
			{#each weightHistory as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr_1fr_1fr_48px]"
				>
					<input
						type="date"
						bind:value={item.date}
						aria-label={`Date de mesure ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						min="0"
						step="0.1"
						bind:value={item.weightKg}
						placeholder="Poids (kg)"
						oninput={() => {
							item.bmi = calculateBMI(item);
						}}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						min="0"
						step="0.1"
						bind:value={item.heightCm}
						placeholder="Taille (cm)"
						oninput={() => {
							item.bmi = calculateBMI(item);
						}}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						value={item.bmi ?? ''}
						readonly
						placeholder="IMC"
						class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeWeightRecord(index)}
						aria-label={`Supprimer la mesure ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Équilibre glycémique
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Glycémies, HbA1c et cétonurie</h4>
		</div>

		{@render GlycemiaBlock(
			'Glycémie à jeun',
			fastingGlycemiaHistory,
			addFastingGlycemia,
			removeFastingGlycemia
		)}

		{@render GlycemiaBlock(
			'Glycémie postprandiale',
			postprandialGlycemiaHistory,
			addPostprandialGlycemia,
			removePostprandialGlycemia
		)}

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">HbA1c</p>
					<p class="mt-1 text-sm text-slate-500">Historique des résultats et objectif cible.</p>
				</div>

				<button
					type="button"
					onclick={addHbA1c}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 max-w-sm">
				<label for="target-hba1c" class="mb-2 block text-sm font-bold text-slate-700">
					Objectif HbA1c
				</label>

				<input
					id="target-hba1c"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.targetHbA1c}
					placeholder="%"
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>
			</div>

			<div class="mt-4 space-y-3">
				{#each hba1cHistory as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[200px_1fr_48px]"
					>
						<input
							type="date"
							bind:value={item.date}
							aria-label={`Date HbA1c ${index + 1}`}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							step="0.1"
							bind:value={item.value}
							placeholder="HbA1c (%)"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removeHbA1c(index)}
							aria-label={`Supprimer HbA1c ${index + 1}`}
							class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div>
			<label for="ketonuria-result" class="mb-2 block text-sm font-bold text-slate-700">
				Cétonurie
			</label>

			<input
				id="ketonuria-result"
				type="text"
				bind:value={form.ketonuriaResult}
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Fonction rénale</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">
					Créatinine et débit de filtration glomérulaire
				</h4>
			</div>

			<button
				type="button"
				onclick={addRenalFunction}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter
			</button>
		</div>

		<div class="space-y-3">
			{#each renalFunctionHistory as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr_1fr_1.5fr_48px]"
				>
					<input
						type="date"
						bind:value={item.date}
						aria-label={`Date fonction rénale ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						step="0.01"
						bind:value={item.creatinine}
						placeholder="Créatinine"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						step="0.1"
						bind:value={item.egfr}
						placeholder="DFG"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.otherResults}
						placeholder="Autres résultats"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeRenalFunction(index)}
						aria-label={`Supprimer la fonction rénale ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Traitements</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Insuline et antidiabétiques oraux</h4>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			{@render TreatmentBlock(
				'Insuline',
				insulinTreatments,
				addInsulinTreatment,
				removeInsulinTreatment,
				true
			)}

			{@render TreatmentBlock(
				'Antidiabétiques oraux',
				oralAntidiabeticTreatments,
				addOralTreatment,
				removeOralTreatment,
				false
			)}
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.dietaryRecommendations}
				rows="4"
				placeholder="Recommandations alimentaires"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.dietaryFollowUp}
				rows="4"
				placeholder="Suivi du régime alimentaire"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Complications</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Dépistage et suivi des complications chroniques
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			{@render ComplicationBlock(
				'Rétinopathie',
				form.retinopathyStatus,
				form.retinopathyFollowUp,
				(value) => (form.retinopathyStatus = value),
				(value) => (form.retinopathyFollowUp = value)
			)}

			{@render ComplicationBlock(
				'Néphropathie',
				form.nephropathyStatus,
				form.nephropathyFollowUp,
				(value) => (form.nephropathyStatus = value),
				(value) => (form.nephropathyFollowUp = value)
			)}

			{@render ComplicationBlock(
				'Neuropathie',
				form.neuropathyStatus,
				form.neuropathyFollowUp,
				(value) => (form.neuropathyStatus = value),
				(value) => (form.neuropathyFollowUp = value)
			)}
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<p class="font-black text-slate-900">Pied diabétique</p>

			<div class="mt-4 grid gap-4 md:grid-cols-3">
				<input
					type="text"
					bind:value={form.diabeticFootStatus}
					placeholder="État général"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="text"
					bind:value={form.diabeticFootLesions}
					placeholder="Lésions"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="text"
					bind:value={form.diabeticFootGrade}
					placeholder="Grade"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div>
			<label for="cardiovascular-complications" class="mb-2 block text-sm font-bold text-slate-700">
				Complications cardiovasculaires
			</label>

			<textarea
				id="cardiovascular-complications"
				bind:value={form.cardiovascularComplications}
				rows="4"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Hypoglycémies</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Épisodes et circonstances</h4>
			</div>

			<button
				type="button"
				onclick={addHypoglycemia}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un épisode
			</button>
		</div>

		<div class="space-y-3">
			{#each hypoglycemiaHistory as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[220px_180px_1fr_1fr_48px]"
				>
					<input
						type="datetime-local"
						bind:value={item.dateTime}
						aria-label={`Date hypoglycémie ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<select
						bind:value={item.severity}
						aria-label={`Gravité hypoglycémie ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="">Gravité</option>
						<option value="MILD">Légère</option>
						<option value="MODERATE">Modérée</option>
						<option value="SEVERE">Sévère</option>
					</select>

					<input
						type="text"
						bind:value={item.circumstances}
						placeholder="Circonstances"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.management}
						placeholder="Prise en charge"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeHypoglycemia(index)}
						aria-label={`Supprimer l’hypoglycémie ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</section>
</div>

{#snippet GlycemiaBlock(
	title: string,
	records: GlycemiaRecord[],
	onAdd: () => void,
	onRemove: (index: number) => void
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<div class="flex items-center justify-between gap-4">
			<p class="font-black text-slate-900">{title}</p>

			<button
				type="button"
				onclick={onAdd}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter
			</button>
		</div>

		<div class="mt-4 space-y-3">
			{#each records as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_180px_1fr_48px]"
				>
					<input
						type="datetime-local"
						bind:value={item.dateTime}
						aria-label={`Date ${title} ${index + 1}`}
						class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
					/>

					<input
						type="number"
						step="0.01"
						bind:value={item.value}
						placeholder="Valeur"
						class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.context}
						placeholder="Contexte ou observation"
						class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => onRemove(index)}
						aria-label={`Supprimer ${title} ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet TreatmentBlock(
	title: string,
	records: InsulinTreatment[] | OralAntidiabeticTreatment[],
	onAdd: () => void,
	onRemove: (index: number) => void,
	isInsulin: boolean
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<div class="flex items-center justify-between gap-4">
			<p class="font-black text-slate-900">{title}</p>

			<button
				type="button"
				onclick={onAdd}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter
			</button>
		</div>

		<div class="mt-4 space-y-3">
			{#each records as item, index (index)}
				<div class="rounded-xl border border-slate-200 bg-white p-4">
					{#if isInsulin && 'insulinType' in item}
						<div class="grid gap-3">
							<input
								type="text"
								bind:value={item.insulinType}
								placeholder="Type d’insuline"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.dose}
								placeholder="Dose"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.schedule}
								placeholder="Horaires"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>
						</div>
					{:else if 'medication' in item}
						<div class="grid gap-3">
							<input
								type="text"
								bind:value={item.medication}
								placeholder="Médicament"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.dosage}
								placeholder="Dosage"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.frequency}
								placeholder="Fréquence"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>
						</div>
					{/if}

					<div class="mt-3 flex justify-end">
						<button
							type="button"
							onclick={() => onRemove(index)}
							class="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
						>
							<Trash2 size={16} />
							Supprimer
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet ComplicationBlock(
	title: string,
	status: string,
	followUp: string,
	onStatusChange: (value: string) => void,
	onFollowUpChange: (value: string) => void
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<p class="font-black text-slate-900">{title}</p>

		<select
			value={status}
			onchange={(event) => onStatusChange(event.currentTarget.value)}
			aria-label={`Statut ${title}`}
			class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
		>
			<option value="">Statut</option>
			<option value="ABSENT">Absente</option>
			<option value="PRESENT">Présente</option>
			<option value="SUSPECTED">Suspectée</option>
			<option value="UNKNOWN">Non évaluée</option>
		</select>

		<textarea
			value={followUp}
			oninput={(event) => onFollowUpChange(event.currentTarget.value)}
			rows="3"
			placeholder="Suivi et observations"
			class="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"></textarea>
	</div>
{/snippet}
