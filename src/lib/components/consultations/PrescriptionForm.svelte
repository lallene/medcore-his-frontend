<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Plus, Save, Trash2, CheckCircle2, Info } from 'lucide-svelte';

	import {
		getMedicationPresentations,
		getPresentationAvailability,
		getPrescriptionDispensationStatus
	} from '$lib/api/pharmacy';
	import { updateConsultation } from '$lib/api/consultations';
	import { formSnapshot, isFormDirty } from './form-sync';

	import type { MedicationPresentation, PresentationAvailability } from '$lib/types/pharmacy';
	import type { ConsultationDetail } from '$lib/types/consultation';

	type Props = {
		consultationId: number;
		consultation: ConsultationDetail;
		onSaved?: () => void | Promise<void>;
	};

	type PrescriptionFormItem = {
		id?: number;
		presentationId: number;
		quantity: number;
		durationValue: number | null;
		durationUnit: string;
		instructions: string;
		dispensedQuantity: number;
		fullyDispensed: boolean;
	};

	let { consultationId, consultation, onSaved }: Props = $props();

	let presentations = $state<MedicationPresentation[]>([]);
	let availability = $state<PresentationAvailability[]>([]);
	let prescriptions = $state<PrescriptionFormItem[]>([]);

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');
	let pendingPrescriptions = $state<PrescriptionFormItem[] | null>(null);
	let pendingFingerprint = '';
	let sourceFingerprint = '';
	let baseline = '';
	let dispensationByPrescription = $state<
		Record<number, { dispensedQuantity: number; isFullyDispensed: boolean }>
	>({});

	const durationUnits = [
		{ value: 'jour', label: 'jour' },
		{ value: 'jours', label: 'jours' },
		{ value: 'semaine', label: 'semaine' },
		{ value: 'semaines', label: 'semaines' },
		{ value: 'mois', label: 'mois' }
	];

	function createEmptyPrescription(): PrescriptionFormItem {
		return {
			presentationId: 0,
			quantity: 1,
			durationValue: null,
			durationUnit: 'jours',
			instructions: '',
			dispensedQuantity: 0,
			fullyDispensed: false
		};
	}

	function parseDuration(duration: string): {
		value: number | null;
		unit: string;
	} {
		const value = duration?.trim();

		if (!value) {
			return {
				value: null,
				unit: 'jours'
			};
		}

		const match = value.match(/^(\d+)\s*(.*)$/);

		if (!match) {
			return {
				value: null,
				unit: 'jours'
			};
		}

		return {
			value: Number(match[1]),
			unit: match[2]?.trim() || 'jours'
		};
	}

	function prescriptionDrafts(value: ConsultationDetail): PrescriptionFormItem[] {
		if (value.prescriptions.length === 0) return [createEmptyPrescription()];
		return value.prescriptions.map((prescription) => {
			const duration = parseDuration(prescription.duration);
			return {
				id: prescription.id,
				presentationId: prescription.presentationId ?? 0,
				quantity: prescription.quantity,
				durationValue: duration.value,
				durationUnit: duration.unit,
				instructions: prescription.instructions,
				dispensedQuantity: dispensationByPrescription[prescription.id]?.dispensedQuantity ?? 0,
				fullyDispensed: dispensationByPrescription[prescription.id]?.isFullyDispensed ?? false
			};
		});
	}

	function consultationPrescriptionFingerprint(value: ConsultationDetail): string {
		return formSnapshot(
			value.prescriptions.map((item) => ({
				id: item.id,
				presentationId: item.presentationId,
				quantity: item.quantity,
				duration: item.duration,
				instructions: item.instructions,
				dispensedQuantity: dispensationByPrescription[item.id]?.dispensedQuantity ?? 0,
				fullyDispensed: dispensationByPrescription[item.id]?.isFullyDispensed ?? false
			}))
		);
	}

	function hydratePrescriptions(items: PrescriptionFormItem[]): void {
		prescriptions = structuredClone(items);
		baseline = formSnapshot(prescriptions);
		pendingPrescriptions = null;
		pendingFingerprint = '';
	}

	$effect(() => {
		const incoming = consultation;
		const incomingFingerprint = consultationPrescriptionFingerprint(incoming);
		if (incomingFingerprint === sourceFingerprint) return;
		const dirty = untrack(() => isFormDirty(prescriptions, baseline));
		if (!sourceFingerprint || !dirty) {
			hydratePrescriptions(prescriptionDrafts(incoming));
			sourceFingerprint = incomingFingerprint;
		} else {
			pendingPrescriptions = prescriptionDrafts(incoming);
			pendingFingerprint = incomingFingerprint;
		}
	});

	function presentationLabel(presentation: MedicationPresentation): string {
		const stock = availability.find((item) => item.presentationId === presentation.id);
		const status =
			stock?.stockStatus === 'AVAILABLE'
				? `Disponible — ${stock.availableQuantity} ${presentation.unit || 'unité(s)'}`
				: stock?.stockStatus === 'LOW_STOCK'
					? `Stock faible — ${stock.availableQuantity}`
					: 'Rupture';
		return [
			presentation.medication.name,
			presentation.medication.genericName ? `DCI : ${presentation.medication.genericName}` : '',
			presentation.dosage,
			presentation.form,
			presentation.route,
			status
		]
			.filter(Boolean)
			.join(' · ');
	}

	function addPrescription() {
		prescriptions = [...prescriptions, createEmptyPrescription()];

		success = '';
		error = '';
	}

	function removePrescription(index: number) {
		prescriptions = prescriptions.filter((_, prescriptionIndex) => prescriptionIndex !== index);

		if (prescriptions.length === 0) {
			prescriptions = [createEmptyPrescription()];
		}

		success = '';
		error = '';
	}

	async function savePrescriptions() {
		error = '';
		success = '';

		const invalidPrescription = prescriptions.find(
			(prescription) =>
				prescription.presentationId <= 0 ||
				prescription.quantity <= 0 ||
				!prescription.durationValue ||
				prescription.durationValue <= 0 ||
				!prescription.instructions.trim()
		);

		if (invalidPrescription) {
			error = 'Veuillez renseigner le médicament, la quantité, la durée et la posologie.';
			return;
		}

		saving = true;

		try {
			const saved = await updateConsultation(consultationId, {
				prescriptions: prescriptions.map((prescription) => ({
					id: prescription.id,
					presentationId: prescription.presentationId ?? 0,
					quantity: prescription.quantity,
					duration: `${prescription.durationValue} ${prescription.durationUnit}`.trim(),
					instructions: prescription.instructions.trim()
				}))
			});
			hydratePrescriptions(prescriptionDrafts(saved));
			sourceFingerprint = consultationPrescriptionFingerprint(saved);

			success = 'Prescriptions enregistrées avec succès.';
			await onSaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Impossible d’enregistrer les prescriptions.';
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		try {
			const [reference, stocks, statuses] = await Promise.all([
				getMedicationPresentations(),
				getPresentationAvailability(),
				Promise.all(
					consultation.prescriptions.map(async (item) => {
						try {
							return await getPrescriptionDispensationStatus(item.id);
						} catch {
							return null;
						}
					})
				)
			]);
			dispensationByPrescription = Object.fromEntries(
				statuses.filter((item) => item !== null).map((item) => [item.prescriptionId, item])
			);
			if (!isFormDirty(prescriptions, baseline))
				hydratePrescriptions(prescriptionDrafts(consultation));
			availability = stocks;
			const rank = (id: number) =>
				({ AVAILABLE: 0, LOW_STOCK: 1, OUT_OF_STOCK: 2 })[
					stocks.find((item) => item.presentationId === id)?.stockStatus ?? 'OUT_OF_STOCK'
				];
			const existingPresentationIds = new Set(
				consultation.prescriptions.map((item) => item.presentationId).filter(Boolean)
			);
			presentations = reference
				.filter(
					(item) =>
						(item.isActive && item.medication.isActive) || existingPresentationIds.has(item.id)
				)
				.sort(
					(a, b) =>
						rank(a.id) - rank(b.id) || a.medication.name.localeCompare(b.medication.name, 'fr')
				);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Impossible de charger les médicaments.';
		} finally {
			loading = false;
		}
	});
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
				Plan thérapeutique
			</p>

			<h3 class="mt-1 text-xl font-black text-slate-900">Prescriptions médicales</h3>

			<p class="mt-2 text-sm text-slate-500">Ajoutez un ou plusieurs médicaments à l’ordonnance.</p>
		</div>

		<div class="flex flex-wrap gap-3">
			<button
				type="button"
				onclick={addPrescription}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
			>
				<Plus size={18} />

				Ajouter un médicament
			</button>

			<button
				type="button"
				onclick={savePrescriptions}
				disabled={saving || loading}
				class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b3d75] disabled:cursor-not-allowed disabled:opacity-60"
			>
				<Save size={18} />

				{saving ? 'Enregistrement...' : 'Enregistrer'}
			</button>
		</div>
	</div>

	{#if error}
		<div
			class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
		>
			<CheckCircle2 size={19} />

			{success}
		</div>
	{/if}

	{#if pendingPrescriptions}
		<div
			class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
		>
			<span
				>Des prescriptions plus récentes sont disponibles ; votre saisie locale est conservée.</span
			>
			<button
				type="button"
				class="font-bold underline"
				onclick={() => {
					if (pendingPrescriptions) {
						hydratePrescriptions(pendingPrescriptions);
						sourceFingerprint = pendingFingerprint;
					}
				}}>Charger la version serveur</button
			>
		</div>
	{/if}

	{#if loading}
		<div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
			<p class="text-sm font-bold text-slate-500">Chargement du référentiel pharmacie...</p>
		</div>
	{:else}
		<div class="mt-6 overflow-hidden rounded-2xl border border-slate-200">
			<div
				class="hidden grid-cols-[minmax(320px,2.2fr)_140px_250px_minmax(320px,1.8fr)_70px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 xl:grid"
			>
				<p class="text-sm font-black text-slate-700">Médicament</p>

				<p class="text-sm font-black text-slate-700">Quantité</p>

				<p class="text-sm font-black text-slate-700">Durée</p>

				<p class="text-sm font-black text-slate-700">Instructions / posologie</p>

				<p class="text-center text-sm font-black text-slate-700">Actions</p>
			</div>

			{#each prescriptions as prescription, index (index)}
				<div
					class="grid gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 xl:grid-cols-[minmax(320px,2.2fr)_140px_250px_minmax(320px,1.8fr)_70px] xl:items-center"
				>
					<div>
						<label
							for={`presentation-${index}`}
							class="mb-2 block text-sm font-bold text-slate-700 xl:hidden"
						>
							Médicament
						</label>

						<select
							id={`presentation-${index}`}
							bind:value={prescription.presentationId}
							disabled={prescription.dispensedQuantity > 0}
							class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value={0}> Sélectionner un médicament </option>

							{#each presentations as presentation (presentation.id)}
								<option value={presentation.id}>
									{presentationLabel(presentation)}
								</option>
							{/each}
						</select>
						{#if prescription.dispensedQuantity > 0}<p
								class="mt-2 text-xs font-bold text-amber-700"
							>
								{prescription.fullyDispensed
									? 'Dispensée'
									: `${prescription.dispensedQuantity} / ${prescription.quantity} délivrés`}
								· Présentation verrouillée
							</p>{/if}
					</div>

					<div>
						<label
							for={`quantity-${index}`}
							class="mb-2 block text-sm font-bold text-slate-700 xl:hidden"
						>
							Quantité
						</label>

						<input
							id={`quantity-${index}`}
							type="number"
							min="0.01"
							disabled={prescription.fullyDispensed}
							step="0.01"
							bind:value={prescription.quantity}
							oninput={() => {
								if (prescription.quantity < prescription.dispensedQuantity)
									prescription.quantity = prescription.dispensedQuantity;
							}}
							class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div>
						<label
							for={`duration-${index}`}
							class="mb-2 block text-sm font-bold text-slate-700 xl:hidden"
						>
							Durée
						</label>

						<div class="grid grid-cols-[1fr_1fr] gap-2">
							<input
								id={`duration-${index}`}
								type="number"
								min="1"
								step="1"
								placeholder="3"
								bind:value={prescription.durationValue}
								class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>

							<select
								bind:value={prescription.durationUnit}
								aria-label={`Unité de durée de la prescription ${index + 1}`}
								class="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							>
								{#each durationUnits as unit (unit.value)}
									<option value={unit.value}>
										{unit.label}
									</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label
							for={`instructions-${index}`}
							class="mb-2 block text-sm font-bold text-slate-700 xl:hidden"
						>
							Instructions / posologie
						</label>

						<input
							id={`instructions-${index}`}
							type="text"
							bind:value={prescription.instructions}
							placeholder="Ex. : 1 comprimé matin et soir après le repas"
							class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div class="flex justify-end xl:justify-center">
						<button
							type="button"
							onclick={() => removePrescription(index)}
							disabled={prescription.dispensedQuantity > 0}
							aria-label={`Supprimer la prescription ${index + 1}`}
							title="Supprimer"
							class="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Trash2 size={19} />
						</button>
					</div>
				</div>
			{/each}

			<button
				type="button"
				onclick={addPrescription}
				class="flex w-full items-center justify-center gap-2 border-t border-dashed border-slate-200 px-5 py-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50/50"
			>
				<Plus size={18} />

				Ajouter un médicament
			</button>
		</div>
	{/if}

	<div class="mt-5 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-[#0E4C92]">
		<Info size={18} class="shrink-0" />

		<p>Les médicaments sont sélectionnés depuis le référentiel pharmacie.</p>
	</div>
</section>
