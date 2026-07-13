<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type BloodPressureRecord = {
		dateTime: string;
		systolic: number | null;
		diastolic: number | null;
		context: string;
	};

	type CardiologyExamRecord = {
		date: string;
		duration: string;
		result: string;
		conclusion: string;
		fileUrl: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		hasHypertension: false,
		hypertensionDiagnosisDate: '',

		hasDiabetes: false,
		diabetesType: '',

		smokingStatus: '',
		cigarettesPerDay: null as number | null,
		smokingYears: null as number | null,

		weightKg: null as number | null,
		heightCm: null as number | null,
		bmi: null as number | null,

		hasHypercholesterolemia: false,
		totalCholesterol: null as number | null,
		hdlCholesterol: null as number | null,
		ldlCholesterol: null as number | null,
		triglycerides: null as number | null,

		physicalActivityLevel: '',
		familyCardiovascularHistory: '',

		chestPain: false,
		chestPainType: '',
		chestPainLocation: '',
		chestPainDuration: '',
		chestPainIntensity: null as number | null,

		palpitations: false,
		palpitationsFrequency: '',
		palpitationsDuration: '',

		dyspnea: false,
		dyspneaContext: '',

		discomfort: false,
		discomfortCircumstances: '',

		syncope: false,
		syncopeFrequency: '',
		syncopeContext: '',

		edema: false,
		edemaLocation: '',

		fatigue: false,
		fatigueIntensity: null as number | null,

		heartRate: null as number | null,
		heartRhythm: '',

		peripheralPulses: '',
		heartMurmurPresent: false,
		heartMurmurCharacteristics: '',

		oxygenSaturation: null as number | null
	});

	let bloodPressureHistory = $state<BloodPressureRecord[]>([]);
	let ecgHistory = $state<CardiologyExamRecord[]>([]);
	let echocardiographyHistory = $state<CardiologyExamRecord[]>([]);
	let holterHistory = $state<CardiologyExamRecord[]>([]);
	let ambulatoryBloodPressureHistory = $state<CardiologyExamRecord[]>([]);
	let stressTestHistory = $state<CardiologyExamRecord[]>([]);
	let coronaryAngiographyHistory = $state<CardiologyExamRecord[]>([]);

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

		form.hasHypertension = Boolean(data.hasHypertension ?? false);
		form.hypertensionDiagnosisDate = String(data.hypertensionDiagnosisDate ?? '');

		form.hasDiabetes = Boolean(data.hasDiabetes ?? false);
		form.diabetesType = String(data.diabetesType ?? '');

		form.smokingStatus = String(data.smokingStatus ?? '');
		form.cigarettesPerDay = toNullableNumber(data.cigarettesPerDay);
		form.smokingYears = toNullableNumber(data.smokingYears);

		form.weightKg = toNullableNumber(data.weightKg);
		form.heightCm = toNullableNumber(data.heightCm);
		form.bmi = toNullableNumber(data.bmi);

		form.hasHypercholesterolemia = Boolean(data.hasHypercholesterolemia ?? false);

		form.totalCholesterol = toNullableNumber(data.totalCholesterol);
		form.hdlCholesterol = toNullableNumber(data.hdlCholesterol);
		form.ldlCholesterol = toNullableNumber(data.ldlCholesterol);
		form.triglycerides = toNullableNumber(data.triglycerides);

		form.physicalActivityLevel = String(data.physicalActivityLevel ?? '');

		form.familyCardiovascularHistory = String(data.familyCardiovascularHistory ?? '');

		form.chestPain = Boolean(data.chestPain ?? false);
		form.chestPainType = String(data.chestPainType ?? '');
		form.chestPainLocation = String(data.chestPainLocation ?? '');
		form.chestPainDuration = String(data.chestPainDuration ?? '');

		form.chestPainIntensity = toNullableNumber(data.chestPainIntensity);

		form.palpitations = Boolean(data.palpitations ?? false);

		form.palpitationsFrequency = String(data.palpitationsFrequency ?? '');

		form.palpitationsDuration = String(data.palpitationsDuration ?? '');

		form.dyspnea = Boolean(data.dyspnea ?? false);
		form.dyspneaContext = String(data.dyspneaContext ?? '');

		form.discomfort = Boolean(data.discomfort ?? false);

		form.discomfortCircumstances = String(data.discomfortCircumstances ?? '');

		form.syncope = Boolean(data.syncope ?? false);
		form.syncopeFrequency = String(data.syncopeFrequency ?? '');
		form.syncopeContext = String(data.syncopeContext ?? '');

		form.edema = Boolean(data.edema ?? false);
		form.edemaLocation = String(data.edemaLocation ?? '');

		form.fatigue = Boolean(data.fatigue ?? false);
		form.fatigueIntensity = toNullableNumber(data.fatigueIntensity);

		form.heartRate = toNullableNumber(data.heartRate);
		form.heartRhythm = String(data.heartRhythm ?? '');

		form.peripheralPulses = String(data.peripheralPulses ?? '');

		form.heartMurmurPresent = Boolean(data.heartMurmurPresent ?? false);

		form.heartMurmurCharacteristics = String(data.heartMurmurCharacteristics ?? '');

		form.oxygenSaturation = toNullableNumber(data.oxygenSaturation);

		bloodPressureHistory = toArray<BloodPressureRecord>(data.bloodPressureHistory);

		ecgHistory = toArray<CardiologyExamRecord>(data.ecgHistory);

		echocardiographyHistory = toArray<CardiologyExamRecord>(data.echocardiographyHistory);

		holterHistory = toArray<CardiologyExamRecord>(data.holterHistory);

		ambulatoryBloodPressureHistory = toArray<CardiologyExamRecord>(
			data.ambulatoryBloodPressureHistory
		);

		stressTestHistory = toArray<CardiologyExamRecord>(data.stressTestHistory);

		coronaryAngiographyHistory = toArray<CardiologyExamRecord>(data.coronaryAngiographyHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		if (form.weightKg !== null && form.heightCm !== null && form.heightCm > 0) {
			const heightInMeters = form.heightCm / 100;
			const calculatedBMI = form.weightKg / (heightInMeters * heightInMeters);

			form.bmi = Math.round(calculatedBMI * 10) / 10;
		}
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			bloodPressureHistory,
			ecgHistory,
			echocardiographyHistory,
			holterHistory,
			ambulatoryBloodPressureHistory,
			stressTestHistory,
			coronaryAngiographyHistory
		});
	});

	function addBloodPressureRecord() {
		bloodPressureHistory = [
			...bloodPressureHistory,
			{
				dateTime: '',
				systolic: null,
				diastolic: null,
				context: ''
			}
		];
	}

	function removeBloodPressureRecord(index: number) {
		bloodPressureHistory = bloodPressureHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function createExamRecord(): CardiologyExamRecord {
		return {
			date: '',
			duration: '',
			result: '',
			conclusion: '',
			fileUrl: ''
		};
	}

	function addECG() {
		ecgHistory = [...ecgHistory, createExamRecord()];
	}

	function removeECG(index: number) {
		ecgHistory = ecgHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addEchocardiography() {
		echocardiographyHistory = [...echocardiographyHistory, createExamRecord()];
	}

	function removeEchocardiography(index: number) {
		echocardiographyHistory = echocardiographyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addHolter() {
		holterHistory = [...holterHistory, createExamRecord()];
	}

	function removeHolter(index: number) {
		holterHistory = holterHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addAmbulatoryBloodPressure() {
		ambulatoryBloodPressureHistory = [...ambulatoryBloodPressureHistory, createExamRecord()];
	}

	function removeAmbulatoryBloodPressure(index: number) {
		ambulatoryBloodPressureHistory = ambulatoryBloodPressureHistory.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}

	function addStressTest() {
		stressTestHistory = [...stressTestHistory, createExamRecord()];
	}

	function removeStressTest(index: number) {
		stressTestHistory = stressTestHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addCoronaryAngiography() {
		coronaryAngiographyHistory = [...coronaryAngiographyHistory, createExamRecord()];
	}

	function removeCoronaryAngiography(index: number) {
		coronaryAngiographyHistory = coronaryAngiographyHistory.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Facteurs de risque cardiovasculaire
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Antécédents et mode de vie</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.hasHypertension} />

				<span class="text-sm font-bold text-slate-700"> Hypertension </span>
			</label>

			<div>
				<label for="hypertension-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du diagnostic
				</label>

				<input
					id="hypertension-date"
					type="date"
					bind:value={form.hypertensionDiagnosisDate}
					disabled={!form.hasHypertension}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.hasDiabetes} />

				<span class="text-sm font-bold text-slate-700"> Diabète </span>
			</label>

			<div>
				<label for="diabetes-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de diabète
				</label>

				<select
					id="diabetes-type"
					bind:value={form.diabetesType}
					disabled={!form.hasDiabetes}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				>
					<option value=""> Sélectionner </option>
					<option value="TYPE_1"> Type 1 </option>
					<option value="TYPE_2"> Type 2 </option>
					<option value="GESTATIONAL"> Gestationnel </option>
					<option value="OTHER"> Autre </option>
				</select>
			</div>

			<div>
				<label for="smoking-status" class="mb-2 block text-sm font-bold text-slate-700">
					Tabagisme
				</label>

				<select
					id="smoking-status"
					bind:value={form.smokingStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value=""> Sélectionner </option>
					<option value="NEVER"> Jamais </option>
					<option value="CURRENT"> Actuel </option>
					<option value="FORMER"> Ancien </option>
				</select>
			</div>

			<div>
				<label for="cigarettes-per-day" class="mb-2 block text-sm font-bold text-slate-700">
					Cigarettes par jour
				</label>

				<input
					id="cigarettes-per-day"
					type="number"
					min="0"
					bind:value={form.cigarettesPerDay}
					disabled={form.smokingStatus === 'NEVER'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div>
				<label for="smoking-years" class="mb-2 block text-sm font-bold text-slate-700">
					Nombre d’années
				</label>

				<input
					id="smoking-years"
					type="number"
					min="0"
					bind:value={form.smokingYears}
					disabled={form.smokingStatus === 'NEVER'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div>
				<label for="activity-level" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’activité
				</label>

				<select
					id="activity-level"
					bind:value={form.physicalActivityLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value=""> Sélectionner </option>
					<option value="SEDENTARY"> Sédentaire </option>
					<option value="LOW"> Faible </option>
					<option value="MODERATE"> Modérée </option>
					<option value="HIGH"> Élevée </option>
				</select>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="cardiology-weight" class="mb-2 block text-sm font-bold text-slate-700">
					Poids
				</label>

				<input
					id="cardiology-weight"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.weightKg}
					placeholder="kg"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="cardiology-height" class="mb-2 block text-sm font-bold text-slate-700">
					Taille
				</label>

				<input
					id="cardiology-height"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.heightCm}
					placeholder="cm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="cardiology-bmi" class="mb-2 block text-sm font-bold text-slate-700">
					IMC
				</label>

				<input
					id="cardiology-bmi"
					type="number"
					value={form.bmi ?? ''}
					readonly
					class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<label class="flex items-center gap-3">
				<input type="checkbox" bind:checked={form.hasHypercholesterolemia} />

				<span class="text-sm font-black text-slate-800"> Antécédent de cholestérol élevé </span>
			</label>

			<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<input
					type="number"
					step="0.01"
					bind:value={form.totalCholesterol}
					placeholder="Cholestérol total"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="number"
					step="0.01"
					bind:value={form.hdlCholesterol}
					placeholder="HDL"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="number"
					step="0.01"
					bind:value={form.ldlCholesterol}
					placeholder="LDL"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="number"
					step="0.01"
					bind:value={form.triglycerides}
					placeholder="Triglycérides"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div>
			<label
				for="family-cardiovascular-history"
				class="mb-2 block text-sm font-bold text-slate-700"
			>
				Antécédents cardiovasculaires familiaux
			</label>

			<textarea
				id="family-cardiovascular-history"
				bind:value={form.familyCardiovascularHistory}
				rows="4"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Symptômes cardiovasculaires
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Douleur, dyspnée, malaise et œdèmes</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.chestPain} />
				<span class="text-sm font-bold text-slate-700"> Douleur thoracique </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.palpitations} />
				<span class="text-sm font-bold text-slate-700"> Palpitations </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.dyspnea} />
				<span class="text-sm font-bold text-slate-700"> Essoufflement </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.discomfort} />
				<span class="text-sm font-bold text-slate-700"> Malaise </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.syncope} />
				<span class="text-sm font-bold text-slate-700"> Syncope </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.edema} />
				<span class="text-sm font-bold text-slate-700"> Œdèmes </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.fatigue} />
				<span class="text-sm font-bold text-slate-700"> Fatigue </span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<input
				type="text"
				bind:value={form.chestPainType}
				disabled={!form.chestPain}
				placeholder="Type de douleur"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.chestPainLocation}
				disabled={!form.chestPain}
				placeholder="Localisation"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.chestPainDuration}
				disabled={!form.chestPain}
				placeholder="Durée"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="number"
				min="0"
				max="10"
				bind:value={form.chestPainIntensity}
				disabled={!form.chestPain}
				placeholder="Intensité /10"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.palpitationsFrequency}
				disabled={!form.palpitations}
				placeholder="Fréquence des palpitations"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.palpitationsDuration}
				disabled={!form.palpitations}
				placeholder="Durée des palpitations"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<select
				bind:value={form.dyspneaContext}
				disabled={!form.dyspnea}
				aria-label="Contexte de l’essoufflement"
				class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
			>
				<option value=""> Essoufflement </option>
				<option value="EXERTION"> À l’effort </option>
				<option value="REST"> Au repos </option>
				<option value="BOTH"> Effort et repos </option>
			</select>

			<input
				type="text"
				bind:value={form.discomfortCircumstances}
				disabled={!form.discomfort}
				placeholder="Circonstances du malaise"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.syncopeFrequency}
				disabled={!form.syncope}
				placeholder="Fréquence des syncopes"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.syncopeContext}
				disabled={!form.syncope}
				placeholder="Contexte des syncopes"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.edemaLocation}
				disabled={!form.edema}
				placeholder="Localisation des œdèmes"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="number"
				min="0"
				max="10"
				bind:value={form.fatigueIntensity}
				disabled={!form.fatigue}
				placeholder="Intensité fatigue /10"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Examen cardiovasculaire
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Constantes et auscultation</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="cardiology-heart-rate" class="mb-2 block text-sm font-bold text-slate-700">
					Fréquence cardiaque
				</label>

				<input
					id="cardiology-heart-rate"
					type="number"
					bind:value={form.heartRate}
					placeholder="bpm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="heart-rhythm" class="mb-2 block text-sm font-bold text-slate-700">
					Rythme cardiaque
				</label>

				<select
					id="heart-rhythm"
					bind:value={form.heartRhythm}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value=""> Sélectionner </option>
					<option value="REGULAR"> Régulier </option>
					<option value="IRREGULAR"> Irrégulier </option>
				</select>
			</div>

			<div>
				<label for="oxygen-saturation" class="mb-2 block text-sm font-bold text-slate-700">
					Saturation
				</label>

				<input
					id="oxygen-saturation"
					type="number"
					min="0"
					max="100"
					step="0.1"
					bind:value={form.oxygenSaturation}
					placeholder="%"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.peripheralPulses}
				rows="4"
				placeholder="Évaluation des pouls périphériques"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={form.heartMurmurPresent} />

					<span class="text-sm font-bold text-slate-700"> Souffle cardiaque présent </span>
				</label>

				<textarea
					bind:value={form.heartMurmurCharacteristics}
					disabled={!form.heartMurmurPresent}
					rows="3"
					placeholder="Caractéristiques du souffle"
					class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				></textarea>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Historique de tension artérielle</p>

					<p class="mt-1 text-sm text-slate-500">Valeurs et contexte de mesure.</p>
				</div>

				<button
					type="button"
					onclick={addBloodPressureRecord}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each bloodPressureHistory as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_150px_150px_1fr_48px]"
					>
						<input
							type="datetime-local"
							bind:value={item.dateTime}
							aria-label={`Date de tension ${index + 1}`}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.systolic}
							placeholder="Systolique"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.diastolic}
							placeholder="Diastolique"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.context}
							placeholder="Contexte"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removeBloodPressureRecord(index)}
							aria-label={`Supprimer la tension ${index + 1}`}
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
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Examens cardiologiques
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				ECG, échographie, Holter et explorations
			</h4>
		</div>

		{@render ExamHistoryBlock(
			'ECG',
			'Date, résultat, conclusion et fichier.',
			ecgHistory,
			addECG,
			removeECG,
			false
		)}

		{@render ExamHistoryBlock(
			'Échographie cardiaque',
			'Date, résultat et conclusion.',
			echocardiographyHistory,
			addEchocardiography,
			removeEchocardiography,
			false
		)}

		{@render ExamHistoryBlock(
			'Holter ECG',
			'Date, durée et résultat.',
			holterHistory,
			addHolter,
			removeHolter,
			true
		)}

		{@render ExamHistoryBlock(
			'MAPA',
			'Mesure ambulatoire de la pression artérielle.',
			ambulatoryBloodPressureHistory,
			addAmbulatoryBloodPressure,
			removeAmbulatoryBloodPressure,
			false
		)}

		{@render ExamHistoryBlock(
			'Test d’effort',
			'Date et résultat.',
			stressTestHistory,
			addStressTest,
			removeStressTest,
			false
		)}

		{@render ExamHistoryBlock(
			'Coronarographie',
			'Date et résultat.',
			coronaryAngiographyHistory,
			addCoronaryAngiography,
			removeCoronaryAngiography,
			false
		)}
	</section>
</div>

{#snippet ExamHistoryBlock(
	title: string,
	description: string,
	records: CardiologyExamRecord[],
	onAdd: () => void,
	onRemove: (index: number) => void,
	showDuration: boolean
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="font-black text-slate-900">
					{title}
				</p>

				<p class="mt-1 text-sm text-slate-500">
					{description}
				</p>
			</div>

			<button
				type="button"
				onclick={onAdd}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter
			</button>
		</div>

		<div class="mt-4 space-y-4">
			{#each records as item, index (index)}
				<article class="rounded-xl border border-slate-200 bg-white p-4">
					<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<input
							type="date"
							bind:value={item.date}
							aria-label={`Date ${title} ${index + 1}`}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						{#if showDuration}
							<input
								type="text"
								bind:value={item.duration}
								placeholder="Durée"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>
						{/if}

						<input
							type="text"
							bind:value={item.result}
							placeholder="Résultat"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.conclusion}
							placeholder="Conclusion"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.fileUrl}
							placeholder="Lien ou référence du fichier"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>
					</div>

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
				</article>
			{/each}
		</div>
	</div>
{/snippet}
