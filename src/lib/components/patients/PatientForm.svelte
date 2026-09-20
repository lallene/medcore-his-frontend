<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';
	import {
		PATIENT_EMAIL_MAX_LENGTH,
		type PatientFormValues
	} from '$lib/components/patients/patient-form';

	interface Props {
		values: PatientFormValues;
		disabled?: boolean;
		idPrefix?: string;
	}

	let { values = $bindable(), disabled = false, idPrefix = 'patient' }: Props = $props();
</script>

<div class="grid gap-4 md:grid-cols-2">
	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-nom">Nom</label>
		<Input
			id="{idPrefix}-nom"
			name="nom"
			bind:value={values.nom}
			{disabled}
			required
			autocomplete="family-name"
			data-testid="qa-patient-nom"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-prenoms">Prénoms</label>
		<Input
			id="{idPrefix}-prenoms"
			name="prenoms"
			bind:value={values.prenoms}
			{disabled}
			autocomplete="given-name"
			data-testid="qa-patient-prenoms"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-sexe">Sexe</label>
		<select
			id="{idPrefix}-sexe"
			name="sexe"
			bind:value={values.sexe}
			{disabled}
			aria-label="Sexe"
			data-testid="qa-patient-sexe"
			class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0E4C92] focus:ring-4 focus:ring-[#0E4C92]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
		>
			<option value="">Non renseigné</option>
			<option value="M">Homme</option>
			<option value="F">Femme</option>
		</select>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-dateNaissance"
			>Date de naissance</label
		>
		<Input
			id="{idPrefix}-dateNaissance"
			name="dateNaissance"
			type="date"
			bind:value={values.dateNaissance}
			{disabled}
			data-testid="qa-patient-date-naissance"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-telephone">Téléphone</label>
		<Input
			id="{idPrefix}-telephone"
			name="telephone"
			type="tel"
			bind:value={values.telephone}
			{disabled}
			autocomplete="tel"
			data-testid="qa-patient-telephone"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-email">Email</label>
		<Input
			id="{idPrefix}-email"
			name="email"
			type="email"
			bind:value={values.email}
			{disabled}
			autocomplete="email"
			maxlength={PATIENT_EMAIL_MAX_LENGTH}
			data-testid="qa-patient-email"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-quartier">Quartier</label>
		<Input
			id="{idPrefix}-quartier"
			name="quartier"
			bind:value={values.quartier}
			{disabled}
			autocomplete="address-level2"
			data-testid="qa-patient-quartier"
		/>
	</div>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-personneContact"
			>Contact d’urgence</label
		>
		<Input
			id="{idPrefix}-personneContact"
			name="personneContact"
			bind:value={values.personneContact}
			{disabled}
			data-testid="qa-patient-personne-contact"
		/>
	</div>
</div>

<div class="mt-6 grid gap-4 md:grid-cols-2">
	<label class="flex items-center gap-3 text-sm font-semibold text-slate-700">
		<input
			type="checkbox"
			bind:checked={values.isAssure}
			{disabled}
			data-testid="qa-patient-is-assure"
			class="h-4 w-4 rounded border-slate-300 text-[#0E4C92] focus:ring-[#0E4C92]"
		/>
		Patient assuré
	</label>

	<div class="space-y-1.5">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-tauxCouverture"
			>Taux de couverture (%)</label
		>
		<input
			id="{idPrefix}-tauxCouverture"
			name="tauxCouverture"
			type="number"
			min="0"
			max="100"
			step="1"
			bind:value={values.tauxCouverture}
			{disabled}
			data-testid="qa-patient-taux-couverture"
			class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0E4C92] focus:ring-4 focus:ring-[#0E4C92]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
		/>
	</div>

	<div class="space-y-1.5 md:col-span-2">
		<label class="text-sm font-semibold text-slate-700" for="{idPrefix}-matriculeAssure"
			>Matricule assuré</label
		>
		<Input
			id="{idPrefix}-matriculeAssure"
			name="matriculeAssure"
			bind:value={values.matriculeAssure}
			{disabled}
			data-testid="qa-patient-matricule"
		/>
	</div>
</div>
