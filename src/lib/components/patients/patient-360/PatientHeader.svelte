<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import type { Patient } from '$lib/types/patient';

	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		patient: Patient;
	}

	let { patient }: Props = $props();

	const fullName = $derived(
		`${patient.nom ?? ''} ${patient.prenoms ?? ''}`.trim() || 'Patient sans identité'
	);

	function formatSex(value?: string | null): string {
		const normalized = value?.trim().toUpperCase();

		switch (normalized) {
			case 'M':
				return 'Homme';

			case 'F':
				return 'Femme';

			default:
				return 'Non renseigné';
		}
	}

	function calculateAgeInMonths(value?: string | null): number | null {
		if (!value) {
			return null;
		}

		const birthDate = new Date(value);

		if (Number.isNaN(birthDate.getTime())) {
			return null;
		}

		const today = new Date();

		let months =
			(today.getFullYear() - birthDate.getFullYear()) * 12 +
			today.getMonth() -
			birthDate.getMonth();

		if (today.getDate() < birthDate.getDate()) {
			months--;
		}

		return Math.max(0, months);
	}

	function formatAge(): string {
		const age = patient.age;

		if (age === null || age === undefined) {
			return 'Âge non renseigné';
		}

		if (age > 0) {
			return `${age} an${age > 1 ? 's' : ''}`;
		}

		const months = calculateAgeInMonths(patient.dateNaissance);

		if (months === null) {
			return 'Moins d’un an';
		}

		if (months === 0) {
			return 'Nouveau-né';
		}

		return `${months} mois`;
	}

	function patientCode(): string {
		const code = patient.codePatient?.trim();

		if (code) {
			return code;
		}

		return `P${String(patient.id).padStart(5, '0')}`;
	}
</script>

<section
	class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
>
	<div
		class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
	></div>

	<div
		class="pointer-events-none absolute bottom-4 right-10 text-[140px] font-black leading-none text-white/5"
	>
		PAT
	</div>

	<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
			<div class="w-fit rounded-3xl bg-white/15 p-3 backdrop-blur">
				<Avatar name={fullName} />
			</div>

			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Patient 360°</p>

				<div class="mt-3 flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-bold leading-tight sm:text-4xl">
						{fullName}
					</h1>

					<Badge variant="success">Actif</Badge>

					{#if patient.isAssure}
						<span
							class="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide backdrop-blur"
						>
							Assuré
						</span>
					{:else}
						<span
							class="rounded-full border border-amber-200/30 bg-amber-400/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-50 backdrop-blur"
						>
							Non assuré
						</span>
					{/if}
				</div>

				<p class="mt-3 text-lg text-blue-50">
					Dossier {patient.numeroDossier || `#${patient.id}`}
					·
					{patient.telephone || 'Téléphone non renseigné'}
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						👤 {formatSex(patient.sexe)}
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🎂 {formatAge()}
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						📁 {patientCode()}
					</span>

					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🩺 Parcours médical
					</span>
				</div>
			</div>
		</div>

		<Button variant="secondary" onclick={() => goto(resolve('/patients'))}>
			Retour aux patients
		</Button>
	</div>
</section>
