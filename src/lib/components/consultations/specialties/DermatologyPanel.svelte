<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		data: Record<string, unknown>;
		onChange: (data: Record<string, unknown>) => void;
	};

	type SkinLesion = {
		onsetDate: string;
		location: string;
		lesionType: string;
		otherLesionType: string;
		lengthCm: number | null;
		widthCm: number | null;
		color: string;
		shape: string;
		multiplicity: string;
		count: number | null;
		painIntensity: number | null;
		itchIntensity: number | null;
		evolution: string;
		description: string;
	};

	type SkinInfection = {
		type: string;
		onsetDate: string;
		treatment: string;
		status: string;
	};

	type DermatologyPhoto = {
		date: string;
		imageReference: string;
		description: string;
		isInitial: boolean;
	};

	let { data, onChange }: Props = $props();

	let form = $state({
		skinAllergies: '',
		eczemaHistory: false,
		eczemaFollowUp: '',
		psoriasisHistory: false,
		psoriasisFollowUp: '',
		acneSeverity: '',
		acneTreatment: '',
		skinCancerHistory: false,
		skinCancerDetails: '',
		visualComparison: '',
		photoConsentStatus: '',
		photoConsentDate: ''
	});

	let lesions = $state<SkinLesion[]>([]);
	let skinInfections = $state<SkinInfection[]>([]);
	let photos = $state<DermatologyPhoto[]>([]);

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

		form.skinAllergies = String(data.skinAllergies ?? '');
		form.eczemaHistory = Boolean(data.eczemaHistory ?? false);
		form.eczemaFollowUp = String(data.eczemaFollowUp ?? '');
		form.psoriasisHistory = Boolean(data.psoriasisHistory ?? false);
		form.psoriasisFollowUp = String(data.psoriasisFollowUp ?? '');
		form.acneSeverity = String(data.acneSeverity ?? '');
		form.acneTreatment = String(data.acneTreatment ?? '');
		form.skinCancerHistory = Boolean(data.skinCancerHistory ?? false);
		form.skinCancerDetails = String(data.skinCancerDetails ?? '');
		form.visualComparison = String(data.visualComparison ?? '');
		form.photoConsentStatus = String(data.photoConsentStatus ?? '');
		form.photoConsentDate = String(data.photoConsentDate ?? '');

		lesions = toArray<SkinLesion>(data.lesions).map((item) => ({
			onsetDate: String(item.onsetDate ?? ''),
			location: String(item.location ?? ''),
			lesionType: String(item.lesionType ?? ''),
			otherLesionType: String(item.otherLesionType ?? ''),
			lengthCm: toNullableNumber(item.lengthCm),
			widthCm: toNullableNumber(item.widthCm),
			color: String(item.color ?? ''),
			shape: String(item.shape ?? ''),
			multiplicity: String(item.multiplicity ?? ''),
			count: toNullableNumber(item.count),
			painIntensity: toNullableNumber(item.painIntensity),
			itchIntensity: toNullableNumber(item.itchIntensity),
			evolution: String(item.evolution ?? ''),
			description: String(item.description ?? '')
		}));

		skinInfections = toArray<SkinInfection>(data.skinInfections);
		photos = toArray<DermatologyPhoto>(data.photos);

		initialized = true;
	});

	$effect(() => {
		if (!initialized) {
			return;
		}

		onChange({
			...form,
			lesions,
			skinInfections,
			photos
		});
	});

	function addLesion() {
		lesions = [
			...lesions,
			{
				onsetDate: '',
				location: '',
				lesionType: '',
				otherLesionType: '',
				lengthCm: null,
				widthCm: null,
				color: '',
				shape: '',
				multiplicity: '',
				count: null,
				painIntensity: null,
				itchIntensity: null,
				evolution: '',
				description: ''
			}
		];
	}

	function removeLesion(index: number) {
		lesions = lesions.filter((_, itemIndex) => itemIndex !== index);
	}

	function addSkinInfection() {
		skinInfections = [
			...skinInfections,
			{
				type: '',
				onsetDate: '',
				treatment: '',
				status: ''
			}
		];
	}

	function removeSkinInfection(index: number) {
		skinInfections = skinInfections.filter((_, itemIndex) => itemIndex !== index);
	}

	function addPhoto(isInitial = false) {
		photos = [
			...photos,
			{
				date: '',
				imageReference: '',
				description: '',
				isInitial
			}
		];
	}

	function removePhoto(index: number) {
		photos = photos.filter((_, itemIndex) => itemIndex !== index);
	}
</script>

<div class="space-y-8">
	<section class="space-y-5">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Lésions cutanées
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Description et évolution des lésions</h4>
			</div>

			<button
				type="button"
				onclick={addLesion}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
			>
				<Plus size={16} />
				Ajouter une lésion
			</button>
		</div>

		<div class="space-y-4">
			{#each lesions as lesion, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<p class="font-black text-slate-900">
							Lésion #{index + 1}
						</p>

						<button
							type="button"
							onclick={() => removeLesion(index)}
							aria-label={`Supprimer la lésion ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div>
							<label
								for={`lesion-onset-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Date d’apparition
							</label>

							<input
								id={`lesion-onset-${index}`}
								type="date"
								bind:value={lesion.onsetDate}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-location-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Localisation
							</label>

							<input
								id={`lesion-location-${index}`}
								type="text"
								bind:value={lesion.location}
								placeholder="Zone du corps"
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-type-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Type de lésion
							</label>

							<select
								id={`lesion-type-${index}`}
								bind:value={lesion.lesionType}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							>
								<option value="">Sélectionner</option>
								<option value="PLAQUE">Plaque</option>
								<option value="PAPULE">Bouton / papule</option>
								<option value="ULCER">Ulcère</option>
								<option value="NODULE">Nodule</option>
								<option value="VESICLE">Vésicule</option>
								<option value="PUSTULE">Pustule</option>
								<option value="OTHER">Autre</option>
							</select>
						</div>

						<div>
							<label
								for={`lesion-other-type-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Autre type
							</label>

							<input
								id={`lesion-other-type-${index}`}
								type="text"
								bind:value={lesion.otherLesionType}
								disabled={lesion.lesionType !== 'OTHER'}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
							/>
						</div>

						<div>
							<label
								for={`lesion-length-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Longueur
							</label>

							<input
								id={`lesion-length-${index}`}
								type="number"
								min="0"
								step="0.1"
								bind:value={lesion.lengthCm}
								placeholder="cm"
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-width-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Largeur
							</label>

							<input
								id={`lesion-width-${index}`}
								type="number"
								min="0"
								step="0.1"
								bind:value={lesion.widthCm}
								placeholder="cm"
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-color-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Couleur
							</label>

							<input
								id={`lesion-color-${index}`}
								type="text"
								bind:value={lesion.color}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-shape-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Forme
							</label>

							<input
								id={`lesion-shape-${index}`}
								type="text"
								bind:value={lesion.shape}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-multiplicity-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Nombre
							</label>

							<select
								id={`lesion-multiplicity-${index}`}
								bind:value={lesion.multiplicity}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							>
								<option value="">Sélectionner</option>
								<option value="SINGLE">Unique</option>
								<option value="MULTIPLE">Multiple</option>
							</select>
						</div>

						<div>
							<label
								for={`lesion-count-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Nombre de lésions
							</label>

							<input
								id={`lesion-count-${index}`}
								type="number"
								min="1"
								bind:value={lesion.count}
								disabled={lesion.multiplicity !== 'MULTIPLE'}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
							/>
						</div>

						<div>
							<label
								for={`lesion-pain-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Douleur /10
							</label>

							<input
								id={`lesion-pain-${index}`}
								type="number"
								min="0"
								max="10"
								bind:value={lesion.painIntensity}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-itch-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Démangeaison /10
							</label>

							<input
								id={`lesion-itch-${index}`}
								type="number"
								min="0"
								max="10"
								bind:value={lesion.itchIntensity}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							/>
						</div>

						<div>
							<label
								for={`lesion-evolution-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Évolution
							</label>

							<select
								id={`lesion-evolution-${index}`}
								bind:value={lesion.evolution}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							>
								<option value="">Sélectionner</option>
								<option value="STABLE">Stable</option>
								<option value="IMPROVING">Amélioration</option>
								<option value="WORSENING">Aggravation</option>
								<option value="RECURRENT">Récidivante</option>
							</select>
						</div>

						<div class="md:col-span-2 xl:col-span-4">
							<label
								for={`lesion-description-${index}`}
								class="mb-2 block text-sm font-bold text-slate-700"
							>
								Description clinique
							</label>

							<textarea
								id={`lesion-description-${index}`}
								bind:value={lesion.description}
								rows="4"
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
							></textarea>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Antécédents dermatologiques
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">
				Allergies, eczéma, psoriasis, acné et cancer cutané
			</h4>
		</div>

		<div>
			<label for="skin-allergies" class="mb-2 block text-sm font-bold text-slate-700">
				Allergies cutanées
			</label>

			<textarea
				id="skin-allergies"
				bind:value={form.skinAllergies}
				rows="3"
				placeholder="Type d’allergie, réaction, produit suspecté"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={form.eczemaHistory} />
					<span class="text-sm font-black text-slate-800"> Antécédent d’eczéma </span>
				</label>

				<textarea
					bind:value={form.eczemaFollowUp}
					disabled={!form.eczemaHistory}
					rows="3"
					placeholder="Suivi, localisation et traitements"
					class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				></textarea>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={form.psoriasisHistory} />
					<span class="text-sm font-black text-slate-800"> Antécédent de psoriasis </span>
				</label>

				<textarea
					bind:value={form.psoriasisFollowUp}
					disabled={!form.psoriasisHistory}
					rows="3"
					placeholder="Suivi et traitements"
					class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
				></textarea>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			<div>
				<label for="acne-severity" class="mb-2 block text-sm font-bold text-slate-700">
					Niveau d’acné
				</label>

				<select
					id="acne-severity"
					bind:value={form.acneSeverity}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="NONE">Absente</option>
					<option value="MILD">Légère</option>
					<option value="MODERATE">Modérée</option>
					<option value="SEVERE">Sévère</option>
				</select>
			</div>

			<div>
				<label for="acne-treatment" class="mb-2 block text-sm font-bold text-slate-700">
					Traitement de l’acné
				</label>

				<input
					id="acne-treatment"
					type="text"
					bind:value={form.acneTreatment}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<label class="flex items-center gap-3">
				<input type="checkbox" bind:checked={form.skinCancerHistory} />
				<span class="text-sm font-black text-slate-800"> Antécédent de cancer cutané </span>
			</label>

			<textarea
				bind:value={form.skinCancerDetails}
				disabled={!form.skinCancerHistory}
				rows="3"
				placeholder="Type, localisation, date et prise en charge"
				class="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
			></textarea>
		</div>
	</section>

	<section class="space-y-5 border-t border-slate-200 pt-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
					Infections cutanées
				</p>

				<h4 class="mt-1 text-lg font-black text-slate-900">Type, traitement et évolution</h4>
			</div>

			<button
				type="button"
				onclick={addSkinInfection}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
			>
				<Plus size={16} />
				Ajouter une infection
			</button>
		</div>

		<div class="space-y-3">
			{#each skinInfections as item, index (index)}
				<div
					class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_180px_1fr_180px_48px]"
				>
					<input
						type="text"
						bind:value={item.type}
						placeholder="Type d’infection"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="date"
						bind:value={item.onsetDate}
						aria-label={`Date de l’infection ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<input
						type="text"
						bind:value={item.treatment}
						placeholder="Traitement"
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					/>

					<select
						bind:value={item.status}
						aria-label={`Statut de l’infection ${index + 1}`}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
					>
						<option value="">Statut</option>
						<option value="ACTIVE">Active</option>
						<option value="IMPROVING">En amélioration</option>
						<option value="RESOLVED">Guérie</option>
						<option value="RECURRENT">Récidivante</option>
					</select>

					<button
						type="button"
						onclick={() => removeSkinInfection(index)}
						aria-label={`Supprimer l’infection ${index + 1}`}
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
			<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
				Suivi photographique
			</p>

			<h4 class="mt-1 text-lg font-black text-slate-900">Photos initiales et images de suivi</h4>
		</div>

		<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
			<div>
				<label for="photo-consent-status" class="mb-2 block text-sm font-bold text-slate-700">
					Consentement photo
				</label>

				<select
					id="photo-consent-status"
					bind:value={form.photoConsentStatus}
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
				>
					<option value="">Sélectionner</option>
					<option value="PENDING">En attente</option>
					<option value="GRANTED">Accordé</option>
					<option value="REFUSED">Refusé</option>
					<option value="REVOKED">Retiré</option>
				</select>
			</div>

			<div>
				<label for="photo-consent-date" class="mb-2 block text-sm font-bold text-slate-700">
					Date du consentement
				</label>

				<input
					id="photo-consent-date"
					type="date"
					bind:value={form.photoConsentDate}
					class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
				/>
			</div>

			<div class="flex items-end gap-3">
				<button
					type="button"
					onclick={() => addPhoto(true)}
					disabled={form.photoConsentStatus !== 'GRANTED'}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Plus size={16} />
					Photo initiale
				</button>

				<button
					type="button"
					onclick={() => addPhoto(false)}
					disabled={form.photoConsentStatus !== 'GRANTED'}
					class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Plus size={16} />
					Photo de suivi
				</button>
			</div>
		</div>

		<div class="space-y-4">
			{#each photos as photo, index (index)}
				<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="font-black text-slate-900">
								{photo.isInitial ? 'Photo initiale' : `Photo de suivi #${index + 1}`}
							</p>
						</div>

						<button
							type="button"
							onclick={() => removePhoto(index)}
							aria-label={`Supprimer la photo ${index + 1}`}
							class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
						>
							<Trash2 size={17} />
						</button>
					</div>

					<div class="mt-4 grid gap-4 md:grid-cols-2">
						<input
							type="date"
							bind:value={photo.date}
							aria-label={`Date de la photo ${index + 1}`}
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={photo.imageReference}
							placeholder="Référence ou URL de l’image"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						/>

						<textarea
							bind:value={photo.description}
							rows="3"
							placeholder="Description"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
						></textarea>
					</div>
				</article>
			{/each}
		</div>

		<div>
			<label for="visual-comparison" class="mb-2 block text-sm font-bold text-slate-700">
				Comparaison et évolution visuelle
			</label>

			<textarea
				id="visual-comparison"
				bind:value={form.visualComparison}
				rows="4"
				class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"></textarea>
		</div>
	</section>
</div>
