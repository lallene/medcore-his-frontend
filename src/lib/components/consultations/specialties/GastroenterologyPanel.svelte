<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type DigestiveExamRecord = {
		date: string;
		result: string;
		conclusion: string;
		images: string[];
	};

	type BiopsyRecord = {
		date: string;
		anatomopathologyResult: string;
		conclusion: string;
	};

	type LiverPanelRecord = {
		date: string;
		ast: number | null;
		alt: number | null;
		ggt: number | null;
		alp: number | null;
		totalBilirubin: number | null;
		directBilirubin: number | null;
		albumin: number | null;
		prothrombinTime: number | null;
		inr: number | null;
		notes: string;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		abdominalPain: false,
		abdominalPainLocation: '',
		abdominalPainIntensity: null as number | null,
		abdominalPainDuration: '',

		nausea: false,
		nauseaFrequency: '',

		vomiting: false,
		vomitingFrequency: '',
		vomitingAppearance: '',

		diarrhea: false,
		diarrheaDuration: '',
		diarrheaFrequency: '',

		constipation: false,
		constipationDuration: '',

		reflux: false,
		refluxFrequency: '',
		refluxIntensity: null as number | null,

		bloating: false,
		bloatingFrequency: '',

		bloodInStool: false,
		bloodInStoolType: '',
		bloodInStoolFrequency: '',

		weightLoss: false,
		weightLossKg: null as number | null,
		weightLossDuration: '',

		dysphagia: false,

		stoolFrequency: '',
		stoolAppearance: '',

		appetiteStatus: '',

		dietType: '',
		dietaryHabits: '',

		historyUlcer: false,
		historyGastritis: false,
		historyHepatitis: false,
		historyCirrhosis: false,
		historyPancreatitis: false,
		otherDigestiveHistory: '',

		crohnsDisease: false,
		ulcerativeColitis: false,
		otherInflammatoryDisease: ''
	});

	let endoscopyHistory = $state<DigestiveExamRecord[]>([]);
	let colonoscopyHistory = $state<DigestiveExamRecord[]>([]);
	let biopsyHistory = $state<BiopsyRecord[]>([]);
	let abdominalUltrasoundHistory = $state<DigestiveExamRecord[]>([]);
	let ctScanHistory = $state<DigestiveExamRecord[]>([]);
	let mriHistory = $state<DigestiveExamRecord[]>([]);
	let liverPanelHistory = $state<LiverPanelRecord[]>([]);

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

		form.abdominalPain = Boolean(data.abdominalPain ?? false);
		form.abdominalPainLocation = String(data.abdominalPainLocation ?? '');
		form.abdominalPainIntensity = toNullableNumber(data.abdominalPainIntensity);
		form.abdominalPainDuration = String(data.abdominalPainDuration ?? '');

		form.nausea = Boolean(data.nausea ?? false);
		form.nauseaFrequency = String(data.nauseaFrequency ?? '');

		form.vomiting = Boolean(data.vomiting ?? false);
		form.vomitingFrequency = String(data.vomitingFrequency ?? '');
		form.vomitingAppearance = String(data.vomitingAppearance ?? '');

		form.diarrhea = Boolean(data.diarrhea ?? false);
		form.diarrheaDuration = String(data.diarrheaDuration ?? '');
		form.diarrheaFrequency = String(data.diarrheaFrequency ?? '');

		form.constipation = Boolean(data.constipation ?? false);
		form.constipationDuration = String(data.constipationDuration ?? '');

		form.reflux = Boolean(data.reflux ?? false);
		form.refluxFrequency = String(data.refluxFrequency ?? '');
		form.refluxIntensity = toNullableNumber(data.refluxIntensity);

		form.bloating = Boolean(data.bloating ?? false);
		form.bloatingFrequency = String(data.bloatingFrequency ?? '');

		form.bloodInStool = Boolean(data.bloodInStool ?? false);
		form.bloodInStoolType = String(data.bloodInStoolType ?? '');
		form.bloodInStoolFrequency = String(data.bloodInStoolFrequency ?? '');

		form.weightLoss = Boolean(data.weightLoss ?? false);
		form.weightLossKg = toNullableNumber(data.weightLossKg);
		form.weightLossDuration = String(data.weightLossDuration ?? '');

		form.dysphagia = Boolean(data.dysphagia ?? false);

		form.stoolFrequency = String(data.stoolFrequency ?? '');
		form.stoolAppearance = String(data.stoolAppearance ?? '');

		form.appetiteStatus = String(data.appetiteStatus ?? '');

		form.dietType = String(data.dietType ?? '');
		form.dietaryHabits = String(data.dietaryHabits ?? '');

		form.historyUlcer = Boolean(data.historyUlcer ?? false);
		form.historyGastritis = Boolean(data.historyGastritis ?? false);
		form.historyHepatitis = Boolean(data.historyHepatitis ?? false);
		form.historyCirrhosis = Boolean(data.historyCirrhosis ?? false);
		form.historyPancreatitis = Boolean(data.historyPancreatitis ?? false);
		form.otherDigestiveHistory = String(data.otherDigestiveHistory ?? '');

		form.crohnsDisease = Boolean(data.crohnsDisease ?? false);
		form.ulcerativeColitis = Boolean(data.ulcerativeColitis ?? false);
		form.otherInflammatoryDisease = String(data.otherInflammatoryDisease ?? '');

		endoscopyHistory = toArray<DigestiveExamRecord>(data.endoscopyHistory);
		colonoscopyHistory = toArray<DigestiveExamRecord>(data.colonoscopyHistory);
		biopsyHistory = toArray<BiopsyRecord>(data.biopsyHistory);
		abdominalUltrasoundHistory = toArray<DigestiveExamRecord>(data.abdominalUltrasoundHistory);
		ctScanHistory = toArray<DigestiveExamRecord>(data.ctScanHistory);
		mriHistory = toArray<DigestiveExamRecord>(data.mriHistory);
		liverPanelHistory = toArray<LiverPanelRecord>(data.liverPanelHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			endoscopyHistory,
			colonoscopyHistory,
			biopsyHistory,
			abdominalUltrasoundHistory,
			ctScanHistory,
			mriHistory,
			liverPanelHistory
		});
	});

	function createDigestiveExamRecord(): DigestiveExamRecord {
		return {
			date: '',
			result: '',
			conclusion: '',
			images: []
		};
	}

	function addEndoscopy() {
		endoscopyHistory = [...endoscopyHistory, createDigestiveExamRecord()];
	}

	function removeEndoscopy(index: number) {
		endoscopyHistory = endoscopyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addColonoscopy() {
		colonoscopyHistory = [...colonoscopyHistory, createDigestiveExamRecord()];
	}

	function removeColonoscopy(index: number) {
		colonoscopyHistory = colonoscopyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addBiopsy() {
		biopsyHistory = [
			...biopsyHistory,
			{
				date: '',
				anatomopathologyResult: '',
				conclusion: ''
			}
		];
	}

	function removeBiopsy(index: number) {
		biopsyHistory = biopsyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addAbdominalUltrasound() {
		abdominalUltrasoundHistory = [...abdominalUltrasoundHistory, createDigestiveExamRecord()];
	}

	function removeAbdominalUltrasound(index: number) {
		abdominalUltrasoundHistory = abdominalUltrasoundHistory.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}

	function addCTScan() {
		ctScanHistory = [...ctScanHistory, createDigestiveExamRecord()];
	}

	function removeCTScan(index: number) {
		ctScanHistory = ctScanHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addMRI() {
		mriHistory = [...mriHistory, createDigestiveExamRecord()];
	}

	function removeMRI(index: number) {
		mriHistory = mriHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addLiverPanel() {
		liverPanelHistory = [
			...liverPanelHistory,
			{
				date: '',
				ast: null,
				alt: null,
				ggt: null,
				alp: null,
				totalBilirubin: null,
				directBilirubin: null,
				albumin: null,
				prothrombinTime: null,
				inr: null,
				notes: ''
			}
		];
	}

	function removeLiverPanel(index: number) {
		liverPanelHistory = liverPanelHistory.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Symptômes digestifs
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Douleur, transit, reflux et alimentation
			</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.abdominalPain} />
				<span class="text-sm font-bold text-slate-700">Douleur abdominale</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.nausea} />
				<span class="text-sm font-bold text-slate-700">Nausées</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.vomiting} />
				<span class="text-sm font-bold text-slate-700">Vomissements</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.diarrhea} />
				<span class="text-sm font-bold text-slate-700">Diarrhée</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.constipation} />
				<span class="text-sm font-bold text-slate-700">Constipation</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.reflux} />
				<span class="text-sm font-bold text-slate-700">Reflux</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.bloating} />
				<span class="text-sm font-bold text-slate-700">Ballonnements</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.bloodInStool} />
				<span class="text-sm font-bold text-slate-700">Sang dans les selles</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.weightLoss} />
				<span class="text-sm font-bold text-slate-700">Perte de poids</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.dysphagia} />
				<span class="text-sm font-bold text-slate-700">Difficulté à avaler</span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<input
				type="text"
				bind:value={form.abdominalPainLocation}
				disabled={!form.abdominalPain}
				placeholder="Localisation de la douleur"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="number"
				min="0"
				max="10"
				bind:value={form.abdominalPainIntensity}
				disabled={!form.abdominalPain}
				placeholder="Intensité /10"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.abdominalPainDuration}
				disabled={!form.abdominalPain}
				placeholder="Durée de la douleur"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.nauseaFrequency}
				disabled={!form.nausea}
				placeholder="Fréquence des nausées"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.vomitingFrequency}
				disabled={!form.vomiting}
				placeholder="Fréquence des vomissements"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.vomitingAppearance}
				disabled={!form.vomiting}
				placeholder="Aspect des vomissements"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.diarrheaDuration}
				disabled={!form.diarrhea}
				placeholder="Durée de la diarrhée"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.diarrheaFrequency}
				disabled={!form.diarrhea}
				placeholder="Fréquence de la diarrhée"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.constipationDuration}
				disabled={!form.constipation}
				placeholder="Durée de la constipation"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.refluxFrequency}
				disabled={!form.reflux}
				placeholder="Fréquence du reflux"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="number"
				min="0"
				max="10"
				bind:value={form.refluxIntensity}
				disabled={!form.reflux}
				placeholder="Intensité du reflux /10"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.bloatingFrequency}
				disabled={!form.bloating}
				placeholder="Fréquence des ballonnements"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<select
				bind:value={form.bloodInStoolType}
				disabled={!form.bloodInStool}
				aria-label="Type de sang dans les selles"
				class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
			>
				<option value="">Type de sang</option>
				<option value="MELENA">Méléna</option>
				<option value="RECTORRHAGIA">Rectorragie</option>
				<option value="OCCULT">Occulte</option>
				<option value="OTHER">Autre</option>
			</select>

			<input
				type="text"
				bind:value={form.bloodInStoolFrequency}
				disabled={!form.bloodInStool}
				placeholder="Fréquence du saignement"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="number"
				min="0"
				step="0.1"
				bind:value={form.weightLossKg}
				disabled={!form.weightLoss}
				placeholder="Perte de poids (kg)"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>

			<input
				type="text"
				bind:value={form.weightLossDuration}
				disabled={!form.weightLoss}
				placeholder="Durée de la perte de poids"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
			/>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="stool-frequency" class="mb-2 block text-sm font-bold text-slate-700">
					Fréquence des selles
				</label>

				<input
					id="stool-frequency"
					type="text"
					bind:value={form.stoolFrequency}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="stool-appearance" class="mb-2 block text-sm font-bold text-slate-700">
					Aspect des selles
				</label>

				<input
					id="stool-appearance"
					type="text"
					bind:value={form.stoolAppearance}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div>
				<label for="appetite-status" class="mb-2 block text-sm font-bold text-slate-700">
					Appétit
				</label>

				<select
					id="appetite-status"
					bind:value={form.appetiteStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NORMAL">Normal</option>
					<option value="INCREASED">Augmenté</option>
					<option value="DECREASED">Diminué</option>
				</select>
			</div>

			<div>
				<label for="diet-type" class="mb-2 block text-sm font-bold text-slate-700">
					Régime alimentaire
				</label>

				<input
					id="diet-type"
					type="text"
					bind:value={form.dietType}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="md:col-span-2 xl:col-span-4">
				<label for="dietary-habits" class="mb-2 block text-sm font-bold text-slate-700">
					Habitudes alimentaires
				</label>

				<textarea
					id="dietary-habits"
					bind:value={form.dietaryHabits}
					rows="4"
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
			</div>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Antécédents digestifs
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Pathologies digestives et inflammatoires
			</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.historyUlcer} />
				<span class="text-sm font-bold text-slate-700">Ulcère</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.historyGastritis} />
				<span class="text-sm font-bold text-slate-700">Gastrite</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.historyHepatitis} />
				<span class="text-sm font-bold text-slate-700">Hépatite</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.historyCirrhosis} />
				<span class="text-sm font-bold text-slate-700">Cirrhose</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.historyPancreatitis} />
				<span class="text-sm font-bold text-slate-700">Pancréatite</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.crohnsDisease} />
				<span class="text-sm font-bold text-slate-700">Maladie de Crohn</span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.ulcerativeColitis} />
				<span class="text-sm font-bold text-slate-700">Rectocolite hémorragique</span>
			</label>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.otherDigestiveHistory}
				rows="4"
				placeholder="Autres antécédents digestifs"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.otherInflammatoryDisease}
				rows="4"
				placeholder="Autres maladies inflammatoires"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Explorations digestives
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Endoscopie, imagerie, biopsie et bilan hépatique
			</h4>
		</div>

		{@render ExamHistoryBlock(
			'Endoscopie',
			'Date, résultat, conclusion et images.',
			endoscopyHistory,
			addEndoscopy,
			removeEndoscopy
		)}

		{@render ExamHistoryBlock(
			'Coloscopie',
			'Date, résultat, conclusion et images.',
			colonoscopyHistory,
			addColonoscopy,
			removeColonoscopy
		)}

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Biopsie</p>
					<p class="mt-1 text-sm text-slate-500">Date et résultat anatomopathologique.</p>
				</div>

				<button
					type="button"
					onclick={addBiopsy}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-4">
				{#each biopsyHistory as item, index (index)}
					<article class="rounded-xl border border-slate-200 bg-white p-4">
						<div class="grid gap-3 md:grid-cols-2">
							<input
								type="date"
								bind:value={item.date}
								aria-label={`Date de biopsie ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.conclusion}
								placeholder="Conclusion"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<textarea
								bind:value={item.anatomopathologyResult}
								rows="4"
								placeholder="Résultat anatomopathologique"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
							></textarea>
						</div>

						<div class="mt-3 flex justify-end">
							<button
								type="button"
								onclick={() => removeBiopsy(index)}
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

		{@render ExamHistoryBlock(
			'Échographie abdominale',
			'Résultat et conclusion.',
			abdominalUltrasoundHistory,
			addAbdominalUltrasound,
			removeAbdominalUltrasound
		)}

		{@render ExamHistoryBlock(
			'Scanner',
			'Résultat et conclusion.',
			ctScanHistory,
			addCTScan,
			removeCTScan
		)}

		{@render ExamHistoryBlock('IRM', 'Résultat et conclusion.', mriHistory, addMRI, removeMRI)}

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-black text-slate-900">Bilan hépatique</p>
					<p class="mt-1 text-sm text-slate-500">Résultats biologiques et observations.</p>
				</div>

				<button
					type="button"
					onclick={addLiverPanel}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
				>
					<Plus size={16} />
					Ajouter
				</button>
			</div>

			<div class="mt-4 space-y-4">
				{#each liverPanelHistory as item, index (index)}
					<article class="rounded-xl border border-slate-200 bg-white p-4">
						<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
							<input
								type="date"
								bind:value={item.date}
								aria-label={`Date du bilan hépatique ${index + 1}`}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.ast}
								placeholder="ASAT"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.alt}
								placeholder="ALAT"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.ggt}
								placeholder="GGT"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.alp}
								placeholder="PAL"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.totalBilirubin}
								placeholder="Bilirubine totale"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.directBilirubin}
								placeholder="Bilirubine directe"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.albumin}
								placeholder="Albumine"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.prothrombinTime}
								placeholder="Taux de prothrombine"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								step="0.01"
								bind:value={item.inr}
								placeholder="INR"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<textarea
								bind:value={item.notes}
								rows="3"
								placeholder="Observations"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm sm:col-span-2 xl:col-span-5"
							></textarea>
						</div>

						<div class="mt-3 flex justify-end">
							<button
								type="button"
								onclick={() => removeLiverPanel(index)}
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
	</section>
</div>

{#snippet ExamHistoryBlock(
	title: string,
	description: string,
	records: DigestiveExamRecord[],
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
							bind:value={item.conclusion}
							placeholder="Conclusion"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<textarea
							bind:value={item.result}
							rows="4"
							placeholder="Résultat"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"></textarea>
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
