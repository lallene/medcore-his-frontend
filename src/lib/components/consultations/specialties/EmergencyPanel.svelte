<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type EmergencyProcedure = {
		name: string;
		dateTime: string;
		performedBy: string;
		notes: string;
	};

	type AdministeredMedication = {
		medication: string;
		dose: string;
		dateTime: string;
		route: string;
		administeredBy: string;
	};

	type RequestedExam = {
		category: string;
		name: string;
		urgencyLevel: string;
		status: string;
	};

	type MonitoringRecord = {
		dateTime: string;
		bloodPressureSystolic: number | null;
		bloodPressureDiastolic: number | null;
		heartRate: number | null;
		temperature: number | null;
		oxygenSaturation: number | null;
		respiratoryRate: number | null;
		bloodGlucose: number | null;
		painScore: number | null;
		consciousnessStatus: string;
		glasgowScore: number | null;
		notes: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		arrivalDateTime: '',
		arrivalMode: '',

		companionName: '',
		companionPhone: '',
		companionRelationship: '',

		mainComplaint: '',

		urgencyLevel: '',
		triagePriorityScore: null as number | null,
		triageDateTime: '',
		triageNurse: '',

		consciousnessStatus: '',
		glasgowScore: null as number | null,

		painScore: null as number | null,
		painLocation: '',

		bloodPressureSystolic: null as number | null,
		bloodPressureDiastolic: null as number | null,
		heartRate: null as number | null,
		temperature: null as number | null,
		oxygenSaturation: null as number | null,
		respiratoryRate: null as number | null,
		bloodGlucose: null as number | null,

		responsibleDoctor: '',
		provisionalDiagnosis: '',

		finalDisposition: '',
		transferDestination: '',
		dischargeDateTime: '',
		dispositionNotes: ''
	});

	let procedures = $state<EmergencyProcedure[]>([]);
	let administeredMedications = $state<AdministeredMedication[]>([]);
	let requestedExams = $state<RequestedExam[]>([]);
	let monitoringHistory = $state<MonitoringRecord[]>([]);

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

		form.arrivalDateTime = String(data.arrivalDateTime ?? '');
		form.arrivalMode = String(data.arrivalMode ?? '');

		form.companionName = String(data.companionName ?? '');
		form.companionPhone = String(data.companionPhone ?? '');
		form.companionRelationship = String(data.companionRelationship ?? '');

		form.mainComplaint = String(data.mainComplaint ?? '');

		form.urgencyLevel = String(data.urgencyLevel ?? '');
		form.triagePriorityScore = toNullableNumber(data.triagePriorityScore);
		form.triageDateTime = String(data.triageDateTime ?? '');
		form.triageNurse = String(data.triageNurse ?? '');

		form.consciousnessStatus = String(data.consciousnessStatus ?? '');
		form.glasgowScore = toNullableNumber(data.glasgowScore);

		form.painScore = toNullableNumber(data.painScore);
		form.painLocation = String(data.painLocation ?? '');

		form.bloodPressureSystolic = toNullableNumber(data.bloodPressureSystolic);
		form.bloodPressureDiastolic = toNullableNumber(data.bloodPressureDiastolic);
		form.heartRate = toNullableNumber(data.heartRate);
		form.temperature = toNullableNumber(data.temperature);
		form.oxygenSaturation = toNullableNumber(data.oxygenSaturation);
		form.respiratoryRate = toNullableNumber(data.respiratoryRate);
		form.bloodGlucose = toNullableNumber(data.bloodGlucose);

		form.responsibleDoctor = String(data.responsibleDoctor ?? '');
		form.provisionalDiagnosis = String(data.provisionalDiagnosis ?? '');

		form.finalDisposition = String(data.finalDisposition ?? '');
		form.transferDestination = String(data.transferDestination ?? '');
		form.dischargeDateTime = String(data.dischargeDateTime ?? '');
		form.dispositionNotes = String(data.dispositionNotes ?? '');

		procedures = toArray<EmergencyProcedure>(data.procedures);
		administeredMedications = toArray<AdministeredMedication>(data.administeredMedications);
		requestedExams = toArray<RequestedExam>(data.requestedExams);
		monitoringHistory = toArray<MonitoringRecord>(data.monitoringHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			procedures,
			administeredMedications,
			requestedExams,
			monitoringHistory
		});
	});

	function addProcedure() {
		procedures = [
			...procedures,
			{
				name: '',
				dateTime: '',
				performedBy: '',
				notes: ''
			}
		];
	}

	function removeProcedure(index: number) {
		procedures = procedures.filter((_, itemIndex) => itemIndex !== index);
	}

	function addMedication() {
		administeredMedications = [
			...administeredMedications,
			{
				medication: '',
				dose: '',
				dateTime: '',
				route: '',
				administeredBy: ''
			}
		];
	}

	function removeMedication(index: number) {
		administeredMedications = administeredMedications.filter((_, itemIndex) => itemIndex !== index);
	}

	function addRequestedExam() {
		requestedExams = [
			...requestedExams,
			{
				category: '',
				name: '',
				urgencyLevel: '',
				status: 'REQUESTED'
			}
		];
	}

	function removeRequestedExam(index: number) {
		requestedExams = requestedExams.filter((_, itemIndex) => itemIndex !== index);
	}

	function addMonitoringRecord() {
		monitoringHistory = [
			...monitoringHistory,
			{
				dateTime: '',
				bloodPressureSystolic: null,
				bloodPressureDiastolic: null,
				heartRate: null,
				temperature: null,
				oxygenSaturation: null,
				respiratoryRate: null,
				bloodGlucose: null,
				painScore: null,
				consciousnessStatus: '',
				glasgowScore: null,
				notes: ''
			}
		];
	}

	function removeMonitoringRecord(index: number) {
		monitoringHistory = monitoringHistory.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Accueil aux urgences
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Arrivée et motif principal</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="emergency-arrival" class="mb-2 block text-sm font-bold text-slate-700">
					Date et heure d’arrivée
				</label>

				<input
					id="emergency-arrival"
					type="datetime-local"
					bind:value={form.arrivalDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="arrival-mode" class="mb-2 block text-sm font-bold text-slate-700">
					Mode d’arrivée
				</label>

				<select
					id="arrival-mode"
					bind:value={form.arrivalMode}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="PERSONAL">Par ses propres moyens</option>
					<option value="AMBULANCE">Ambulance</option>
					<option value="POLICE">Police</option>
					<option value="TRANSFER">Transfert médical</option>
				</select>
			</div>

			<div class="md:col-span-2">
				<label for="main-complaint" class="mb-2 block text-sm font-bold text-slate-700">
					Motif principal
				</label>

				<input
					id="main-complaint"
					type="text"
					bind:value={form.mainComplaint}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<p class="font-black text-slate-900">Accompagnant</p>

			<div class="mt-4 grid gap-4 md:grid-cols-3">
				<input
					type="text"
					bind:value={form.companionName}
					placeholder="Nom et prénoms"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="tel"
					bind:value={form.companionPhone}
					placeholder="Téléphone"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>

				<input
					type="text"
					bind:value={form.companionRelationship}
					placeholder="Lien avec le patient"
					class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Triage</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Priorité et évaluation initiale</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="emergency-urgency" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’urgence
				</label>

				<select
					id="emergency-urgency"
					bind:value={form.urgencyLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="LEVEL_1">Niveau 1 — Réanimation immédiate</option>
					<option value="LEVEL_2">Niveau 2 — Très urgent</option>
					<option value="LEVEL_3">Niveau 3 — Urgent</option>
					<option value="LEVEL_4">Niveau 4 — Peu urgent</option>
					<option value="LEVEL_5">Niveau 5 — Non urgent</option>
				</select>
			</div>

			<div>
				<label for="triage-score" class="mb-2 block text-sm font-bold text-slate-700">
					Score de priorité
				</label>

				<input
					id="triage-score"
					type="number"
					min="0"
					bind:value={form.triagePriorityScore}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="triage-date" class="mb-2 block text-sm font-bold text-slate-700">
					Heure du triage
				</label>

				<input
					id="triage-date"
					type="datetime-local"
					bind:value={form.triageDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="triage-nurse" class="mb-2 block text-sm font-bold text-slate-700">
					Infirmier de triage
				</label>

				<input
					id="triage-nurse"
					type="text"
					bind:value={form.triageNurse}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Évaluation clinique initiale
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Conscience, douleur et constantes</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="consciousness-status" class="mb-2 block text-sm font-bold text-slate-700">
					État de conscience
				</label>

				<select
					id="consciousness-status"
					bind:value={form.consciousnessStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NORMAL">Normal</option>
					<option value="ALTERED">Altéré</option>
					<option value="UNCONSCIOUS">Inconscient</option>
				</select>
			</div>

			<div>
				<label for="glasgow-score" class="mb-2 block text-sm font-bold text-slate-700">
					Score de Glasgow
				</label>

				<input
					id="glasgow-score"
					type="number"
					min="3"
					max="15"
					bind:value={form.glasgowScore}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="emergency-pain-score" class="mb-2 block text-sm font-bold text-slate-700">
					Douleur
				</label>

				<input
					id="emergency-pain-score"
					type="number"
					min="0"
					max="10"
					bind:value={form.painScore}
					placeholder="/10"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="emergency-pain-location" class="mb-2 block text-sm font-bold text-slate-700">
					Localisation de la douleur
				</label>

				<input
					id="emergency-pain-location"
					type="text"
					bind:value={form.painLocation}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<input
				type="number"
				bind:value={form.bloodPressureSystolic}
				placeholder="TA systolique"
				aria-label="Tension artérielle systolique"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				bind:value={form.bloodPressureDiastolic}
				placeholder="TA diastolique"
				aria-label="Tension artérielle diastolique"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				bind:value={form.heartRate}
				placeholder="Pouls (bpm)"
				aria-label="Pouls"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				step="0.1"
				bind:value={form.temperature}
				placeholder="Température (°C)"
				aria-label="Température"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				min="0"
				max="100"
				step="0.1"
				bind:value={form.oxygenSaturation}
				placeholder="Saturation (%)"
				aria-label="Saturation"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				bind:value={form.respiratoryRate}
				placeholder="Fréquence respiratoire"
				aria-label="Fréquence respiratoire"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>

			<input
				type="number"
				step="0.01"
				bind:value={form.bloodGlucose}
				placeholder="Glycémie"
				aria-label="Glycémie"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
			/>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Prise en charge médicale
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Médecin responsable et diagnostic provisoire
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="emergency-doctor" class="mb-2 block text-sm font-bold text-slate-700">
					Médecin responsable
				</label>

				<input
					id="emergency-doctor"
					type="text"
					bind:value={form.responsibleDoctor}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="provisional-diagnosis" class="mb-2 block text-sm font-bold text-slate-700">
					Diagnostic provisoire
				</label>

				<input
					id="provisional-diagnosis"
					type="text"
					bind:value={form.provisionalDiagnosis}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Actes réalisés</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">
					Soins et gestes réalisés aux urgences
				</h4>
			</div>

			<button
				type="button"
				onclick={addProcedure}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un acte
			</button>
		</div>

		<div class="space-y-3">
			{#each procedures as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px_1fr_1.5fr_48px]"
				>
					<input
						type="text"
						bind:value={item.name}
						placeholder="Acte réalisé"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="datetime-local"
						bind:value={item.dateTime}
						aria-label={`Date de l’acte ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.performedBy}
						placeholder="Professionnel"
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
						onclick={() => removeProcedure(index)}
						aria-label={`Supprimer l’acte ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Médicaments administrés
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Médicament, dose, heure et voie</h4>
			</div>

			<button
				type="button"
				onclick={addMedication}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un médicament
			</button>
		</div>

		<div class="space-y-3">
			{#each administeredMedications as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_1fr_220px_180px_1fr_48px]"
				>
					<input
						type="text"
						bind:value={item.medication}
						placeholder="Médicament"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.dose}
						placeholder="Dose"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="datetime-local"
						bind:value={item.dateTime}
						aria-label={`Heure du médicament ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<select
						bind:value={item.route}
						aria-label={`Voie du médicament ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="">Voie</option>
						<option value="ORAL">Orale</option>
						<option value="IV">Intraveineuse</option>
						<option value="IM">Intramusculaire</option>
						<option value="SC">Sous-cutanée</option>
						<option value="RECTAL">Rectale</option>
						<option value="INHALED">Inhalée</option>
						<option value="OTHER">Autre</option>
					</select>

					<input
						type="text"
						bind:value={item.administeredBy}
						placeholder="Administré par"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<button
						type="button"
						onclick={() => removeMedication(index)}
						aria-label={`Supprimer le médicament ${index + 1}`}
						class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
					>
						<Trash2 size={17} />
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Examens demandés
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">
					Laboratoire, imagerie et autres examens
				</h4>
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
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr_180px_180px_48px]"
				>
					<select
						bind:value={item.category}
						aria-label={`Catégorie de l’examen ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="">Catégorie</option>
						<option value="LABORATORY">Laboratoire</option>
						<option value="IMAGING">Imagerie</option>
						<option value="CARDIOLOGY">Cardiologie</option>
						<option value="OTHER">Autre</option>
					</select>

					<input
						type="text"
						bind:value={item.name}
						placeholder="Examen demandé"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<select
						bind:value={item.urgencyLevel}
						aria-label={`Urgence de l’examen ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="">Urgence</option>
						<option value="NORMAL">Normal</option>
						<option value="URGENT">Urgent</option>
						<option value="CRITICAL">Critique</option>
					</select>

					<select
						bind:value={item.status}
						aria-label={`Statut de l’examen ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="REQUESTED">Demandé</option>
						<option value="IN_PROGRESS">En cours</option>
						<option value="COMPLETED">Réalisé</option>
						<option value="CANCELLED">Annulé</option>
					</select>

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
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Surveillance</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Constantes et évolution clinique</h4>
			</div>

			<button
				type="button"
				onclick={addMonitoringRecord}
				class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white"
			>
				<Plus size={16} />
				Ajouter une surveillance
			</button>
		</div>

		<div class="space-y-4">
			{#each monitoringHistory as item, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Surveillance #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removeMonitoringRecord(index)}
							aria-label={`Supprimer la surveillance ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<input
							type="datetime-local"
							bind:value={item.dateTime}
							aria-label={`Date de surveillance ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.bloodPressureSystolic}
							placeholder="TA systolique"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.bloodPressureDiastolic}
							placeholder="TA diastolique"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.heartRate}
							placeholder="Pouls"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={item.temperature}
							placeholder="Température"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.1"
							bind:value={item.oxygenSaturation}
							placeholder="Saturation"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							bind:value={item.respiratoryRate}
							placeholder="Fréquence respiratoire"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							step="0.01"
							bind:value={item.bloodGlucose}
							placeholder="Glycémie"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="number"
							min="0"
							max="10"
							bind:value={item.painScore}
							placeholder="Douleur /10"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<select
							bind:value={item.consciousnessStatus}
							aria-label={`Conscience surveillance ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Conscience</option>
							<option value="NORMAL">Normale</option>
							<option value="ALTERED">Altérée</option>
							<option value="UNCONSCIOUS">Inconscient</option>
						</select>

						<input
							type="number"
							min="3"
							max="15"
							bind:value={item.glasgowScore}
							placeholder="Glasgow"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>
					</div>

					<textarea
						bind:value={item.notes}
						rows="3"
						placeholder="Évolution clinique et observations"
						class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					></textarea>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Orientation finale
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Décision de sortie des urgences</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="final-disposition" class="mb-2 block text-sm font-bold text-slate-700">
					Orientation finale
				</label>

				<select
					id="final-disposition"
					bind:value={form.finalDisposition}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="HOME">Domicile</option>
					<option value="HOSPITALIZATION">Hospitalisation</option>
					<option value="OPERATING_ROOM">Bloc opératoire</option>
					<option value="MATERNITY">Maternité</option>
					<option value="INTENSIVE_CARE">Réanimation</option>
					<option value="TRANSFER">Transfert</option>
					<option value="DECEASED">Décès</option>
				</select>
			</div>

			<div>
				<label for="transfer-destination" class="mb-2 block text-sm font-bold text-slate-700">
					Destination du transfert
				</label>

				<input
					id="transfer-destination"
					type="text"
					bind:value={form.transferDestination}
					disabled={form.finalDisposition !== 'TRANSFER'}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div>
				<label for="emergency-discharge" class="mb-2 block text-sm font-bold text-slate-700">
					Date de sortie des urgences
				</label>

				<input
					id="emergency-discharge"
					type="datetime-local"
					bind:value={form.dischargeDateTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2 xl:col-span-3">
				<label for="disposition-notes" class="mb-2 block text-sm font-bold text-slate-700">
					Observations de sortie
				</label>

				<textarea
					id="disposition-notes"
					bind:value={form.dispositionNotes}
					rows="4"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>
	</section>
</div>
