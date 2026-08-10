<script lang="ts">
	import { untrack } from 'svelte';
	import { Save, Activity, HeartPulse, Building2, ClipboardPlus } from 'lucide-svelte';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { updateConsultation } from '$lib/api/consultations';
	import { formSnapshot, isFormDirty } from './form-sync';

	import type { ConsultationDetail, UpdateConsultationPayload } from '$lib/types/consultation';

	type Props = {
		consultation: ConsultationDetail;
		onSaved?: () => void | Promise<void>;
	};

	let { consultation, onSaved }: Props = $props();

	let saving = $state(false);
	let success = $state('');
	let error = $state('');
	let pendingConsultation = $state<ConsultationDetail | null>(null);
	let sourceKey = '';
	let baseline = '';

	/* ===========================
	   Constantes
	=========================== */

	let temperature = $state(0);
	let systolic = $state(0);
	let diastolic = $state(0);
	let heartRate = $state(0);
	let respiratoryRate = $state(0);
	let oxygen = $state(0);
	let weight = $state(0);
	let height = $state(0);
	let glucose = $state(0);
	let pain = $state(0);

	/* ===========================
	   Antécédents
	=========================== */

	let hasHTA = $state(false);
	let hasDiabetes = $state(false);
	let tobacco = $state(false);
	let alcohol = $state(false);

	let previousMedication = $state('');

	let surgicalHistory = $state('');

	let otherMedical = $state('');

	let gynecoHistory = $state('');

	let visitType = $state('');

	let pregnancy = $state(false);

	let ddr = $state('');

	/* ===========================
	   Consultation
	=========================== */

	let diagnosis = $state('');

	let treatment = $state('');

	let observations = $state('');

	/* ===========================
	   Hospitalisation
	=========================== */

	let hospitalizationRequired = $state(false);

	let hospitalizationReason = $state('');

	let hospitalizationType = $state('');

	let hospitalizationDuration = $state(0);

	/* ===========================
	   Arrêt maladie
	=========================== */

	let sickLeaveRequired = $state(false);

	let sickLeaveDays = $state(0);

	function consultationKey(value: ConsultationDetail): string {
		return `${value.id}:${value.updatedAt}`;
	}

	function captureDraft(): object {
		return {
			temperature,
			systolic,
			diastolic,
			heartRate,
			respiratoryRate,
			oxygen,
			weight,
			height,
			glucose,
			pain,
			hasHTA,
			hasDiabetes,
			tobacco,
			alcohol,
			previousMedication,
			surgicalHistory,
			otherMedical,
			gynecoHistory,
			visitType,
			pregnancy,
			ddr,
			diagnosis,
			treatment,
			observations,
			hospitalizationRequired,
			hospitalizationReason,
			hospitalizationType,
			hospitalizationDuration,
			sickLeaveRequired,
			sickLeaveDays
		};
	}

	function hydrateFromConsultation(value: ConsultationDetail): void {
		temperature = value.vitals?.temperature ?? 0;
		systolic = value.vitals?.bloodPressureSystolic ?? 0;
		diastolic = value.vitals?.bloodPressureDiastolic ?? 0;
		heartRate = value.vitals?.heartRate ?? 0;
		respiratoryRate = value.vitals?.respiratoryRate ?? 0;
		oxygen = value.vitals?.oxygenSaturation ?? 0;
		weight = value.vitals?.weight ?? 0;
		height = value.vitals?.height ?? 0;
		glucose = value.vitals?.bloodGlucose ?? 0;
		pain = value.vitals?.painScore ?? 0;
		hasHTA = value.antecedent?.hasHta ?? false;
		hasDiabetes = value.antecedent?.hasDiabetes ?? false;
		tobacco = value.antecedent?.tobacco ?? false;
		alcohol = value.antecedent?.alcohol ?? false;
		previousMedication = value.antecedent?.previousMedication ?? '';
		surgicalHistory = value.antecedent?.surgicalHistory ?? '';
		otherMedical = value.antecedent?.otherMedical ?? '';
		gynecoHistory = value.antecedent?.gynecoObstetricHistory ?? '';
		visitType = value.antecedent?.visitType ?? '';
		pregnancy = value.antecedent?.pregnancyOngoing ?? false;
		ddr = value.antecedent?.ddr ?? '';
		diagnosis = value.diagnosis ?? '';
		treatment = value.treatment ?? '';
		observations = value.observations ?? '';
		hospitalizationRequired = value.hospitalizationRequired;
		hospitalizationReason = value.hospitalizationReason ?? '';
		hospitalizationType = value.hospitalizationType ?? '';
		hospitalizationDuration = value.hospitalizationDuration ?? 0;
		sickLeaveRequired = value.sickLeaveRequired;
		sickLeaveDays = value.sickLeaveDays ?? 0;
		sourceKey = consultationKey(value);
		pendingConsultation = null;
		baseline = formSnapshot(captureDraft());
	}

	$effect(() => {
		const incoming = consultation;
		const incomingKey = consultationKey(incoming);
		if (incomingKey === sourceKey) return;
		const dirty = untrack(() => isFormDirty(captureDraft(), baseline));
		const currentID = Number(sourceKey.split(':')[0] || 0);
		if (!sourceKey || currentID !== incoming.id || !dirty) {
			hydrateFromConsultation(incoming);
		} else {
			pendingConsultation = structuredClone(incoming);
		}
	});

	async function saveClinicalContext(): Promise<void> {
		error = '';
		success = '';

		if (sickLeaveRequired && sickLeaveDays <= 0) {
			error = 'Le nombre de jours de repos doit être supérieur à zéro.';
			return;
		}

		saving = true;

		try {
			const payload: UpdateConsultationPayload = {
				diagnosis,
				treatment,
				observations,

				hospitalizationRequired,
				hospitalizationReason: hospitalizationRequired ? hospitalizationReason : '',
				hospitalizationType: hospitalizationRequired ? hospitalizationType : '',
				hospitalizationDuration: hospitalizationRequired ? hospitalizationDuration : 0,

				sickLeaveRequired,

				vitals: {
					temperature,
					bloodPressureSystolic: systolic,
					bloodPressureDiastolic: diastolic,
					heartRate,
					respiratoryRate,
					oxygenSaturation: oxygen,
					weight,
					height,
					bloodGlucose: glucose,
					painScore: pain
				},

				antecedent: {
					hasHta: hasHTA,
					hasDiabetes,
					tobacco,
					alcohol,
					previousMedication,
					surgicalHistory,
					otherMedical,
					gynecoObstetricHistory: gynecoHistory,
					visitType,
					pregnancyOngoing: pregnancy,
					ddr
				}
			};

			if (sickLeaveRequired) {
				payload.sickLeaveDays = sickLeaveDays;
			}

			const saved = await updateConsultation(consultation.id, payload);
			hydrateFromConsultation(saved);

			success = 'Contexte clinique enregistré avec succès.';

			await onSaved?.();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">Contexte clinique</p>

			<h2 class="mt-1 text-2xl font-black text-slate-900">Saisie clinique générale</h2>

			<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
				Mettez à jour les constantes, les antécédents, le diagnostic, la prise en charge,
				l’hospitalisation et le repos médical.
			</p>
		</div>

		<Button onclick={() => void saveClinicalContext()} disabled={saving}>
			<Save size={17} />

			{saving ? 'Enregistrement...' : 'Enregistrer le contexte'}
		</Button>
	</div>

	{#if error}
		<div
			class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
		>
			{success}
		</div>
	{/if}

	{#if pendingConsultation}
		<div
			class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
		>
			<span
				>Une version plus récente est disponible. Votre saisie locale non enregistrée est conservée.</span
			>
			<button
				type="button"
				class="font-bold underline"
				onclick={() => pendingConsultation && hydrateFromConsultation(pendingConsultation)}
				>Charger la version serveur</button
			>
		</div>
	{/if}

	<Card title="Constantes vitales" subtitle="Paramètres cliniques mesurés pendant la consultation">
		<div class="mb-6 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
			<div
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0E4C92] shadow-sm"
			>
				<Activity size={20} />
			</div>

			<div>
				<p class="font-black text-blue-950">Surveillance clinique</p>

				<p class="mt-1 text-sm leading-5 text-blue-700">
					Laissez un champ vide lorsqu’aucune mesure n’a été prise.
				</p>
			</div>
		</div>

		<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
			<div>
				<label for="temperature" class="mb-2 block text-sm font-bold text-slate-700">
					Température
				</label>

				<div class="relative">
					<input
						id="temperature"
						type="number"
						min="25"
						max="50"
						step="0.1"
						bind:value={temperature}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						°C
					</span>
				</div>
			</div>

			<div>
				<label for="systolic" class="mb-2 block text-sm font-bold text-slate-700">
					TA systolique
				</label>

				<div class="relative">
					<input
						id="systolic"
						type="number"
						min="40"
						max="300"
						step="1"
						bind:value={systolic}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						mmHg
					</span>
				</div>
			</div>

			<div>
				<label for="diastolic" class="mb-2 block text-sm font-bold text-slate-700">
					TA diastolique
				</label>

				<div class="relative">
					<input
						id="diastolic"
						type="number"
						min="20"
						max="200"
						step="1"
						bind:value={diastolic}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						mmHg
					</span>
				</div>
			</div>

			<div>
				<label for="heart-rate" class="mb-2 block text-sm font-bold text-slate-700">
					Fréquence cardiaque
				</label>

				<div class="relative">
					<input
						id="heart-rate"
						type="number"
						min="20"
						max="300"
						step="1"
						bind:value={heartRate}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						bpm
					</span>
				</div>
			</div>

			<div>
				<label for="respiratory-rate" class="mb-2 block text-sm font-bold text-slate-700">
					Fréquence respiratoire
				</label>

				<div class="relative">
					<input
						id="respiratory-rate"
						type="number"
						min="5"
						max="100"
						step="1"
						bind:value={respiratoryRate}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						/min
					</span>
				</div>
			</div>

			<div>
				<label for="oxygen" class="mb-2 block text-sm font-bold text-slate-700">
					Saturation en oxygène
				</label>

				<div class="relative">
					<input
						id="oxygen"
						type="number"
						min="0"
						max="100"
						step="1"
						bind:value={oxygen}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						%
					</span>
				</div>
			</div>

			<div>
				<label for="weight" class="mb-2 block text-sm font-bold text-slate-700"> Poids </label>

				<div class="relative">
					<input
						id="weight"
						type="number"
						min="0"
						max="500"
						step="0.1"
						bind:value={weight}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						kg
					</span>
				</div>
			</div>

			<div>
				<label for="height" class="mb-2 block text-sm font-bold text-slate-700"> Taille </label>

				<div class="relative">
					<input
						id="height"
						type="number"
						min="0"
						max="300"
						step="0.1"
						bind:value={height}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						cm
					</span>
				</div>
			</div>

			<div>
				<label for="glucose" class="mb-2 block text-sm font-bold text-slate-700"> Glycémie </label>

				<div class="relative">
					<input
						id="glucose"
						type="number"
						min="0"
						max="20"
						step="0.01"
						bind:value={glucose}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						g/L
					</span>
				</div>
			</div>

			<div>
				<label for="pain" class="mb-2 block text-sm font-bold text-slate-700">
					Score de douleur
				</label>

				<div class="relative">
					<input
						id="pain"
						type="number"
						min="0"
						max="10"
						step="1"
						bind:value={pain}
						class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>

					<span
						class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
					>
						/10
					</span>
				</div>
			</div>
		</div>

		<div class="mt-6 grid gap-4 md:grid-cols-3">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm"
					>
						<HeartPulse size={18} />
					</div>

					<div>
						<p class="text-xs font-black uppercase text-slate-400">Tension</p>

						<p class="mt-1 font-black text-slate-900">
							{systolic || '—'}/{diastolic || '—'} mmHg
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"
					>
						<Activity size={18} />
					</div>

					<div>
						<p class="text-xs font-black uppercase text-slate-400">Température</p>

						<p class="mt-1 font-black text-slate-900">
							{temperature || '—'} °C
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"
					>
						<HeartPulse size={18} />
					</div>

					<div>
						<p class="text-xs font-black uppercase text-slate-400">Saturation</p>

						<p class="mt-1 font-black text-slate-900">
							{oxygen || '—'} %
						</p>
					</div>
				</div>
			</div>
		</div>
	</Card>

	<Card
		title="Antécédents et habitudes de vie"
		subtitle="Éléments cliniques connus au moment de la consultation"
	>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					hasHTA ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'
				}`}
			>
				<div>
					<p class="font-black text-slate-900">Hypertension</p>

					<p class="mt-1 text-xs text-slate-500">Antécédent d’HTA</p>
				</div>

				<input
					type="checkbox"
					bind:checked={hasHTA}
					class="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
				/>
			</label>

			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					hasDiabetes
						? 'border-orange-200 bg-orange-50'
						: 'border-slate-200 bg-white hover:bg-slate-50'
				}`}
			>
				<div>
					<p class="font-black text-slate-900">Diabète</p>

					<p class="mt-1 text-xs text-slate-500">Diabète connu</p>
				</div>

				<input
					type="checkbox"
					bind:checked={hasDiabetes}
					class="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
				/>
			</label>

			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					tobacco ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'
				}`}
			>
				<div>
					<p class="font-black text-slate-900">Tabac</p>

					<p class="mt-1 text-xs text-slate-500">Consommation déclarée</p>
				</div>

				<input
					type="checkbox"
					bind:checked={tobacco}
					class="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
				/>
			</label>

			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					alcohol ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'
				}`}
			>
				<div>
					<p class="font-black text-slate-900">Alcool</p>

					<p class="mt-1 text-xs text-slate-500">Consommation déclarée</p>
				</div>

				<input
					type="checkbox"
					bind:checked={alcohol}
					class="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
				/>
			</label>
		</div>

		<div class="mt-6 grid gap-5 md:grid-cols-2">
			<div>
				<label for="previous-medication" class="mb-2 block text-sm font-bold text-slate-700">
					Traitement habituel ou antérieur
				</label>

				<textarea
					id="previous-medication"
					bind:value={previousMedication}
					rows="4"
					placeholder="Ex. Metformine 500 mg, Amlodipine 10 mg..."
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				></textarea>
			</div>

			<div>
				<label for="other-medical" class="mb-2 block text-sm font-bold text-slate-700">
					Autres antécédents médicaux
				</label>

				<textarea
					id="other-medical"
					bind:value={otherMedical}
					rows="4"
					placeholder="Maladies chroniques, épisodes antérieurs..."
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				></textarea>
			</div>

			<div>
				<label for="surgical-history" class="mb-2 block text-sm font-bold text-slate-700">
					Antécédents chirurgicaux
				</label>

				<textarea
					id="surgical-history"
					bind:value={surgicalHistory}
					rows="4"
					placeholder="Interventions, dates et complications éventuelles..."
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				></textarea>
			</div>

			<div>
				<label for="gyneco-history" class="mb-2 block text-sm font-bold text-slate-700">
					Historique gynéco-obstétrical
				</label>

				<textarea
					id="gyneco-history"
					bind:value={gynecoHistory}
					rows="4"
					placeholder="Gestité, parité, grossesses, accouchements..."
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				></textarea>
			</div>
		</div>

		<div class="mt-5 grid gap-5 md:grid-cols-3">
			<div>
				<label for="visit-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de visite
				</label>

				<select
					id="visit-type"
					bind:value={visitType}
					class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				>
					<option value="">Sélectionner</option>
					<option value="PREMIERE_VISITE"> Première visite </option>
					<option value="CONTROLE"> Contrôle </option>
					<option value="SUIVI"> Suivi </option>
					<option value="URGENCE"> Urgence </option>
				</select>
			</div>

			<div>
				<label for="ddr" class="mb-2 block text-sm font-bold text-slate-700">
					Date des dernières règles
				</label>

				<input
					id="ddr"
					type="date"
					bind:value={ddr}
					class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				/>
			</div>

			<label
				class={`flex cursor-pointer items-center justify-between self-end rounded-xl border px-4 py-3 transition ${
					pregnancy ? 'border-pink-200 bg-pink-50' : 'border-slate-200 bg-white hover:bg-slate-50'
				}`}
			>
				<div>
					<p class="text-sm font-black text-slate-900">Grossesse en cours</p>

					<p class="mt-1 text-xs text-slate-500">Situation déclarée</p>
				</div>

				<input
					type="checkbox"
					bind:checked={pregnancy}
					class="h-5 w-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
				/>
			</label>
		</div>
	</Card>

	<Card
		title="Diagnostic et prise en charge"
		subtitle="Synthèse clinique générale de la consultation"
	>
		<div class="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
			<div
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"
			>
				<ClipboardPlus size={20} />
			</div>

			<div>
				<p class="font-black text-emerald-950">Synthèse de consultation</p>

				<p class="mt-1 text-sm leading-5 text-emerald-700">
					Ces informations alimentent le dossier patient et les documents médicaux.
				</p>
			</div>
		</div>

		<div class="space-y-5">
			<div>
				<label for="diagnosis" class="mb-2 block text-sm font-bold text-slate-700">
					Diagnostic
				</label>

				<textarea
					id="diagnosis"
					bind:value={diagnosis}
					rows="4"
					placeholder="Diagnostic principal ou hypothèse diagnostique..."
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				></textarea>
			</div>

			<div class="grid gap-5 md:grid-cols-2">
				<div>
					<label for="observations" class="mb-2 block text-sm font-bold text-slate-700">
						Observations cliniques
					</label>

					<textarea
						id="observations"
						bind:value={observations}
						rows="5"
						placeholder="État du patient, évolution, éléments de surveillance..."
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					></textarea>
				</div>

				<div>
					<label for="treatment" class="mb-2 block text-sm font-bold text-slate-700">
						Traitement et conduite à tenir
					</label>

					<textarea
						id="treatment"
						bind:value={treatment}
						rows="5"
						placeholder="Traitement général, surveillance et recommandations..."
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					></textarea>
				</div>
			</div>
		</div>
	</Card>

	<div class="grid gap-6 xl:grid-cols-2">
		<Card title="Hospitalisation" subtitle="Décision et modalités d’admission">
			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					hospitalizationRequired ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
				}`}
			>
				<div class="flex items-center gap-3">
					<div
						class={`flex h-11 w-11 items-center justify-center rounded-xl ${
							hospitalizationRequired ? 'bg-white text-red-700' : 'bg-white text-slate-500'
						}`}
					>
						<Building2 size={20} />
					</div>

					<div>
						<p class="font-black text-slate-900">Hospitalisation nécessaire</p>

						<p class="mt-1 text-xs text-slate-500">Activer si le patient doit être admis</p>
					</div>
				</div>

				<input
					type="checkbox"
					bind:checked={hospitalizationRequired}
					class="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
				/>
			</label>

			{#if hospitalizationRequired}
				<div class="mt-5 space-y-5">
					<div>
						<label for="hospitalization-reason" class="mb-2 block text-sm font-bold text-slate-700">
							Motif d’hospitalisation
						</label>

						<textarea
							id="hospitalization-reason"
							bind:value={hospitalizationReason}
							rows="4"
							placeholder="Motif clinique justifiant l’admission..."
							class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
						></textarea>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<label for="hospitalization-type" class="mb-2 block text-sm font-bold text-slate-700">
								Type d’hospitalisation
							</label>

							<select
								id="hospitalization-type"
								bind:value={hospitalizationType}
								class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
							>
								<option value="">Sélectionner</option>
								<option value="medicale"> Médicale </option>
								<option value="chirurgicale"> Chirurgicale </option>
								<option value="observation"> Observation </option>
								<option value="urgence"> Urgence </option>
							</select>
						</div>

						<div>
							<label
								for="hospitalization-duration"
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Durée estimée
							</label>

							<div class="relative">
								<input
									id="hospitalization-duration"
									type="number"
									min="0"
									step="1"
									bind:value={hospitalizationDuration}
									class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
								/>

								<span
									class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
								>
									jour(s)
								</span>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
				>
					<p class="text-sm font-semibold text-slate-500">Aucune hospitalisation indiquée.</p>
				</div>
			{/if}
		</Card>

		<Card title="Repos maladie" subtitle="Prescription d’un arrêt ou repos médical">
			<label
				class={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
					sickLeaveRequired ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
				}`}
			>
				<div class="flex items-center gap-3">
					<div
						class={`flex h-11 w-11 items-center justify-center rounded-xl ${
							sickLeaveRequired ? 'bg-white text-amber-700' : 'bg-white text-slate-500'
						}`}
					>
						<HeartPulse size={20} />
					</div>

					<div>
						<p class="font-black text-slate-900">Repos médical requis</p>

						<p class="mt-1 text-xs text-slate-500">Permet la génération du certificat</p>
					</div>
				</div>

				<input
					type="checkbox"
					bind:checked={sickLeaveRequired}
					class="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
				/>
			</label>

			{#if sickLeaveRequired}
				<div class="mt-5">
					<label for="sick-leave-days" class="mb-2 block text-sm font-bold text-slate-700">
						Nombre de jours
					</label>

					<div class="relative">
						<input
							id="sick-leave-days"
							type="number"
							min="1"
							max="365"
							step="1"
							bind:value={sickLeaveDays}
							class="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
						/>

						<span
							class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
						>
							jour(s)
						</span>
					</div>

					<div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
						<p class="text-sm font-semibold leading-6 text-amber-800">
							Le certificat de repos maladie sera disponible dans l’onglet Documents après
							enregistrement.
						</p>
					</div>
				</div>
			{:else}
				<div
					class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
				>
					<p class="text-sm font-semibold text-slate-500">Aucun repos médical prescrit.</p>
				</div>
			{/if}
		</Card>
	</div>

	<div
		class="sticky bottom-4 z-20 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<p class="font-black text-slate-900">Contexte clinique</p>

			<p class="mt-1 text-xs text-slate-500">
				Enregistrez les modifications avant de changer d’onglet.
			</p>
		</div>

		<Button onclick={() => void saveClinicalContext()} disabled={saving}>
			<Save size={17} />

			{saving ? 'Enregistrement...' : 'Enregistrer le contexte clinique'}
		</Button>
	</div>
</div>
