<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type UltrasoundMeasurement = {
		label: string;
		value: number | null;
		unit: string;
		notes: string;
	};

	type UltrasoundImage = {
		dateTime: string;
		imageReference: string;
		description: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		prescribingDoctor: '',
		requestingDepartment: '',
		originConsultationReference: '',

		reason: '',
		clinicalIndication: '',
		urgencyLevel: '',

		ultrasoundType: '',
		otherUltrasoundType: '',

		examDateTime: '',
		sonographer: '',

		observations: '',
		abnormalities: '',
		conclusion: '',
		recommendations: '',

		reportPdfReference: ''
	});

	let measurements = $state<UltrasoundMeasurement[]>([]);
	let images = $state<UltrasoundImage[]>([]);

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

		form.prescribingDoctor = String(data.prescribingDoctor ?? '');
		form.requestingDepartment = String(data.requestingDepartment ?? '');
		form.originConsultationReference = String(data.originConsultationReference ?? '');

		form.reason = String(data.reason ?? '');
		form.clinicalIndication = String(data.clinicalIndication ?? '');
		form.urgencyLevel = String(data.urgencyLevel ?? '');

		form.ultrasoundType = String(data.ultrasoundType ?? '');
		form.otherUltrasoundType = String(data.otherUltrasoundType ?? '');

		form.examDateTime = String(data.examDateTime ?? '');
		form.sonographer = String(data.sonographer ?? '');

		form.observations = String(data.observations ?? '');
		form.abnormalities = String(data.abnormalities ?? '');
		form.conclusion = String(data.conclusion ?? '');
		form.recommendations = String(data.recommendations ?? '');

		form.reportPdfReference = String(data.reportPdfReference ?? '');

		measurements = toArray<UltrasoundMeasurement>(data.measurements).map((item) => ({
			label: String(item.label ?? ''),
			value: toNullableNumber(item.value),
			unit: String(item.unit ?? ''),
			notes: String(item.notes ?? '')
		}));

		images = toArray<UltrasoundImage>(data.images);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			measurements,
			images
		});
	});

	function addMeasurement() {
		measurements = [
			...measurements,
			{
				label: '',
				value: null,
				unit: '',
				notes: ''
			}
		];
	}

	function removeMeasurement(index: number) {
		measurements = measurements.filter((_, itemIndex) => itemIndex !== index);
	}

	function addImage() {
		images = [
			...images,
			{
				dateTime: '',
				imageReference: '',
				description: ''
			}
		];
	}

	function removeImage(index: number) {
		images = images.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Demande d’échographie
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Prescription et contexte clinique</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="ultrasound-prescriber" class="mb-2 block text-sm font-bold text-slate-700">
					Médecin prescripteur
				</label>

				<input
					id="ultrasound-prescriber"
					type="text"
					bind:value={form.prescribingDoctor}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="ultrasound-department" class="mb-2 block text-sm font-bold text-slate-700">
					Département demandeur
				</label>

				<input
					id="ultrasound-department"
					type="text"
					bind:value={form.requestingDepartment}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label
					for="ultrasound-consultation-reference"
					class="mb-2 block text-sm font-bold text-slate-700"
				>
					Consultation d’origine
				</label>

				<input
					id="ultrasound-consultation-reference"
					type="text"
					bind:value={form.originConsultationReference}
					placeholder="Référence de consultation"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="ultrasound-reason" class="mb-2 block text-sm font-bold text-slate-700">
					Motif
				</label>

				<input
					id="ultrasound-reason"
					type="text"
					bind:value={form.reason}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="ultrasound-indication" class="mb-2 block text-sm font-bold text-slate-700">
					Indication clinique
				</label>

				<textarea
					id="ultrasound-indication"
					bind:value={form.clinicalIndication}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div>
				<label for="ultrasound-urgency" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’urgence
				</label>

				<select
					id="ultrasound-urgency"
					bind:value={form.urgencyLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NORMAL">Normal</option>
					<option value="URGENT">Urgent</option>
					<option value="CRITICAL">Critique</option>
				</select>
			</div>

			<div>
				<label for="ultrasound-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type d’échographie
				</label>

				<select
					id="ultrasound-type"
					bind:value={form.ultrasoundType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="ABDOMINAL">Abdominale</option>
					<option value="PELVIC">Pelvienne</option>
					<option value="OBSTETRIC">Obstétricale</option>
					<option value="BREAST">Mammaire</option>
					<option value="THYROID">Thyroïdienne</option>
					<option value="CARDIAC">Cardiaque</option>
					<option value="RENAL">Rénale</option>
					<option value="OTHER">Autre</option>
				</select>
			</div>

			<div>
				<label for="other-ultrasound-type" class="mb-2 block text-sm font-bold text-slate-700">
					Autre type
				</label>

				<input
					id="other-ultrasound-type"
					type="text"
					bind:value={form.otherUltrasoundType}
					disabled={form.ultrasoundType !== 'OTHER'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Réalisation de l’examen
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Date, professionnel et observations</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="ultrasound-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date et heure de l’examen
				</label>

				<input
					id="ultrasound-date"
					type="datetime-local"
					bind:value={form.examDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="sonographer" class="mb-2 block text-sm font-bold text-slate-700">
					Échographiste
				</label>

				<input
					id="sonographer"
					type="text"
					bind:value={form.sonographer}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div>
			<label for="ultrasound-observations" class="mb-2 block text-sm font-bold text-slate-700">
				Observations
			</label>

			<textarea
				id="ultrasound-observations"
				bind:value={form.observations}
				rows="6"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Mesures</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Valeurs mesurées pendant l’examen</h4>
			</div>

			<button
				type="button"
				onclick={addMeasurement}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une mesure
			</button>
		</div>

		<div class="space-y-3">
			{#each measurements as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_180px_160px_1.5fr_48px]"
				>
					<input
						type="text"
						bind:value={item.label}
						placeholder="Mesure"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="number"
						step="0.01"
						bind:value={item.value}
						placeholder="Valeur"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.unit}
						placeholder="Unité"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.notes}
						placeholder="Observations"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeMeasurement(index)}
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
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Résultats</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Anomalies, conclusion et recommandations
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.abnormalities}
				rows="5"
				placeholder="Anomalies détectées"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.conclusion}
				rows="5"
				placeholder="Conclusion médicale"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.recommendations}
				rows="4"
				placeholder="Recommandations et examens complémentaires"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Images échographiques
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Images et documents associés</h4>
			</div>

			<button
				type="button"
				onclick={addImage}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une image
			</button>
		</div>

		<div class="space-y-3">
			{#each images as image, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[220px_1fr_1fr_48px]"
				>
					<input
						type="datetime-local"
						bind:value={image.dateTime}
						aria-label={`Date de l’image ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={image.imageReference}
						placeholder="URL ou référence de l’image"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={image.description}
						placeholder="Description"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeImage(index)}
						aria-label={`Supprimer l’image ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>

		<div>
			<label for="ultrasound-report" class="mb-2 block text-sm font-bold text-slate-700">
				Compte rendu PDF
			</label>

			<input
				id="ultrasound-report"
				type="text"
				bind:value={form.reportPdfReference}
				placeholder="URL ou référence du document PDF"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>
	</section>
</div>
