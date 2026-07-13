<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';
	import { SvelteDate } from 'svelte/reactivity';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type PrenatalVisit = {
		date: string;
		weightKg: number | null;
		bloodPressureSystolic: number | null;
		bloodPressureDiastolic: number | null;
		temperature: number | null;
		uterineHeightCm: number | null;
		fetalMovements: string;
		fetalHeartRate: number | null;
		fetalPresentation: string;
		edema: boolean;
		contractions: boolean;
		bleeding: boolean;
		fluidLoss: boolean;
		notes: string;
	};

	type CervicalDilationRecord = {
		dateTime: string;
		dilationCm: number | null;
		notes: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		pregnancyNumber: null as number | null,
		lastMenstrualPeriod: '',
		expectedDeliveryDate: '',
		gestationalAgeWeeks: null as number | null,
		gestationalAgeDays: null as number | null,

		pregnancyType: '',
		fetusCount: 1,
		pregnancyOrigin: '',

		obstetricRiskLevel: '',
		riskHypertension: false,
		riskDiabetes: false,
		riskMaternalAge: false,
		riskHistory: false,
		otherRiskFactors: '',

		admissionDateTime: '',
		admissionReason: '',

		laborStartDateTime: '',

		membraneStatus: '',
		membraneRuptureDateTime: '',

		deliveryMode: '',
		cesareanType: '',
		cesareanIndication: '',

		analgesiaAnesthesiaType: '',

		maternalComplications: '',
		obstetricComplications: '',

		birthDateTime: '',

		newbornSex: '',
		newbornWeightKg: null as number | null,
		newbornHeightCm: null as number | null,
		newbornHeadCircumferenceCm: null as number | null,

		apgarScore1Minute: null as number | null,
		apgarScore5Minutes: null as number | null,
		apgarScore10Minutes: null as number | null,

		neonatalResuscitationRequired: false,
		neonatalResuscitationProcedures: '',

		postpartumGeneralCondition: '',
		postpartumBleeding: '',
		postpartumBloodPressureSystolic: null as number | null,
		postpartumBloodPressureDiastolic: null as number | null,
		postpartumTemperature: null as number | null,
		postpartumPainScore: null as number | null,

		scarCondition: '',
		scarFollowUp: '',

		breastfeedingType: '',
		breastfeedingDifficulties: '',

		postpartumComplications: '',
		postpartumComplicationsManagement: ''
	});

	let prenatalVisits = $state<PrenatalVisit[]>([]);
	let cervicalDilationHistory = $state<CervicalDilationRecord[]>([]);

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

	function calculateExpectedDeliveryDate(lastMenstrualPeriod: string): string {
		if (!lastMenstrualPeriod) {
			return '';
		}

		const date = new SvelteDate(`${lastMenstrualPeriod}T00:00:00`);

		if (Number.isNaN(date.getTime())) {
			return '';
		}

		date.setDate(date.getDate() + 280);

		return date.toISOString().slice(0, 10);
	}

	function calculateGestationalAge(lastMenstrualPeriod: string): {
		weeks: number | null;
		days: number | null;
	} {
		if (!lastMenstrualPeriod) {
			return {
				weeks: null,
				days: null
			};
		}

		const lmp = new SvelteDate(`${lastMenstrualPeriod}T00:00:00`);

		const today = new SvelteDate();

		if (Number.isNaN(lmp.getTime()) || lmp.getTime() > today.getTime()) {
			return {
				weeks: null,
				days: null
			};
		}

		const millisecondsPerDay = 86_400_000;

		const totalDays = Math.floor((today.getTime() - lmp.getTime()) / millisecondsPerDay);

		return {
			weeks: Math.floor(totalDays / 7),
			days: totalDays % 7
		};
	}

	$effect(() => {
		if (initialized) {
			return;
		}

		form.pregnancyNumber = toNullableNumber(data.pregnancyNumber);
		form.lastMenstrualPeriod = String(data.lastMenstrualPeriod ?? '');
		form.expectedDeliveryDate = String(data.expectedDeliveryDate ?? '');
		form.gestationalAgeWeeks = toNullableNumber(data.gestationalAgeWeeks);
		form.gestationalAgeDays = toNullableNumber(data.gestationalAgeDays);

		form.pregnancyType = String(data.pregnancyType ?? '');
		form.fetusCount = Number(data.fetusCount ?? 1);
		form.pregnancyOrigin = String(data.pregnancyOrigin ?? '');

		form.obstetricRiskLevel = String(data.obstetricRiskLevel ?? '');
		form.riskHypertension = Boolean(data.riskHypertension ?? false);
		form.riskDiabetes = Boolean(data.riskDiabetes ?? false);
		form.riskMaternalAge = Boolean(data.riskMaternalAge ?? false);
		form.riskHistory = Boolean(data.riskHistory ?? false);
		form.otherRiskFactors = String(data.otherRiskFactors ?? '');

		form.admissionDateTime = String(data.admissionDateTime ?? '');
		form.admissionReason = String(data.admissionReason ?? '');
		form.laborStartDateTime = String(data.laborStartDateTime ?? '');

		form.membraneStatus = String(data.membraneStatus ?? '');
		form.membraneRuptureDateTime = String(data.membraneRuptureDateTime ?? '');

		form.deliveryMode = String(data.deliveryMode ?? '');
		form.cesareanType = String(data.cesareanType ?? '');
		form.cesareanIndication = String(data.cesareanIndication ?? '');

		form.analgesiaAnesthesiaType = String(data.analgesiaAnesthesiaType ?? '');

		form.maternalComplications = String(data.maternalComplications ?? '');

		form.obstetricComplications = String(data.obstetricComplications ?? '');

		form.birthDateTime = String(data.birthDateTime ?? '');

		form.newbornSex = String(data.newbornSex ?? '');
		form.newbornWeightKg = toNullableNumber(data.newbornWeightKg);
		form.newbornHeightCm = toNullableNumber(data.newbornHeightCm);

		form.newbornHeadCircumferenceCm = toNullableNumber(data.newbornHeadCircumferenceCm);

		form.apgarScore1Minute = toNullableNumber(data.apgarScore1Minute);
		form.apgarScore5Minutes = toNullableNumber(data.apgarScore5Minutes);
		form.apgarScore10Minutes = toNullableNumber(data.apgarScore10Minutes);

		form.neonatalResuscitationRequired = Boolean(data.neonatalResuscitationRequired ?? false);

		form.neonatalResuscitationProcedures = String(data.neonatalResuscitationProcedures ?? '');

		form.postpartumGeneralCondition = String(data.postpartumGeneralCondition ?? '');

		form.postpartumBleeding = String(data.postpartumBleeding ?? '');

		form.postpartumBloodPressureSystolic = toNullableNumber(data.postpartumBloodPressureSystolic);

		form.postpartumBloodPressureDiastolic = toNullableNumber(data.postpartumBloodPressureDiastolic);

		form.postpartumTemperature = toNullableNumber(data.postpartumTemperature);

		form.postpartumPainScore = toNullableNumber(data.postpartumPainScore);

		form.scarCondition = String(data.scarCondition ?? '');
		form.scarFollowUp = String(data.scarFollowUp ?? '');

		form.breastfeedingType = String(data.breastfeedingType ?? '');

		form.breastfeedingDifficulties = String(data.breastfeedingDifficulties ?? '');

		form.postpartumComplications = String(data.postpartumComplications ?? '');

		form.postpartumComplicationsManagement = String(data.postpartumComplicationsManagement ?? '');

		prenatalVisits = toArray<PrenatalVisit>(data.prenatalVisits);

		cervicalDilationHistory = toArray<CervicalDilationRecord>(data.cervicalDilationHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		const expectedDeliveryDate = calculateExpectedDeliveryDate(form.lastMenstrualPeriod);

		const gestationalAge = calculateGestationalAge(form.lastMenstrualPeriod);

		if (form.expectedDeliveryDate !== expectedDeliveryDate) {
			form.expectedDeliveryDate = expectedDeliveryDate;
		}

		if (form.gestationalAgeWeeks !== gestationalAge.weeks) {
			form.gestationalAgeWeeks = gestationalAge.weeks;
		}

		if (form.gestationalAgeDays !== gestationalAge.days) {
			form.gestationalAgeDays = gestationalAge.days;
		}
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			prenatalVisits,
			cervicalDilationHistory
		});
	});

	function addPrenatalVisit() {
		prenatalVisits = [
			...prenatalVisits,
			{
				date: '',
				weightKg: null,
				bloodPressureSystolic: null,
				bloodPressureDiastolic: null,
				temperature: null,
				uterineHeightCm: null,
				fetalMovements: '',
				fetalHeartRate: null,
				fetalPresentation: '',
				edema: false,
				contractions: false,
				bleeding: false,
				fluidLoss: false,
				notes: ''
			}
		];
	}

	function removePrenatalVisit(index: number) {
		prenatalVisits = prenatalVisits.filter((_, itemIndex) => itemIndex !== index);
	}

	function addCervicalDilationRecord() {
		cervicalDilationHistory = [
			...cervicalDilationHistory,
			{
				dateTime: '',
				dilationCm: null,
				notes: ''
			}
		];
	}

	function removeCervicalDilationRecord(index: number) {
		cervicalDilationHistory = cervicalDilationHistory.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Grossesse actuelle
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Informations générales et niveau de risque
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="pregnancy-number" class="mb-2 block text-sm font-bold text-slate-700">
					Numéro de grossesse
				</label>

				<input
					id="pregnancy-number"
					type="number"
					min="1"
					bind:value={form.pregnancyNumber}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="maternity-lmp" class="mb-2 block text-sm font-bold text-slate-700">
					Date des dernières règles
				</label>

				<input
					id="maternity-lmp"
					type="date"
					bind:value={form.lastMenstrualPeriod}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="expected-delivery" class="mb-2 block text-sm font-bold text-slate-700">
					Date prévue d’accouchement
				</label>

				<input
					id="expected-delivery"
					type="date"
					value={form.expectedDeliveryDate}
					readonly
					class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
				/>
			</div>

			<div>
				<label for="gestational-age" class="mb-2 block text-sm font-bold text-slate-700">
					Âge gestationnel
				</label>

				<input
					id="gestational-age"
					type="text"
					value={form.gestationalAgeWeeks !== null
						? `${form.gestationalAgeWeeks} SA + ${form.gestationalAgeDays ?? 0} j`
						: ''}
					readonly
					class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
				/>
			</div>

			<div>
				<label for="pregnancy-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de grossesse
				</label>

				<select
					id="pregnancy-type"
					bind:value={form.pregnancyType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="SINGLE">Simple</option>
					<option value="MULTIPLE">Multiple</option>
				</select>
			</div>

			<div>
				<label for="fetus-count" class="mb-2 block text-sm font-bold text-slate-700">
					Nombre de fœtus
				</label>

				<input
					id="fetus-count"
					type="number"
					min="1"
					bind:value={form.fetusCount}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="pregnancy-origin" class="mb-2 block text-sm font-bold text-slate-700">
					Origine de la grossesse
				</label>

				<select
					id="pregnancy-origin"
					bind:value={form.pregnancyOrigin}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NATURAL">Naturelle</option>
					<option value="MEDICALLY_ASSISTED"> Assistance médicale </option>
				</select>
			</div>

			<div>
				<label for="risk-level" class="mb-2 block text-sm font-bold text-slate-700">
					Risque obstétrical
				</label>

				<select
					id="risk-level"
					bind:value={form.obstetricRiskLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NORMAL">Grossesse normale</option>
					<option value="HIGH_RISK">Grossesse à risque</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<p class="font-black text-slate-900">Motifs de risque</p>

			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
					<input type="checkbox" bind:checked={form.riskHypertension} />
					<span class="text-sm font-bold text-slate-700"> Hypertension </span>
				</label>

				<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
					<input type="checkbox" bind:checked={form.riskDiabetes} />
					<span class="text-sm font-bold text-slate-700"> Diabète </span>
				</label>

				<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
					<input type="checkbox" bind:checked={form.riskMaternalAge} />
					<span class="text-sm font-bold text-slate-700"> Âge maternel </span>
				</label>

				<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
					<input type="checkbox" bind:checked={form.riskHistory} />
					<span class="text-sm font-bold text-slate-700"> Antécédents </span>
				</label>
			</div>

			<textarea
				bind:value={form.otherRiskFactors}
				rows="3"
				placeholder="Autres facteurs de risque"
				class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
			></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Suivi prénatal</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">
					Consultations et surveillance materno-fœtale
				</h4>
			</div>

			<button
				type="button"
				onclick={addPrenatalVisit}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une consultation
			</button>
		</div>

		<div class="space-y-4">
			{#each prenatalVisits as visit, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Consultation prénatale #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removePrenatalVisit(index)}
							aria-label={`Supprimer la consultation prénatale ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<input
							type="date"
							bind:value={visit.date}
							aria-label={`Date de la consultation prénatale ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={visit.weightKg}
							placeholder="Poids (kg)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={visit.bloodPressureSystolic}
							placeholder="TA systolique"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={visit.bloodPressureDiastolic}
							placeholder="TA diastolique"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={visit.temperature}
							placeholder="Température"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={visit.uterineHeightCm}
							placeholder="Hauteur utérine (cm)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<select
							bind:value={visit.fetalMovements}
							aria-label={`Mouvements fœtaux de la consultation ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Mouvements fœtaux</option>
							<option value="PRESENT">Présents</option>
							<option value="REDUCED">Diminués</option>
							<option value="ABSENT">Absents</option>
						</select>

						<input
							type="number"
							bind:value={visit.fetalHeartRate}
							placeholder="RCF (bpm)"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<select
							bind:value={visit.fetalPresentation}
							aria-label={`Présentation fœtale de la consultation ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Présentation fœtale</option>
							<option value="CEPHALIC">Céphalique</option>
							<option value="BREECH">Siège</option>
							<option value="TRANSVERSE">Transverse</option>
						</select>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
							<input type="checkbox" bind:checked={visit.edema} />
							<span class="text-sm font-bold text-slate-700"> Œdèmes </span>
						</label>

						<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
							<input type="checkbox" bind:checked={visit.contractions} />
							<span class="text-sm font-bold text-slate-700"> Contractions </span>
						</label>

						<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
							<input type="checkbox" bind:checked={visit.bleeding} />
							<span class="text-sm font-bold text-slate-700"> Saignements </span>
						</label>

						<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
							<input type="checkbox" bind:checked={visit.fluidLoss} />
							<span class="text-sm font-bold text-slate-700"> Pertes de liquide </span>
						</label>
					</div>

					<textarea
						bind:value={visit.notes}
						rows="3"
						placeholder="Observations"
						class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					></textarea>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Travail et accouchement
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Admission, évolution du travail et naissance
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="admission-datetime" class="mb-2 block text-sm font-bold text-slate-700">
					Admission pour accouchement
				</label>

				<input
					id="admission-datetime"
					type="datetime-local"
					bind:value={form.admissionDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="admission-reason" class="mb-2 block text-sm font-bold text-slate-700">
					Motif d’admission
				</label>

				<input
					id="admission-reason"
					type="text"
					bind:value={form.admissionReason}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="labor-start" class="mb-2 block text-sm font-bold text-slate-700">
					Début du travail
				</label>

				<input
					id="labor-start"
					type="datetime-local"
					bind:value={form.laborStartDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="membrane-status" class="mb-2 block text-sm font-bold text-slate-700">
					Poche des eaux
				</label>

				<select
					id="membrane-status"
					bind:value={form.membraneStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="INTACT">Intacte</option>
					<option value="RUPTURED">Rompue</option>
				</select>
			</div>

			<div>
				<label for="membrane-rupture" class="mb-2 block text-sm font-bold text-slate-700">
					Date et heure de rupture
				</label>

				<input
					id="membrane-rupture"
					type="datetime-local"
					bind:value={form.membraneRuptureDateTime}
					disabled={form.membraneStatus !== 'RUPTURED'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Évolution de la dilatation</p>

					<p class="mt-1 text-sm text-slate-500">Surveillance chronologique du travail.</p>
				</div>

				<button
					type="button"
					onclick={addCervicalDilationRecord}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter une mesure
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each cervicalDilationHistory as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_180px_1fr_48px]"
					>
						<input
							type="datetime-local"
							bind:value={item.dateTime}
							aria-label={`Date de dilatation ${index + 1}`}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							max="10"
							step="0.5"
							bind:value={item.dilationCm}
							placeholder="Dilatation (cm)"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.notes}
							placeholder="Observations"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removeCervicalDilationRecord(index)}
							aria-label={`Supprimer la mesure de dilatation ${index + 1}`}
							class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="delivery-mode" class="mb-2 block text-sm font-bold text-slate-700">
					Mode d’accouchement
				</label>

				<select
					id="delivery-mode"
					bind:value={form.deliveryMode}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="VAGINAL">Voie basse</option>
					<option value="INSTRUMENTAL">Instrumental</option>
					<option value="CESAREAN">Césarienne</option>
				</select>
			</div>

			<div>
				<label for="cesarean-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de césarienne
				</label>

				<select
					id="cesarean-type"
					bind:value={form.cesareanType}
					disabled={form.deliveryMode !== 'CESAREAN'}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				>
					<option value="">Sélectionner</option>
					<option value="PLANNED">Programmée</option>
					<option value="EMERGENCY">Urgente</option>
				</select>
			</div>

			<div class="md:col-span-2">
				<label for="cesarean-indication" class="mb-2 block text-sm font-bold text-slate-700">
					Indication de la césarienne
				</label>

				<input
					id="cesarean-indication"
					type="text"
					bind:value={form.cesareanIndication}
					disabled={form.deliveryMode !== 'CESAREAN'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div>
				<label for="anesthesia-type" class="mb-2 block text-sm font-bold text-slate-700">
					Analgésie / anesthésie
				</label>

				<input
					id="anesthesia-type"
					type="text"
					bind:value={form.analgesiaAnesthesiaType}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.maternalComplications}
				rows="4"
				placeholder="Complications maternelles"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.obstetricComplications}
				rows="4"
				placeholder="Complications obstétricales"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Naissance et nouveau-né
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Données de naissance</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="birth-datetime" class="mb-2 block text-sm font-bold text-slate-700">
					Date et heure de naissance
				</label>

				<input
					id="birth-datetime"
					type="datetime-local"
					bind:value={form.birthDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="newborn-sex" class="mb-2 block text-sm font-bold text-slate-700"> Sexe </label>

				<select
					id="newborn-sex"
					bind:value={form.newbornSex}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="F">Féminin</option>
					<option value="M">Masculin</option>
					<option value="UNDETERMINED">Indéterminé</option>
				</select>
			</div>

			<div>
				<label for="newborn-weight" class="mb-2 block text-sm font-bold text-slate-700">
					Poids
				</label>

				<input
					id="newborn-weight"
					type="number"
					min="0"
					step="0.01"
					bind:value={form.newbornWeightKg}
					placeholder="kg"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="newborn-height" class="mb-2 block text-sm font-bold text-slate-700">
					Taille
				</label>

				<input
					id="newborn-height"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.newbornHeightCm}
					placeholder="cm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="newborn-head" class="mb-2 block text-sm font-bold text-slate-700">
					Périmètre crânien
				</label>

				<input
					id="newborn-head"
					type="number"
					min="0"
					step="0.1"
					bind:value={form.newbornHeadCircumferenceCm}
					placeholder="cm"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="maternity-apgar-1" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 1 minute
				</label>

				<input
					id="maternity-apgar-1"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore1Minute}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="maternity-apgar-5" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 5 minutes
				</label>

				<input
					id="maternity-apgar-5"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore5Minutes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="maternity-apgar-10" class="mb-2 block text-sm font-bold text-slate-700">
					Apgar à 10 minutes
				</label>

				<input
					id="maternity-apgar-10"
					type="number"
					min="0"
					max="10"
					bind:value={form.apgarScore10Minutes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<label class="flex items-center gap-3">
				<input type="checkbox" bind:checked={form.neonatalResuscitationRequired} />

				<span class="text-sm font-black text-slate-800"> Réanimation néonatale nécessaire </span>
			</label>

			<textarea
				bind:value={form.neonatalResuscitationProcedures}
				disabled={!form.neonatalResuscitationRequired}
				rows="3"
				placeholder="Actes réalisés"
				class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
			></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Post-partum</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Surveillance maternelle après l’accouchement
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div class="md:col-span-2">
				<label for="postpartum-condition" class="mb-2 block text-sm font-bold text-slate-700">
					État général
				</label>

				<input
					id="postpartum-condition"
					type="text"
					bind:value={form.postpartumGeneralCondition}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="postpartum-bleeding" class="mb-2 block text-sm font-bold text-slate-700">
					Saignements
				</label>

				<input
					id="postpartum-bleeding"
					type="text"
					bind:value={form.postpartumBleeding}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="postpartum-temperature" class="mb-2 block text-sm font-bold text-slate-700">
					Température
				</label>

				<input
					id="postpartum-temperature"
					type="number"
					step="0.1"
					bind:value={form.postpartumTemperature}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<input
				type="number"
				bind:value={form.postpartumBloodPressureSystolic}
				placeholder="TA systolique"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				bind:value={form.postpartumBloodPressureDiastolic}
				placeholder="TA diastolique"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				max="10"
				bind:value={form.postpartumPainScore}
				placeholder="Douleur /10"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.scarCondition}
				rows="3"
				placeholder="État de la cicatrice"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.scarFollowUp}
				rows="3"
				placeholder="Suivi de la cicatrice"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="breastfeeding-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type d’allaitement
				</label>

				<select
					id="breastfeeding-type"
					bind:value={form.breastfeedingType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="BREASTFEEDING">Maternel</option>
					<option value="FORMULA">Artificiel</option>
					<option value="MIXED">Mixte</option>
				</select>
			</div>

			<div>
				<label for="breastfeeding-difficulties" class="mb-2 block text-sm font-bold text-slate-700">
					Difficultés d’allaitement
				</label>

				<input
					id="breastfeeding-difficulties"
					type="text"
					bind:value={form.breastfeedingDifficulties}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.postpartumComplications}
				rows="4"
				placeholder="Complications post-partum"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.postpartumComplicationsManagement}
				rows="4"
				placeholder="Prise en charge"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>
</div>
