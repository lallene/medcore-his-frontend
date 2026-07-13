<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, Stethoscope } from 'lucide-svelte';

	import { getConsultationSpecialty, saveConsultationSpecialty } from '$lib/api/specialty';

	import GeneralMedicinePanel from './GeneralMedicinePanel.svelte';
	import CardiologyPanel from './CardiologyPanel.svelte';
	import GynecologyPanel from './GynecologyPanel.svelte';
	import PediatricsPanel from './PediatricsPanel.svelte';
	import MaternityPanel from './MaternityPanel.svelte';
	import GeneralSurgeryPanel from './GeneralSurgeryPanel.svelte';
	import GastroenterologyPanel from './GastroenterologyPanel.svelte';
	import DiabetologyPanel from './DiabetologyPanel.svelte';
	import DermatologyPanel from './DermatologyPanel.svelte';
	import DentistryPanel from './DentistryPanel.svelte';
	import LaboratoryPanel from './LaboratoryPanel.svelte';
	import UltrasoundPanel from './UltrasoundPanel.svelte';
	import EmergencyPanel from './EmergencyPanel.svelte';
	import EntPanel from './EntPanel.svelte';

	import type { SpecialtyCode, SpecialtyOption } from '$lib/types/specialty';

	type Props = {
		consultationId: number;
		userId?: number;
		service?: string;
	};

	let { consultationId, userId = 1, service = '' }: Props = $props();

	let specialtyCode = $state<SpecialtyCode>('GENERAL_MEDICINE');
	let specialtyData = $state<Record<string, unknown>>({});

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	const specialties: SpecialtyOption[] = [
		{
			code: 'GENERAL_MEDICINE',
			label: 'Médecine générale',
			description: 'Consultation générale'
		},
		{
			code: 'CARDIOLOGY',
			label: 'Cardiologie',
			description: 'Évaluation cardiovasculaire'
		},
		{
			code: 'GYNECO_OBSTETRICS',
			label: 'Gynécologie',
			description: 'Suivi gynéco-obstétrical'
		},
		{
			code: 'PEDIATRICS',
			label: 'Pédiatrie',
			description: 'Suivi de l’enfant'
		},
		{
			code: 'ENT',
			label: 'ORL',
			description: 'Oreille, nez et gorge'
		},
		{
			code: 'MATERNITY',
			label: 'Maternité',
			description: 'Grossesse, accouchement et post-partum'
		},
		{
			code: 'GENERAL_SURGERY',
			label: 'Chirurgie générale',
			description: 'Préopératoire, intervention et suivi'
		},
		{
			code: 'GASTROENTEROLOGY',
			label: 'Gastro-entérologie',
			description: 'Symptômes digestifs et explorations'
		},
		{
			code: 'DIABETOLOGY',
			label: 'Diabétologie',
			description: 'Équilibre glycémique et complications'
		},
		{
			code: 'DERMATOLOGY',
			label: 'Dermatologie',
			description: 'Lésions cutanées et suivi photographique'
		},
		{
			code: 'DENTISTRY',
			label: 'Cabinet dentaire',
			description: 'Odontogramme et soins bucco-dentaires'
		},
		{
			code: 'ULTRASOUND',
			label: 'Échographie',
			description: 'Demande, réalisation et compte rendu'
		},
		{
			code: 'LABORATORY',
			label: 'Laboratoire',
			description: 'Prélèvements, analyses et validation'
		},
		{
			code: 'EMERGENCY',
			label: 'Urgences',
			description: 'Triage, prise en charge et orientation'
		}
	];

	function inferSpecialtyFromService(value: string): SpecialtyCode {
		const normalized = value.toLowerCase();

		if (normalized.includes('cardio')) {
			return 'CARDIOLOGY';
		}

		if (normalized.includes('gyn') || normalized.includes('obst')) {
			return 'GYNECO_OBSTETRICS';
		}

		if (normalized.includes('pédi') || normalized.includes('pedi')) {
			return 'PEDIATRICS';
		}

		if (normalized.includes('orl') || normalized.includes('oto-rhino')) {
			return 'ENT';
		}

		if (normalized.includes('maternite')) {
			return 'MATERNITY';
		}
		if (normalized.includes('chirurg')) {
			return 'GENERAL_SURGERY';
		}
		if (normalized.includes('gastro')) {
			return 'GASTROENTEROLOGY';
		}
		if (normalized.includes('diabeto') || normalized.includes('diabet')) {
			return 'DIABETOLOGY';
		}
		if (normalized.includes('dermato')) {
			return 'DERMATOLOGY';
		}
		if (
			normalized.includes('dentaire') ||
			normalized.includes('dentiste') ||
			normalized.includes('odont')
		) {
			return 'DENTISTRY';
		}
		if (normalized.includes('echograph') || normalized.includes('ultrasound')) {
			return 'ULTRASOUND';
		}
		if (normalized.includes('laboratoire') || normalized.includes('biologie')) {
			return 'LABORATORY';
		}
		if (normalized.includes('urgence') || normalized.includes('emergency')) {
			return 'EMERGENCY';
		}

		return 'GENERAL_MEDICINE';
	}

	function handleDataChange(data: Record<string, unknown>) {
		specialtyData = data;
		success = '';
	}

	async function save() {
		saving = true;
		error = '';
		success = '';

		try {
			const response = await saveConsultationSpecialty(consultationId, {
				specialtyCode,
				data: specialtyData,
				userId
			});

			specialtyData = response.data;
			success = 'Volet de spécialité enregistré avec succès.';
		} catch (err: unknown) {
			error =
				err instanceof Error ? err.message : 'Impossible d’enregistrer le volet de spécialité.';
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		try {
			const response = await getConsultationSpecialty(consultationId);

			if (response) {
				specialtyCode = response.specialty_code;
				specialtyData = response.data ?? {};
			} else {
				specialtyCode = inferSpecialtyFromService(service);
			}
		} catch {
			error = 'Impossible de charger le volet de spécialité.';
		} finally {
			loading = false;
		}
	});
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">Volet spécialisé</p>

			<h3 class="mt-1 text-xl font-black text-slate-900">Spécialité médicale</h3>

			<p class="mt-2 text-sm text-slate-500">
				Le formulaire s’adapte automatiquement à la spécialité sélectionnée.
			</p>
		</div>

		<button
			type="button"
			onclick={save}
			disabled={saving || loading}
			class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b3d75] disabled:cursor-wait disabled:opacity-60"
		>
			<Save size={18} />
			{saving ? 'Enregistrement...' : 'Enregistrer'}
		</button>
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
			class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
		>
			{success}
		</div>
	{/if}

	{#if loading}
		<p class="mt-6 text-sm text-slate-500">Chargement du volet de spécialité...</p>
	{:else}
		<div class="mt-6 space-y-5">
			<section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0E4C92]"
					>
						<Stethoscope size={19} />
					</div>

					<div>
						<p class="text-sm font-black text-slate-900">Spécialité</p>

						<p class="text-xs text-slate-500">
							Sélectionnez le volet clinique adapté à la consultation.
						</p>
					</div>
				</div>

				<div class="flex gap-3 overflow-x-auto pb-2">
					{#each specialties as specialty (specialty.code)}
						<button
							type="button"
							onclick={() => {
								specialtyCode = specialty.code;
								specialtyData = {};
								success = '';
								error = '';
							}}
							class={`rounded-xl border p-4 text-left transition ${
								specialtyCode === specialty.code
									? 'border-[#0E4C92] bg-[#0E4C92] text-white shadow-sm'
									: 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
							}`}
						>
							<p class="text-sm font-black">
								{specialty.label}
							</p>

							<p
								class={`mt-1 text-xs leading-5 ${
									specialtyCode === specialty.code ? 'text-blue-100' : 'text-slate-400'
								}`}
							>
								{specialty.description}
							</p>
						</button>
					{/each}
				</div>
			</section>

			<section class="rounded-2xl border border-slate-200 bg-white p-5">
				{#if specialtyCode === 'CARDIOLOGY'}
					<CardiologyPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'GYNECO_OBSTETRICS'}
					<GynecologyPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'PEDIATRICS'}
					<PediatricsPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'ENT'}
					<EntPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'GENERAL_MEDICINE'}
					<GeneralMedicinePanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'MATERNITY'}
					<MaternityPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'GENERAL_SURGERY'}
					<GeneralSurgeryPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'GASTROENTEROLOGY'}
					<GastroenterologyPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'DIABETOLOGY'}
					<DiabetologyPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'DERMATOLOGY'}
					<DermatologyPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'DENTISTRY'}
					<DentistryPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'ULTRASOUND'}
					<UltrasoundPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'LABORATORY'}
					<LaboratoryPanel data={specialtyData} onChange={handleDataChange} />
				{:else if specialtyCode === 'EMERGENCY'}
					<EmergencyPanel data={specialtyData} onChange={handleDataChange} />
				{:else}
					<div class="flex min-h-[260px] items-center justify-center">
						<div class="max-w-lg text-center">
							<div
								class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
							>
								<Stethoscope size={26} />
							</div>

							<h4 class="mt-4 text-lg font-black text-slate-900">
								{specialties.find((item) => item.code === specialtyCode)?.label}
							</h4>

							<p class="mt-2 text-sm leading-6 text-slate-500">
								Le volet clinique de cette spécialité est prêt à recevoir sa structure métier.
							</p>
						</div>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</section>
