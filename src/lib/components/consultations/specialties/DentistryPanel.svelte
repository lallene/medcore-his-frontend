<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type ToothStatus =
		'HEALTHY' | 'CARIES' | 'MISSING' | 'CROWN' | 'IMPLANT' | 'FILLED' | 'FRACTURED';

	type ToothRecord = {
		toothNumber: number;
		status: ToothStatus;
		notes: string;
	};

	type DentalProcedure = {
		toothNumber: number | null;
		status: string;
		date: string;
		details: string;
	};

	type DentalCrown = {
		toothNumber: number | null;
		type: string;
		date: string;
		notes: string;
	};

	type DentalImplant = {
		toothNumber: number | null;
		reference: string;
		batchNumber: string;
		date: string;
	};

	type DentalImaging = {
		date: string;
		imageReference: string;
		result: string;
		conclusion: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		dentalPain: false,
		painToothNumber: null as number | null,
		painIntensity: null as number | null,

		heatSensitivity: false,
		coldSensitivity: false,
		pressureSensitivity: false,

		gumBleeding: false,
		gumInflammation: false,
		gumNotes: '',

		halitosis: false,
		chewingDifficulties: false,
		chewingNotes: '',

		scalingDate: '',

		prosthesisType: '',
		prosthesisNotes: '',

		orthodonticTreatment: '',
		orthodonticFollowUp: ''
	});

	let odontogram = $state<ToothRecord[]>([]);
	let extractions = $state<DentalProcedure[]>([]);
	let rootCanalTreatments = $state<DentalProcedure[]>([]);
	let fillings = $state<DentalProcedure[]>([]);
	let crowns = $state<DentalCrown[]>([]);
	let implants = $state<DentalImplant[]>([]);

	let panoramicXrays = $state<DentalImaging[]>([]);
	let localXrays = $state<DentalImaging[]>([]);
	let dentalScans = $state<DentalImaging[]>([]);

	let initialized = $state(false);

	const adultTeeth = [
		18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41,
		31, 32, 33, 34, 35, 36, 37, 38
	];

	const toothStatusOptions: Array<{
		value: ToothStatus;
		label: string;
	}> = [
		{ value: 'HEALTHY', label: 'Saine' },
		{ value: 'CARIES', label: 'Cariée' },
		{ value: 'MISSING', label: 'Absente' },
		{ value: 'CROWN', label: 'Couronnée' },
		{ value: 'IMPLANT', label: 'Implantée' },
		{ value: 'FILLED', label: 'Plombée' },
		{ value: 'FRACTURED', label: 'Fracturée' }
	];

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

	function createDefaultOdontogram(): ToothRecord[] {
		return adultTeeth.map((toothNumber) => ({
			toothNumber,
			status: 'HEALTHY',
			notes: ''
		}));
	}

	$effect(() => {
		if (initialized) {
			return;
		}

		form.dentalPain = Boolean(data.dentalPain ?? false);
		form.painToothNumber = toNullableNumber(data.painToothNumber);
		form.painIntensity = toNullableNumber(data.painIntensity);

		form.heatSensitivity = Boolean(data.heatSensitivity ?? false);
		form.coldSensitivity = Boolean(data.coldSensitivity ?? false);
		form.pressureSensitivity = Boolean(data.pressureSensitivity ?? false);

		form.gumBleeding = Boolean(data.gumBleeding ?? false);
		form.gumInflammation = Boolean(data.gumInflammation ?? false);
		form.gumNotes = String(data.gumNotes ?? '');

		form.halitosis = Boolean(data.halitosis ?? false);
		form.chewingDifficulties = Boolean(data.chewingDifficulties ?? false);
		form.chewingNotes = String(data.chewingNotes ?? '');

		form.scalingDate = String(data.scalingDate ?? '');

		form.prosthesisType = String(data.prosthesisType ?? '');
		form.prosthesisNotes = String(data.prosthesisNotes ?? '');

		form.orthodonticTreatment = String(data.orthodonticTreatment ?? '');
		form.orthodonticFollowUp = String(data.orthodonticFollowUp ?? '');

		const storedOdontogram = toArray<ToothRecord>(data.odontogram);

		odontogram = storedOdontogram.length > 0 ? storedOdontogram : createDefaultOdontogram();

		extractions = toArray<DentalProcedure>(data.extractions);
		rootCanalTreatments = toArray<DentalProcedure>(data.rootCanalTreatments);
		fillings = toArray<DentalProcedure>(data.fillings);
		crowns = toArray<DentalCrown>(data.crowns);
		implants = toArray<DentalImplant>(data.implants);

		panoramicXrays = toArray<DentalImaging>(data.panoramicXrays);
		localXrays = toArray<DentalImaging>(data.localXrays);
		dentalScans = toArray<DentalImaging>(data.dentalScans);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			odontogram,
			extractions,
			rootCanalTreatments,
			fillings,
			crowns,
			implants,
			panoramicXrays,
			localXrays,
			dentalScans
		});
	});

	function addExtraction() {
		extractions = [
			...extractions,
			{
				toothNumber: null,
				status: 'PLANNED',
				date: '',
				details: ''
			}
		];
	}

	function removeExtraction(index: number) {
		extractions = extractions.filter((_, itemIndex) => itemIndex !== index);
	}

	function addRootCanalTreatment() {
		rootCanalTreatments = [
			...rootCanalTreatments,
			{
				toothNumber: null,
				status: 'PLANNED',
				date: '',
				details: ''
			}
		];
	}

	function removeRootCanalTreatment(index: number) {
		rootCanalTreatments = rootCanalTreatments.filter((_, itemIndex) => itemIndex !== index);
	}

	function addFilling() {
		fillings = [
			...fillings,
			{
				toothNumber: null,
				status: 'COMPLETED',
				date: '',
				details: ''
			}
		];
	}

	function removeFilling(index: number) {
		fillings = fillings.filter((_, itemIndex) => itemIndex !== index);
	}

	function addCrown() {
		crowns = [
			...crowns,
			{
				toothNumber: null,
				type: '',
				date: '',
				notes: ''
			}
		];
	}

	function removeCrown(index: number) {
		crowns = crowns.filter((_, itemIndex) => itemIndex !== index);
	}

	function addImplant() {
		implants = [
			...implants,
			{
				toothNumber: null,
				reference: '',
				batchNumber: '',
				date: ''
			}
		];
	}

	function removeImplant(index: number) {
		implants = implants.filter((_, itemIndex) => itemIndex !== index);
	}

	function createImaging(): DentalImaging {
		return {
			date: '',
			imageReference: '',
			result: '',
			conclusion: ''
		};
	}

	function addPanoramicXray() {
		panoramicXrays = [...panoramicXrays, createImaging()];
	}

	function removePanoramicXray(index: number) {
		panoramicXrays = panoramicXrays.filter((_, itemIndex) => itemIndex !== index);
	}

	function addLocalXray() {
		localXrays = [...localXrays, createImaging()];
	}

	function removeLocalXray(index: number) {
		localXrays = localXrays.filter((_, itemIndex) => itemIndex !== index);
	}

	function addDentalScan() {
		dentalScans = [...dentalScans, createImaging()];
	}

	function removeDentalScan(index: number) {
		dentalScans = dentalScans.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Symptômes bucco-dentaires
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Douleur, sensibilité et mastication</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.dentalPain} />
				<span class="text-sm font-bold text-slate-700"> Douleur dentaire </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.heatSensitivity} />
				<span class="text-sm font-bold text-slate-700"> Sensibilité au chaud </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.coldSensitivity} />
				<span class="text-sm font-bold text-slate-700"> Sensibilité au froid </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.pressureSensitivity} />
				<span class="text-sm font-bold text-slate-700"> Sensibilité à la pression </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.gumBleeding} />
				<span class="text-sm font-bold text-slate-700"> Saignement des gencives </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.gumInflammation} />
				<span class="text-sm font-bold text-slate-700"> Inflammation gingivale </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.halitosis} />
				<span class="text-sm font-bold text-slate-700"> Halitose </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.chewingDifficulties} />
				<span class="text-sm font-bold text-slate-700"> Difficultés de mastication </span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="pain-tooth-number" class="mb-2 block text-sm font-bold text-slate-700">
					Dent concernée
				</label>

				<select
					id="pain-tooth-number"
					bind:value={form.painToothNumber}
					disabled={!form.dentalPain}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				>
					<option value={null}>Sélectionner</option>

					{#each adultTeeth as toothNumber (toothNumber)}
						<option value={toothNumber}>
							Dent {toothNumber}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="dental-pain-intensity" class="mb-2 block text-sm font-bold text-slate-700">
					Intensité de la douleur
				</label>

				<input
					id="dental-pain-intensity"
					type="number"
					min="0"
					max="10"
					bind:value={form.painIntensity}
					disabled={!form.dentalPain}
					placeholder="/10"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="gum-notes" class="mb-2 block text-sm font-bold text-slate-700">
					Observations gingivales
				</label>

				<input
					id="gum-notes"
					type="text"
					bind:value={form.gumNotes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2 xl:col-span-4">
				<label for="chewing-notes" class="mb-2 block text-sm font-bold text-slate-700">
					Observations sur la mastication
				</label>

				<textarea
					id="chewing-notes"
					bind:value={form.chewingNotes}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Odontogramme</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">État détaillé de chaque dent</h4>

			<p class="mt-2 text-sm text-slate-500">Numérotation dentaire adulte selon le système FDI.</p>
		</div>

		<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
			{#each odontogram as tooth (tooth.toothNumber)}
				<article class="rounded-xl border border-slate-200 bg-slate-50 p-3">
					<p class="text-center text-sm font-black text-slate-900">
						{tooth.toothNumber}
					</p>

					<select
						bind:value={tooth.status}
						aria-label={`État de la dent ${tooth.toothNumber}`}
						class="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
					>
						{#each toothStatusOptions as option (option.value)}
							<option value={option.value}>
								{option.label}
							</option>
						{/each}
					</select>

					<textarea
						bind:value={tooth.notes}
						rows="2"
						placeholder="Notes"
						aria-label={`Notes de la dent ${tooth.toothNumber}`}
						class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
					></textarea>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Soins dentaires</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Extractions, soins canalaires et restaurations
			</h4>
		</div>

		{@render ProcedureBlock(
			'Extractions',
			'Extraction prévue ou réalisée.',
			extractions,
			addExtraction,
			removeExtraction
		)}

		{@render ProcedureBlock(
			'Traitements canalaires',
			'Statut du traitement canalaire.',
			rootCanalTreatments,
			addRootCanalTreatment,
			removeRootCanalTreatment
		)}

		{@render ProcedureBlock(
			'Obturations',
			'Dent, date et détails de l’obturation.',
			fillings,
			addFilling,
			removeFilling
		)}

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Couronnes</p>

						<p class="mt-1 text-sm text-slate-500">Dent concernée et type de couronne.</p>
					</div>

					<button
						type="button"
						onclick={addCrown}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each crowns as item, index (index)}
						<div class="rounded-xl border border-slate-200 bg-white p-4">
							<div class="grid gap-3">
								<select
									bind:value={item.toothNumber}
									aria-label={`Dent de la couronne ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value={null}>Dent</option>

									{#each adultTeeth as toothNumber (toothNumber)}
										<option value={toothNumber}>
											Dent {toothNumber}
										</option>
									{/each}
								</select>

								<input
									type="text"
									bind:value={item.type}
									placeholder="Type de couronne"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<input
									type="date"
									bind:value={item.date}
									aria-label={`Date de la couronne ${index + 1}`}
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={item.notes}
									placeholder="Notes"
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>
							</div>

							<div class="mt-3 flex justify-end">
								<button
									type="button"
									onclick={() => removeCrown(index)}
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

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Implants</p>

						<p class="mt-1 text-sm text-slate-500">Dent, référence et numéro de lot.</p>
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
						<div class="rounded-xl border border-slate-200 bg-white p-4">
							<div class="grid gap-3">
								<select
									bind:value={item.toothNumber}
									aria-label={`Dent de l’implant ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value={null}>Dent</option>

									{#each adultTeeth as toothNumber (toothNumber)}
										<option value={toothNumber}>
											Dent {toothNumber}
										</option>
									{/each}
								</select>

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
									type="date"
									bind:value={item.date}
									aria-label={`Date de l’implant ${index + 1}`}
									class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
								/>
							</div>

							<div class="mt-3 flex justify-end">
								<button
									type="button"
									onclick={() => removeImplant(index)}
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
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="scaling-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du dernier détartrage
				</label>

				<input
					id="scaling-date"
					type="date"
					bind:value={form.scalingDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="prosthesis-type" class="mb-2 block text-sm font-bold text-slate-700">
					Type de prothèse
				</label>

				<input
					id="prosthesis-type"
					type="text"
					bind:value={form.prosthesisType}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="prosthesis-notes" class="mb-2 block text-sm font-bold text-slate-700">
					Observations sur la prothèse
				</label>

				<input
					id="prosthesis-notes"
					type="text"
					bind:value={form.prosthesisNotes}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2">
				<label for="orthodontic-treatment" class="mb-2 block text-sm font-bold text-slate-700">
					Traitement orthodontique
				</label>

				<textarea
					id="orthodontic-treatment"
					bind:value={form.orthodonticTreatment}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>

			<div>
				<label for="orthodontic-follow-up" class="mb-2 block text-sm font-bold text-slate-700">
					Suivi orthodontique
				</label>

				<textarea
					id="orthodontic-follow-up"
					bind:value={form.orthodonticFollowUp}
					rows="3"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Imagerie dentaire</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Radiographies et scanner dentaire</h4>
		</div>

		{@render ImagingBlock(
			'Radiographie panoramique',
			'Image, date et conclusion.',
			panoramicXrays,
			addPanoramicXray,
			removePanoramicXray
		)}

		{@render ImagingBlock(
			'Radiographie locale',
			'Image et date.',
			localXrays,
			addLocalXray,
			removeLocalXray
		)}

		{@render ImagingBlock(
			'Scanner dentaire',
			'Image, résultat et conclusion.',
			dentalScans,
			addDentalScan,
			removeDentalScan
		)}
	</section>
</div>

{#snippet ProcedureBlock(
	title: string,
	description: string,
	records: DentalProcedure[],
	onAdd: () => void,
	onRemove: (index: number) => void
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="font-black text-slate-900">{title}</p>
				<p class="mt-1 text-sm text-slate-500">{description}</p>
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

		<div class="mt-4 space-y-3">
			{#each records as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[180px_180px_180px_1fr_48px]"
				>
					<select
						bind:value={item.toothNumber}
						aria-label={`Dent ${title} ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value={null}>Dent</option>

						{#each adultTeeth as toothNumber (toothNumber)}
							<option value={toothNumber}>
								Dent {toothNumber}
							</option>
						{/each}
					</select>

					<select
						bind:value={item.status}
						aria-label={`Statut ${title} ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="PLANNED">Prévue</option>
						<option value="IN_PROGRESS">En cours</option>
						<option value="COMPLETED">Réalisée</option>
						<option value="CANCELLED">Annulée</option>
					</select>

					<input
						type="date"
						bind:value={item.date}
						aria-label={`Date ${title} ${index + 1}`}
						class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.details}
						placeholder="Détails"
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

{#snippet ImagingBlock(
	title: string,
	description: string,
	records: DentalImaging[],
	onAdd: () => void,
	onRemove: (index: number) => void
)}
	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="font-black text-slate-900">{title}</p>
				<p class="mt-1 text-sm text-slate-500">{description}</p>
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
					<div class="grid gap-3 md:grid-cols-2">
						<input
							type="date"
							bind:value={item.date}
							aria-label={`Date ${title} ${index + 1}`}
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={item.imageReference}
							placeholder="Référence ou URL de l’image"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<textarea
							bind:value={item.result}
							rows="3"
							placeholder="Résultat"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

						<textarea
							bind:value={item.conclusion}
							rows="3"
							placeholder="Conclusion"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
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
