<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type RequestedExam = {
		name: string;
		code: string;
	};

	type LaboratoryResult = {
		analysisName: string;
		value: number | null;
		textValue: string;
		unit: string;
		minReference: number | null;
		maxReference: number | null;
		criticalMin: number | null;
		criticalMax: number | null;
		status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' | 'UNDEFINED';
		technician: string;
		notes: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		prescribingDoctor: '',
		requestingDepartment: '',
		originConsultationReference: '',

		clinicalIndication: '',
		urgencyLevel: '',

		sampleType: '',
		otherSampleType: '',

		collectionDate: '',
		collectionTime: '',
		collector: '',
		sampleNumber: '',

		fastingRequired: false,
		collectionConditions: '',

		biologistComment: '',
		validatingBiologist: '',
		validationDateTime: '',

		resultPdfReference: ''
	});

	let requestedExams = $state<RequestedExam[]>([]);
	let results = $state<LaboratoryResult[]>([]);

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

	function calculateStatus(item: LaboratoryResult): LaboratoryResult['status'] {
		if (item.value === null) {
			return 'UNDEFINED';
		}

		if (item.criticalMin !== null && item.value < item.criticalMin) {
			return 'CRITICAL';
		}

		if (item.criticalMax !== null && item.value > item.criticalMax) {
			return 'CRITICAL';
		}

		if (item.minReference !== null && item.value < item.minReference) {
			return 'LOW';
		}

		if (item.maxReference !== null && item.value > item.maxReference) {
			return 'HIGH';
		}

		if (item.minReference !== null || item.maxReference !== null) {
			return 'NORMAL';
		}

		return 'UNDEFINED';
	}

	function statusLabel(status: LaboratoryResult['status']): string {
		switch (status) {
			case 'NORMAL':
				return 'Normal';
			case 'LOW':
				return 'Bas';
			case 'HIGH':
				return 'Élevé';
			case 'CRITICAL':
				return 'Critique';
			default:
				return 'Non déterminé';
		}
	}

	function statusClasses(status: LaboratoryResult['status']): string {
		switch (status) {
			case 'NORMAL':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
			case 'LOW':
				return 'border-blue-200 bg-blue-50 text-blue-700';
			case 'HIGH':
				return 'border-amber-200 bg-amber-50 text-amber-700';
			case 'CRITICAL':
				return 'border-red-200 bg-red-50 text-red-700';
			default:
				return 'border-slate-200 bg-slate-50 text-slate-500';
		}
	}

	function refreshResultStatus(item: LaboratoryResult) {
		item.status = calculateStatus(item);
	}

	$effect(() => {
		if (initialized) {
			return;
		}

		form.prescribingDoctor = String(data.prescribingDoctor ?? '');

		form.requestingDepartment = String(data.requestingDepartment ?? '');

		form.originConsultationReference = String(data.originConsultationReference ?? '');

		form.clinicalIndication = String(data.clinicalIndication ?? '');

		form.urgencyLevel = String(data.urgencyLevel ?? '');

		form.sampleType = String(data.sampleType ?? '');

		form.otherSampleType = String(data.otherSampleType ?? '');

		form.collectionDate = String(data.collectionDate ?? '');

		form.collectionTime = String(data.collectionTime ?? '');

		form.collector = String(data.collector ?? '');

		form.sampleNumber = String(data.sampleNumber ?? '');

		form.fastingRequired = Boolean(data.fastingRequired ?? false);

		form.collectionConditions = String(data.collectionConditions ?? '');

		form.biologistComment = String(data.biologistComment ?? '');

		form.validatingBiologist = String(data.validatingBiologist ?? '');

		form.validationDateTime = String(data.validationDateTime ?? '');

		form.resultPdfReference = String(data.resultPdfReference ?? '');

		requestedExams = toArray<RequestedExam>(data.requestedExams).map((item) => ({
			name: String(item.name ?? ''),
			code: String(item.code ?? '')
		}));

		results = toArray<LaboratoryResult>(data.results).map((item) => {
			const result: LaboratoryResult = {
				analysisName: String(item.analysisName ?? ''),
				value: toNullableNumber(item.value),
				textValue: String(item.textValue ?? ''),
				unit: String(item.unit ?? ''),
				minReference: toNullableNumber(item.minReference),
				maxReference: toNullableNumber(item.maxReference),
				criticalMin: toNullableNumber(item.criticalMin),
				criticalMax: toNullableNumber(item.criticalMax),
				status: 'UNDEFINED',
				technician: String(item.technician ?? ''),
				notes: String(item.notes ?? '')
			};

			result.status = calculateStatus(result);

			return result;
		});

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			requestedExams,
			results
		});
	});

	function addRequestedExam() {
		requestedExams = [
			...requestedExams,
			{
				name: '',
				code: ''
			}
		];
	}

	function removeRequestedExam(index: number) {
		requestedExams = requestedExams.filter((_, itemIndex) => itemIndex !== index);
	}

	function addResult() {
		results = [
			...results,
			{
				analysisName: '',
				value: null,
				textValue: '',
				unit: '',
				minReference: null,
				maxReference: null,
				criticalMin: null,
				criticalMax: null,
				status: 'UNDEFINED',
				technician: '',
				notes: ''
			}
		];
	}

	function removeResult(index: number) {
		results = results.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Demande de laboratoire
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Prescripteur et contexte clinique</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="lab-prescriber" class="mb-2 block text-sm font-bold text-slate-700">
					Médecin prescripteur
				</label>

				<input
					id="lab-prescriber"
					type="text"
					bind:value={form.prescribingDoctor}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="lab-department" class="mb-2 block text-sm font-bold text-slate-700">
					Département demandeur
				</label>

				<input
					id="lab-department"
					type="text"
					bind:value={form.requestingDepartment}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="lab-consultation-reference" class="mb-2 block text-sm font-bold text-slate-700">
					Consultation d’origine
				</label>

				<input
					id="lab-consultation-reference"
					type="text"
					bind:value={form.originConsultationReference}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="lab-indication" class="mb-2 block text-sm font-bold text-slate-700">
					Indication clinique
				</label>

				<textarea
					id="lab-indication"
					bind:value={form.clinicalIndication}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div>
				<label for="lab-urgency" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’urgence
				</label>

				<select
					id="lab-urgency"
					bind:value={form.urgencyLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NORMAL">Normal</option>
					<option value="URGENT">Urgent</option>
					<option value="CRITICAL">Critique</option>
				</select>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Examens demandés
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Sélection des analyses à réaliser</h4>
			</div>

			<button
				type="button"
				onclick={addRequestedExam}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un examen
			</button>
		</div>

		<div class="space-y-3">
			{#each requestedExams as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr_48px]"
				>
					<input
						type="text"
						bind:value={item.code}
						placeholder="Code"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.name}
						placeholder="Nom de l’examen"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeRequestedExam(index)}
						aria-label={`Supprimer l’examen ${index + 1}`}
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
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Prélèvement</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Échantillon et conditions de collecte</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="sample-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type d’échantillon
				</label>

				<select
					id="sample-type"
					bind:value={form.sampleType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="BLOOD">Sang</option>
					<option value="URINE">Urine</option>
					<option value="STOOL">Selles</option>
					<option value="SWAB">Prélèvement</option>
					<option value="OTHER">Autre</option>
				</select>
			</div>

			<div>
				<label for="other-sample-type" class="mb-2 block text-sm font-bold text-slate-700">
					Autre type
				</label>

				<input
					id="other-sample-type"
					type="text"
					bind:value={form.otherSampleType}
					disabled={form.sampleType !== 'OTHER'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div>
				<label for="collection-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du prélèvement
				</label>

				<input
					id="collection-date"
					type="date"
					bind:value={form.collectionDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="collection-time" class="mb-2 block text-sm font-bold text-slate-700">
					Heure du prélèvement
				</label>

				<input
					id="collection-time"
					type="time"
					bind:value={form.collectionTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="collector" class="mb-2 block text-sm font-bold text-slate-700">
					Préleveur
				</label>

				<input
					id="collector"
					type="text"
					bind:value={form.collector}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="sample-number" class="mb-2 block text-sm font-bold text-slate-700">
					Numéro d’échantillon
				</label>

				<input
					id="sample-number"
					type="text"
					bind:value={form.sampleNumber}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.fastingRequired} />

				<span class="text-sm font-bold text-slate-700"> Prélèvement à jeun </span>
			</label>

			<div>
				<label for="collection-conditions" class="mb-2 block text-sm font-bold text-slate-700">
					Conditions particulières
				</label>

				<input
					id="collection-conditions"
					type="text"
					bind:value={form.collectionConditions}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Résultats analytiques
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Valeurs et intervalles de référence</h4>
			</div>

			<button
				type="button"
				onclick={addResult}
				class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white"
			>
				<Plus size={16} />
				Ajouter un résultat
			</button>
		</div>

		<div class="space-y-4">
			{#each results as item, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="font-black text-slate-900">
								Analyse #{index + 1}
							</p>

							<span
								class={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClasses(item.status)}`}
							>
								{statusLabel(item.status)}
							</span>
						</div>

						<button
							type="button"
							onclick={() => removeResult(index)}
							aria-label={`Supprimer le résultat ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div class="xl:col-span-2">
							<label
								for={`analysis-name-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Nom de l’analyse
							</label>

							<input
								id={`analysis-name-${index}`}
								type="text"
								bind:value={item.analysisName}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`analysis-value-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Valeur numérique
							</label>

							<input
								id={`analysis-value-${index}`}
								type="number"
								step="0.001"
								bind:value={item.value}
								oninput={() => refreshResultStatus(item)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`analysis-unit-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Unité
							</label>

							<input
								id={`analysis-unit-${index}`}
								type="text"
								bind:value={item.unit}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`min-reference-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Valeur minimale
							</label>

							<input
								id={`min-reference-${index}`}
								type="number"
								step="0.001"
								bind:value={item.minReference}
								oninput={() => refreshResultStatus(item)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`max-reference-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Valeur maximale
							</label>

							<input
								id={`max-reference-${index}`}
								type="number"
								step="0.001"
								bind:value={item.maxReference}
								oninput={() => refreshResultStatus(item)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`critical-min-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Seuil critique bas
							</label>

							<input
								id={`critical-min-${index}`}
								type="number"
								step="0.001"
								bind:value={item.criticalMin}
								oninput={() => refreshResultStatus(item)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`critical-max-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Seuil critique haut
							</label>

							<input
								id={`critical-max-${index}`}
								type="number"
								step="0.001"
								bind:value={item.criticalMax}
								oninput={() => refreshResultStatus(item)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div class="md:col-span-2 xl:col-span-4">
							<label
								for={`text-value-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Résultat textuel
							</label>

							<input
								id={`text-value-${index}`}
								type="text"
								bind:value={item.textValue}
								placeholder="Positif, négatif, aspect, culture..."
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`technician-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Technicien
							</label>

							<input
								id={`technician-${index}`}
								type="text"
								bind:value={item.technician}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div class="md:col-span-2 xl:col-span-3">
							<label
								for={`result-notes-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Observations
							</label>

							<input
								id={`result-notes-${index}`}
								type="text"
								bind:value={item.notes}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Validation biologique
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Interprétation et validation finale</h4>
		</div>

		<div>
			<label for="biologist-comment" class="mb-2 block text-sm font-bold text-slate-700">
				Commentaire du biologiste
			</label>

			<textarea
				id="biologist-comment"
				bind:value={form.biologistComment}
				rows="5"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="validating-biologist" class="mb-2 block text-sm font-bold text-slate-700">
					Biologiste validateur
				</label>

				<input
					id="validating-biologist"
					type="text"
					bind:value={form.validatingBiologist}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="validation-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date et heure de validation
				</label>

				<input
					id="validation-date"
					type="datetime-local"
					bind:value={form.validationDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div>
			<label for="laboratory-pdf" class="mb-2 block text-sm font-bold text-slate-700">
				Résultat PDF
			</label>

			<input
				id="laboratory-pdf"
				type="text"
				bind:value={form.resultPdfReference}
				placeholder="URL ou référence du compte rendu"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>
	</section>
</div>
