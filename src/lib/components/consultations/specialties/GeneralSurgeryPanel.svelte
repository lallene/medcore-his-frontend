<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type SurgicalHistoryItem = {
		procedure: string;
		date: string;
		indication: string;
		complications: string;
	};

	type AllergyItem = {
		substance: string;
		type: string;
		reaction: string;
		severity: string;
	};

	type CurrentTreatmentItem = {
		medication: string;
		dosage: string;
		frequency: string;
		notes: string;
	};

	type AnticoagulantItem = {
		medication: string;
		lastDoseDateTime: string;
		notes: string;
	};

	type SurgicalTeamMember = {
		name: string;
		role: string;
	};

	type ImplantItem = {
		type: string;
		reference: string;
		batchNumber: string;
		manufacturer: string;
	};

	type PostoperativeFollowUp = {
		dateTime: string;
		painScore: number | null;
		temperature: number | null;
		bloodPressureSystolic: number | null;
		bloodPressureDiastolic: number | null;
		heartRate: number | null;
		respiratoryRate: number | null;
		oxygenSaturation: number | null;
		notes: string;
	};

	type DressingRecord = {
		dateTime: string;
		condition: string;
		notes: string;
	};

	type DrainRecord = {
		type: string;
		quantity: string;
		insertionDate: string;
		removalDate: string;
		notes: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		primaryDiagnosis: '',
		surgicalIndication: '',
		plannedProcedure: '',
		urgencyLevel: '',

		anestheticRiskLevel: '',
		consentStatus: '',
		consentDate: '',
		consentDocumentSigned: false,

		interventionDate: '',
		startTime: '',
		endTime: '',

		leadSurgeon: '',
		anesthesiologist: '',
		anesthesiaType: '',

		operativeTechnique: '',
		operativeReport: '',
		intraoperativeIncidents: '',

		complications: '',
		complicationsManagement: '',

		woundCondition: '',
		bowelTransitStatus: '',
		feedingEvolution: '',
		mobilizationStatus: '',

		sutureRemovalDate: '',
		nextFollowUpDate: ''
	});

	let surgicalHistories = $state<SurgicalHistoryItem[]>([]);
	let allergies = $state<AllergyItem[]>([]);
	let currentTreatments = $state<CurrentTreatmentItem[]>([]);
	let anticoagulants = $state<AnticoagulantItem[]>([]);
	let surgicalTeam = $state<SurgicalTeamMember[]>([]);
	let implants = $state<ImplantItem[]>([]);
	let postoperativeFollowUps = $state<PostoperativeFollowUp[]>([]);
	let dressings = $state<DressingRecord[]>([]);
	let drains = $state<DrainRecord[]>([]);

	let initialized = $state(false);

	function toArray<T>(value: unknown): T[] {
		return Array.isArray(value) ? (value as T[]) : [];
	}

	$effect(() => {
		if (initialized) {
			return;
		}

		form.primaryDiagnosis = String(data.primaryDiagnosis ?? '');
		form.surgicalIndication = String(data.surgicalIndication ?? '');
		form.plannedProcedure = String(data.plannedProcedure ?? '');
		form.urgencyLevel = String(data.urgencyLevel ?? '');

		form.anestheticRiskLevel = String(data.anestheticRiskLevel ?? '');
		form.consentStatus = String(data.consentStatus ?? '');
		form.consentDate = String(data.consentDate ?? '');
		form.consentDocumentSigned = Boolean(data.consentDocumentSigned ?? false);

		form.interventionDate = String(data.interventionDate ?? '');
		form.startTime = String(data.startTime ?? '');
		form.endTime = String(data.endTime ?? '');

		form.leadSurgeon = String(data.leadSurgeon ?? '');
		form.anesthesiologist = String(data.anesthesiologist ?? '');
		form.anesthesiaType = String(data.anesthesiaType ?? '');

		form.operativeTechnique = String(data.operativeTechnique ?? '');
		form.operativeReport = String(data.operativeReport ?? '');
		form.intraoperativeIncidents = String(data.intraoperativeIncidents ?? '');

		form.complications = String(data.complications ?? '');
		form.complicationsManagement = String(data.complicationsManagement ?? '');

		form.woundCondition = String(data.woundCondition ?? '');
		form.bowelTransitStatus = String(data.bowelTransitStatus ?? '');
		form.feedingEvolution = String(data.feedingEvolution ?? '');
		form.mobilizationStatus = String(data.mobilizationStatus ?? '');

		form.sutureRemovalDate = String(data.sutureRemovalDate ?? '');
		form.nextFollowUpDate = String(data.nextFollowUpDate ?? '');

		surgicalHistories = toArray<SurgicalHistoryItem>(data.surgicalHistories);
		allergies = toArray<AllergyItem>(data.allergies);
		currentTreatments = toArray<CurrentTreatmentItem>(data.currentTreatments);
		anticoagulants = toArray<AnticoagulantItem>(data.anticoagulants);
		surgicalTeam = toArray<SurgicalTeamMember>(data.surgicalTeam);
		implants = toArray<ImplantItem>(data.implants);
		postoperativeFollowUps = toArray<PostoperativeFollowUp>(data.postoperativeFollowUps);
		dressings = toArray<DressingRecord>(data.dressings);
		drains = toArray<DrainRecord>(data.drains);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			surgicalHistories,
			allergies,
			currentTreatments,
			anticoagulants,
			surgicalTeam,
			implants,
			postoperativeFollowUps,
			dressings,
			drains
		});
	});

	function addSurgicalHistory() {
		surgicalHistories = [
			...surgicalHistories,
			{
				procedure: '',
				date: '',
				indication: '',
				complications: ''
			}
		];
	}

	function removeSurgicalHistory(index: number) {
		surgicalHistories = surgicalHistories.filter((_, i) => i !== index);
	}

	function addAllergy() {
		allergies = [
			...allergies,
			{
				substance: '',
				type: '',
				reaction: '',
				severity: ''
			}
		];
	}

	function removeAllergy(index: number) {
		allergies = allergies.filter((_, i) => i !== index);
	}

	function addCurrentTreatment() {
		currentTreatments = [
			...currentTreatments,
			{
				medication: '',
				dosage: '',
				frequency: '',
				notes: ''
			}
		];
	}

	function removeCurrentTreatment(index: number) {
		currentTreatments = currentTreatments.filter((_, i) => i !== index);
	}

	function addAnticoagulant() {
		anticoagulants = [
			...anticoagulants,
			{
				medication: '',
				lastDoseDateTime: '',
				notes: ''
			}
		];
	}

	function removeAnticoagulant(index: number) {
		anticoagulants = anticoagulants.filter((_, i) => i !== index);
	}

	function addSurgicalTeamMember() {
		surgicalTeam = [
			...surgicalTeam,
			{
				name: '',
				role: ''
			}
		];
	}

	function removeSurgicalTeamMember(index: number) {
		surgicalTeam = surgicalTeam.filter((_, i) => i !== index);
	}

	function addImplant() {
		implants = [
			...implants,
			{
				type: '',
				reference: '',
				batchNumber: '',
				manufacturer: ''
			}
		];
	}

	function removeImplant(index: number) {
		implants = implants.filter((_, i) => i !== index);
	}

	function addPostoperativeFollowUp() {
		postoperativeFollowUps = [
			...postoperativeFollowUps,
			{
				dateTime: '',
				painScore: null,
				temperature: null,
				bloodPressureSystolic: null,
				bloodPressureDiastolic: null,
				heartRate: null,
				respiratoryRate: null,
				oxygenSaturation: null,
				notes: ''
			}
		];
	}

	function removePostoperativeFollowUp(index: number) {
		postoperativeFollowUps = postoperativeFollowUps.filter((_, i) => i !== index);
	}

	function addDressing() {
		dressings = [
			...dressings,
			{
				dateTime: '',
				condition: '',
				notes: ''
			}
		];
	}

	function removeDressing(index: number) {
		dressings = dressings.filter((_, i) => i !== index);
	}

	function addDrain() {
		drains = [
			...drains,
			{
				type: '',
				quantity: '',
				insertionDate: '',
				removalDate: '',
				notes: ''
			}
		];
	}

	function removeDrain(index: number) {
		drains = drains.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Préopératoire</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Diagnostic, indication et niveau d’urgence
			</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div class="xl:col-span-2">
				<label for="surgery-diagnosis" class="mb-2 block text-sm font-bold text-slate-700">
					Diagnostic principal
				</label>

				<input
					id="surgery-diagnosis"
					type="text"
					bind:value={form.primaryDiagnosis}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="xl:col-span-2">
				<label for="surgical-indication" class="mb-2 block text-sm font-bold text-slate-700">
					Indication chirurgicale
				</label>

				<input
					id="surgical-indication"
					type="text"
					bind:value={form.surgicalIndication}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="xl:col-span-2">
				<label for="planned-procedure" class="mb-2 block text-sm font-bold text-slate-700">
					Intervention prévue
				</label>

				<input
					id="planned-procedure"
					type="text"
					bind:value={form.plannedProcedure}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="urgency-level" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’urgence
				</label>

				<select
					id="urgency-level"
					bind:value={form.urgencyLevel}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="PLANNED">Programmée</option>
					<option value="URGENT">Urgente</option>
					<option value="IMMEDIATE">Immédiate</option>
				</select>
			</div>

			<div>
				<label for="anesthetic-risk" class="mb-2 block text-sm font-bold text-slate-700">
					Risque anesthésique
				</label>

				<input
					id="anesthetic-risk"
					type="text"
					bind:value={form.anestheticRiskLevel}
					placeholder="Ex. ASA II"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="consent-status" class="mb-2 block text-sm font-bold text-slate-700">
					Consentement
				</label>

				<select
					id="consent-status"
					bind:value={form.consentStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="PENDING">En attente</option>
					<option value="OBTAINED">Obtenu</option>
					<option value="REFUSED">Refusé</option>
				</select>
			</div>

			<div>
				<label for="consent-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du consentement
				</label>

				<input
					id="consent-date"
					type="date"
					bind:value={form.consentDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
				<input type="checkbox" bind:checked={form.consentDocumentSigned} />

				<span class="text-sm font-bold text-slate-700"> Document signé </span>
			</label>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Antécédents et traitements
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Risques préopératoires</h4>
			</div>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Antécédents chirurgicaux</p>
						<p class="mt-1 text-sm text-slate-500">Interventions précédentes et complications.</p>
					</div>

					<button
						type="button"
						onclick={addSurgicalHistory}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each surgicalHistories as item, index (index)}
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

							<input
								type="text"
								bind:value={item.indication}
								placeholder="Indication"
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
									onclick={() => removeSurgicalHistory(index)}
									aria-label={`Supprimer l’antécédent chirurgical ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
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
						<p class="font-black text-slate-900">Allergies</p>
						<p class="mt-1 text-sm text-slate-500">Médicaments, produits et réactions.</p>
					</div>

					<button
						type="button"
						onclick={addAllergy}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each allergies as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="text"
								bind:value={item.substance}
								placeholder="Médicament ou produit"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.type}
								placeholder="Type"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.reaction}
								placeholder="Réaction"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
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
									onclick={() => removeAllergy(index)}
									aria-label={`Supprimer l’allergie ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Traitements en cours</p>
						<p class="mt-1 text-sm text-slate-500">Liste complète des traitements.</p>
					</div>

					<button
						type="button"
						onclick={addCurrentTreatment}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each currentTreatments as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
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

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.notes}
									placeholder="Notes"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeCurrentTreatment(index)}
									aria-label={`Supprimer le traitement ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
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
						<p class="font-black text-slate-900">Anticoagulants</p>
						<p class="mt-1 text-sm text-slate-500">Médicament et dernière prise.</p>
					</div>

					<button
						type="button"
						onclick={addAnticoagulant}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each anticoagulants as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="text"
								bind:value={item.medication}
								placeholder="Anticoagulant"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="datetime-local"
								bind:value={item.lastDoseDateTime}
								aria-label={`Dernière prise de l’anticoagulant ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.notes}
									placeholder="Notes"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeAnticoagulant(index)}
									aria-label={`Supprimer l’anticoagulant ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
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
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Intervention</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Organisation et déroulement opératoire</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="intervention-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date de l’intervention
				</label>

				<input
					id="intervention-date"
					type="date"
					bind:value={form.interventionDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="start-time" class="mb-2 block text-sm font-bold text-slate-700">
					Heure de début
				</label>

				<input
					id="start-time"
					type="time"
					bind:value={form.startTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="end-time" class="mb-2 block text-sm font-bold text-slate-700">
					Heure de fin
				</label>

				<input
					id="end-time"
					type="time"
					bind:value={form.endTime}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="anesthesia-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type d’anesthésie
				</label>

				<select
					id="anesthesia-type"
					bind:value={form.anesthesiaType}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="LOCAL">Locale</option>
					<option value="REGIONAL">Régionale</option>
					<option value="GENERAL">Générale</option>
				</select>
			</div>

			<div class="xl:col-span-2">
				<label for="lead-surgeon" class="mb-2 block text-sm font-bold text-slate-700">
					Chirurgien principal
				</label>

				<input
					id="lead-surgeon"
					type="text"
					bind:value={form.leadSurgeon}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="xl:col-span-2">
				<label for="anesthesiologist" class="mb-2 block text-sm font-bold text-slate-700">
					Anesthésiste responsable
				</label>

				<input
					id="anesthesiologist"
					type="text"
					bind:value={form.anesthesiologist}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Équipe chirurgicale</p>
					<p class="mt-1 text-sm text-slate-500">Assistants et autres professionnels.</p>
				</div>

				<button
					type="button"
					onclick={addSurgicalTeamMember}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each surgicalTeam as member, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_48px]"
					>
						<input
							type="text"
							bind:value={member.name}
							placeholder="Nom"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={member.role}
							placeholder="Rôle"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removeSurgicalTeamMember(index)}
							aria-label={`Supprimer le membre ${index + 1}`}
							class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.operativeTechnique}
				rows="5"
				placeholder="Technique opératoire"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.operativeReport}
				rows="5"
				placeholder="Compte rendu opératoire détaillé"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.intraoperativeIncidents}
				rows="4"
				placeholder="Incidents peropératoires"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.complications}
				rows="4"
				placeholder="Complications"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.complicationsManagement}
				rows="4"
				placeholder="Prise en charge des complications"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"></textarea>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Implants</p>
					<p class="mt-1 text-sm text-slate-500">Type, référence et numéro de lot.</p>
				</div>

				<button
					type="button"
					onclick={addImplant}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each implants as item, index (index)}
					<div
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1fr_48px]"
					>
						<input
							type="text"
							bind:value={item.type}
							placeholder="Type"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.reference}
							placeholder="Référence"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.batchNumber}
							placeholder="Numéro de lot"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.manufacturer}
							placeholder="Fabricant"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<button
							type="button"
							onclick={() => removeImplant(index)}
							aria-label={`Supprimer l’implant ${index + 1}`}
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
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Suivi postopératoire
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Douleur, constantes et évolution</h4>
			</div>

			<button
				type="button"
				onclick={addPostoperativeFollowUp}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter un suivi
			</button>
		</div>

		<div class="space-y-4">
			{#each postoperativeFollowUps as item, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Suivi postopératoire #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removePostoperativeFollowUp(index)}
							aria-label={`Supprimer le suivi ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<input
							type="datetime-local"
							bind:value={item.dateTime}
							aria-label={`Date du suivi ${index + 1}`}
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

						<input
							type="number"
							step="0.1"
							bind:value={item.temperature}
							placeholder="Température"
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
							placeholder="Fréquence cardiaque"
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
							step="0.1"
							bind:value={item.oxygenSaturation}
							placeholder="SpO₂"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>
					</div>

					<textarea
						bind:value={item.notes}
						rows="3"
						placeholder="Observations"
						class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					></textarea>
				</article>
			{/each}
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div class="xl:col-span-2">
				<label for="wound-condition" class="mb-2 block text-sm font-bold text-slate-700">
					État de la plaie
				</label>

				<textarea
					id="wound-condition"
					bind:value={form.woundCondition}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div>
				<label for="transit-status" class="mb-2 block text-sm font-bold text-slate-700">
					Reprise du transit
				</label>

				<input
					id="transit-status"
					type="text"
					bind:value={form.bowelTransitStatus}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="feeding-evolution" class="mb-2 block text-sm font-bold text-slate-700">
					Évolution de l’alimentation
				</label>

				<input
					id="feeding-evolution"
					type="text"
					bind:value={form.feedingEvolution}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="mobilization-status" class="mb-2 block text-sm font-bold text-slate-700">
					Mobilisation
				</label>

				<input
					id="mobilization-status"
					type="text"
					bind:value={form.mobilizationStatus}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="suture-removal-date" class="mb-2 block text-sm font-bold text-slate-700">
					Ablation fils/agrafes
				</label>

				<input
					id="suture-removal-date"
					type="date"
					bind:value={form.sutureRemovalDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="next-follow-up" class="mb-2 block text-sm font-bold text-slate-700">
					Prochain contrôle
				</label>

				<input
					id="next-follow-up"
					type="date"
					bind:value={form.nextFollowUpDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Pansements</p>
						<p class="mt-1 text-sm text-slate-500">Date et état du pansement.</p>
					</div>

					<button
						type="button"
						onclick={addDressing}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each dressings as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="datetime-local"
								bind:value={item.dateTime}
								aria-label={`Date du pansement ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.condition}
								placeholder="État"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.notes}
									placeholder="Notes"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeDressing(index)}
									aria-label={`Supprimer le pansement ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
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
						<p class="font-black text-slate-900">Drains</p>
						<p class="mt-1 text-sm text-slate-500">Type, quantité et date de retrait.</p>
					</div>

					<button
						type="button"
						onclick={addDrain}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each drains as item, index (index)}
						<div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<input
								type="text"
								bind:value={item.type}
								placeholder="Type de drain"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.quantity}
								placeholder="Quantité"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="date"
								bind:value={item.insertionDate}
								aria-label={`Date de pose du drain ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="date"
								bind:value={item.removalDate}
								aria-label={`Date de retrait du drain ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<div class="grid grid-cols-[1fr_48px] gap-3">
								<input
									type="text"
									bind:value={item.notes}
									placeholder="Notes"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeDrain(index)}
									aria-label={`Supprimer le drain ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
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
</div>
