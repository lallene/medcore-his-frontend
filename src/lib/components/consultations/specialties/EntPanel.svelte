<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type DiagnosticExam = {
		date: string;
		result: string;
		conclusion: string;
		images: string[];
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		rightEarPain: false,
		leftEarPain: false,
		hearingLoss: false,
		tinnitus: false,
		earDischarge: false,

		vertigo: false,
		balanceDisorders: false,

		nasalObstruction: false,
		epistaxis: false,
		nasalDischarge: false,

		smellStatus: '',

		throatPain: false,
		throatDiscomfort: false,
		recurrentThroatInfections: false,

		dysphagia: false,

		voiceModification: false,
		aphonia: false,
		hoarseness: false,

		snoring: false,
		suspectedSleepApnea: false,

		rightEarCanal: '',
		rightTympanum: '',

		leftEarCanal: '',
		leftTympanum: '',

		nasalCavitiesExam: '',
		sinusExam: '',

		oropharynxExam: '',
		tonsilsExam: '',

		larynxExam: '',
		cervicalLymphNodes: ''
	});

	let audiometryHistory = $state<DiagnosticExam[]>([]);
	let tympanometryHistory = $state<DiagnosticExam[]>([]);
	let nasalEndoscopyHistory = $state<DiagnosticExam[]>([]);
	let fibroscopyHistory = $state<DiagnosticExam[]>([]);
	let vestibularTestsHistory = $state<DiagnosticExam[]>([]);

	let initialized = $state(false);

	function toArray<T>(value: unknown): T[] {
		return Array.isArray(value) ? (value as T[]) : [];
	}

	$effect(() => {
		if (initialized) {
			return;
		}

		form.rightEarPain = Boolean(data.rightEarPain ?? false);
		form.leftEarPain = Boolean(data.leftEarPain ?? false);
		form.hearingLoss = Boolean(data.hearingLoss ?? false);
		form.tinnitus = Boolean(data.tinnitus ?? false);
		form.earDischarge = Boolean(data.earDischarge ?? false);

		form.vertigo = Boolean(data.vertigo ?? false);
		form.balanceDisorders = Boolean(data.balanceDisorders ?? false);

		form.nasalObstruction = Boolean(data.nasalObstruction ?? false);
		form.epistaxis = Boolean(data.epistaxis ?? false);
		form.nasalDischarge = Boolean(data.nasalDischarge ?? false);

		form.smellStatus = String(data.smellStatus ?? '');

		form.throatPain = Boolean(data.throatPain ?? false);
		form.throatDiscomfort = Boolean(data.throatDiscomfort ?? false);
		form.recurrentThroatInfections = Boolean(data.recurrentThroatInfections ?? false);

		form.dysphagia = Boolean(data.dysphagia ?? false);

		form.voiceModification = Boolean(data.voiceModification ?? false);
		form.aphonia = Boolean(data.aphonia ?? false);
		form.hoarseness = Boolean(data.hoarseness ?? false);

		form.snoring = Boolean(data.snoring ?? false);
		form.suspectedSleepApnea = Boolean(data.suspectedSleepApnea ?? false);

		form.rightEarCanal = String(data.rightEarCanal ?? '');
		form.rightTympanum = String(data.rightTympanum ?? '');

		form.leftEarCanal = String(data.leftEarCanal ?? '');
		form.leftTympanum = String(data.leftTympanum ?? '');

		form.nasalCavitiesExam = String(data.nasalCavitiesExam ?? '');
		form.sinusExam = String(data.sinusExam ?? '');

		form.oropharynxExam = String(data.oropharynxExam ?? '');
		form.tonsilsExam = String(data.tonsilsExam ?? '');

		form.larynxExam = String(data.larynxExam ?? '');
		form.cervicalLymphNodes = String(data.cervicalLymphNodes ?? '');

		audiometryHistory = toArray<DiagnosticExam>(data.audiometryHistory);
		tympanometryHistory = toArray<DiagnosticExam>(data.tympanometryHistory);
		nasalEndoscopyHistory = toArray<DiagnosticExam>(data.nasalEndoscopyHistory);
		fibroscopyHistory = toArray<DiagnosticExam>(data.fibroscopyHistory);
		vestibularTestsHistory = toArray<DiagnosticExam>(data.vestibularTestsHistory);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			audiometryHistory,
			tympanometryHistory,
			nasalEndoscopyHistory,
			fibroscopyHistory,
			vestibularTestsHistory
		});
	});

	function createDiagnosticExam(): DiagnosticExam {
		return {
			date: '',
			result: '',
			conclusion: '',
			images: []
		};
	}

	function addAudiometry() {
		audiometryHistory = [...audiometryHistory, createDiagnosticExam()];
	}

	function removeAudiometry(index: number) {
		audiometryHistory = audiometryHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addTympanometry() {
		tympanometryHistory = [...tympanometryHistory, createDiagnosticExam()];
	}

	function removeTympanometry(index: number) {
		tympanometryHistory = tympanometryHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addNasalEndoscopy() {
		nasalEndoscopyHistory = [...nasalEndoscopyHistory, createDiagnosticExam()];
	}

	function removeNasalEndoscopy(index: number) {
		nasalEndoscopyHistory = nasalEndoscopyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addFibroscopy() {
		fibroscopyHistory = [...fibroscopyHistory, createDiagnosticExam()];
	}

	function removeFibroscopy(index: number) {
		fibroscopyHistory = fibroscopyHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function addVestibularTest() {
		vestibularTestsHistory = [...vestibularTestsHistory, createDiagnosticExam()];
	}

	function removeVestibularTest(index: number) {
		vestibularTestsHistory = vestibularTestsHistory.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Symptômes ORL</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Oreilles, nez, gorge et sommeil</h4>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.rightEarPain} />
				<span class="text-sm font-bold text-slate-700"> Douleur oreille droite </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.leftEarPain} />
				<span class="text-sm font-bold text-slate-700"> Douleur oreille gauche </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.hearingLoss} />
				<span class="text-sm font-bold text-slate-700"> Baisse d’audition </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.tinnitus} />
				<span class="text-sm font-bold text-slate-700"> Acouphènes </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.earDischarge} />
				<span class="text-sm font-bold text-slate-700"> Écoulement auriculaire </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.vertigo} />
				<span class="text-sm font-bold text-slate-700"> Vertiges </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.balanceDisorders} />
				<span class="text-sm font-bold text-slate-700"> Troubles de l’équilibre </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.nasalObstruction} />
				<span class="text-sm font-bold text-slate-700"> Obstruction nasale </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.epistaxis} />
				<span class="text-sm font-bold text-slate-700"> Saignement nasal </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.nasalDischarge} />
				<span class="text-sm font-bold text-slate-700"> Écoulement nasal </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.throatPain} />
				<span class="text-sm font-bold text-slate-700"> Douleur de gorge </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.throatDiscomfort} />
				<span class="text-sm font-bold text-slate-700"> Gêne pharyngée </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.recurrentThroatInfections} />
				<span class="text-sm font-bold text-slate-700"> Infections récurrentes </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.dysphagia} />
				<span class="text-sm font-bold text-slate-700"> Difficulté à avaler </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.voiceModification} />
				<span class="text-sm font-bold text-slate-700"> Modification de la voix </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.aphonia} />
				<span class="text-sm font-bold text-slate-700"> Extinction de voix </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.hoarseness} />
				<span class="text-sm font-bold text-slate-700"> Enrouement </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.snoring} />
				<span class="text-sm font-bold text-slate-700"> Ronflement </span>
			</label>

			<label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
				<input type="checkbox" bind:checked={form.suspectedSleepApnea} />
				<span class="text-sm font-bold text-slate-700"> Suspicion d’apnée du sommeil </span>
			</label>
		</div>

		<div class="max-w-md">
			<label for="smell-status" class="mb-2 block text-sm font-bold text-slate-700"> Odorat </label>

			<select
				id="smell-status"
				bind:value={form.smellStatus}
				class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
			>
				<option value="">Sélectionner</option>
				<option value="NORMAL">Normal</option>
				<option value="REDUCED">Diminué</option>
				<option value="ABSENT">Absent</option>
			</select>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Examen clinique ORL
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Otoscopie, fosses nasales, gorge et larynx
			</h4>
		</div>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<p class="font-black text-slate-900">Oreille droite</p>

				<div class="mt-4 space-y-4">
					<textarea
						bind:value={form.rightEarCanal}
						rows="3"
						placeholder="Conduit auditif"
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"></textarea>

					<textarea
						bind:value={form.rightTympanum}
						rows="3"
						placeholder="Tympan"
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"></textarea>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<p class="font-black text-slate-900">Oreille gauche</p>

				<div class="mt-4 space-y-4">
					<textarea
						bind:value={form.leftEarCanal}
						rows="3"
						placeholder="Conduit auditif"
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"></textarea>

					<textarea
						bind:value={form.leftTympanum}
						rows="3"
						placeholder="Tympan"
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"></textarea>
				</div>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<textarea
				bind:value={form.nasalCavitiesExam}
				rows="4"
				placeholder="Examen des fosses nasales"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.sinusExam}
				rows="4"
				placeholder="Examen des sinus"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.oropharynxExam}
				rows="4"
				placeholder="Examen bucco-pharyngé"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.tonsilsExam}
				rows="4"
				placeholder="Examen des amygdales"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.larynxExam}
				rows="4"
				placeholder="Examen laryngé"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

			<textarea
				bind:value={form.cervicalLymphNodes}
				rows="4"
				placeholder="Ganglions cervicaux"
				class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Examens complémentaires ORL
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Audiométrie, endoscopie et tests vestibulaires
			</h4>
		</div>

		<div class="space-y-6">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Audiométrie</p>
						<p class="mt-1 text-sm text-slate-500">Date, résultat et conclusion.</p>
					</div>

					<button
						type="button"
						onclick={addAudiometry}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each audiometryHistory as item, index (index)}
						<div
							class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[180px_1fr_1fr_48px]"
						>
							<input
								type="date"
								bind:value={item.date}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.result}
								placeholder="Résultat"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.conclusion}
								placeholder="Conclusion"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<button
								type="button"
								onclick={() => removeAudiometry(index)}
								aria-label={`Supprimer l’audiométrie ${index + 1}`}
								class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
							>
								<Trash2 size={17} />
							</button>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Tympanométrie</p>
						<p class="mt-1 text-sm text-slate-500">Date et résultat.</p>
					</div>

					<button
						type="button"
						onclick={addTympanometry}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each tympanometryHistory as item, index (index)}
						<div
							class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[180px_1fr_48px]"
						>
							<input
								type="date"
								bind:value={item.date}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.result}
								placeholder="Résultat"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<button
								type="button"
								onclick={() => removeTympanometry(index)}
								aria-label={`Supprimer la tympanométrie ${index + 1}`}
								class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
							>
								<Trash2 size={17} />
							</button>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid gap-5 xl:grid-cols-2">
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">Endoscopie nasale</p>

						<button
							type="button"
							onclick={addNasalEndoscopy}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="mt-4 space-y-3">
						{#each nasalEndoscopyHistory as item, index (index)}
							<div class="rounded-xl border border-slate-200 bg-white p-4">
								<div class="grid gap-3">
									<input
										type="date"
										bind:value={item.date}
										class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
									/>

									<textarea
										bind:value={item.result}
										rows="3"
										placeholder="Résultat"
										class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

									<button
										type="button"
										onclick={() => removeNasalEndoscopy(index)}
										class="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
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
						<p class="font-black text-slate-900">Fibroscopie</p>

						<button
							type="button"
							onclick={addFibroscopy}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="mt-4 space-y-3">
						{#each fibroscopyHistory as item, index (index)}
							<div class="rounded-xl border border-slate-200 bg-white p-4">
								<div class="grid gap-3">
									<input
										type="date"
										bind:value={item.date}
										class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
									/>

									<textarea
										bind:value={item.result}
										rows="3"
										placeholder="Résultat"
										class="rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>

									<button
										type="button"
										onclick={() => removeFibroscopy(index)}
										class="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
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

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="font-black text-slate-900">Tests vestibulaires</p>

						<p class="mt-1 text-sm text-slate-500">Résultat et conclusion.</p>
					</div>

					<button
						type="button"
						onclick={addVestibularTest}
						class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
					>
						<Plus size={16} />
						Ajouter
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each vestibularTestsHistory as item, index (index)}
						<div
							class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[180px_1fr_1fr_48px]"
						>
							<input
								type="date"
								bind:value={item.date}
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.result}
								placeholder="Résultat"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={item.conclusion}
								placeholder="Conclusion"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<button
								type="button"
								onclick={() => removeVestibularTest(index)}
								aria-label={`Supprimer le test vestibulaire ${index + 1}`}
								class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
							>
								<Trash2 size={17} />
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
</div>
