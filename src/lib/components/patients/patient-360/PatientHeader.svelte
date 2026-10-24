<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import type { Patient } from '$lib/types/patient';
	import type { PatientInsuranceView } from '$lib/types/insurance';
	import { patientInsuranceBadge } from './patient-360-data';

	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		patient: Patient;
		insurance: PatientInsuranceView;
	}

	let { patient, insurance }: Props = $props();
	const insuranceBadge = $derived(patientInsuranceBadge(insurance));

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

<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
	<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
			<div class="w-fit">
				<Avatar name={fullName} />
			</div>

			<div>
				<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">Patient 360°</p>

				<div class="mt-1.5 flex flex-wrap items-center gap-3">
					<h1
						class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
						data-testid="patient-360-header-name"
					>
						{fullName}
					</h1>

					<Badge variant="success">Actif</Badge>

					{#if insurance.insured}
						<span
							class="rounded-md border border-primary-border bg-primary-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-primary"
							title={insuranceBadge.detail}
						>
							{insuranceBadge.label}
							{#if insuranceBadge.detail}<span class="ml-1 normal-case"
									>· {insuranceBadge.detail}</span
								>{/if}
						</span>
					{:else}
						<span
							class="rounded-md border border-warning-border bg-warning-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-warning-strong"
						>
							{insuranceBadge.label}
						</span>
					{/if}
				</div>

				<p class="mt-1.5 text-sm text-muted-foreground">
					Dossier {patient.numeroDossier || `#${patient.id}`}
					·
					{patient.telephone || 'Téléphone non renseigné'}
				</p>

				<div class="mt-4 flex flex-wrap gap-2">
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{formatSex(patient.sexe)}
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{formatAge()}
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						data-testid="patient-360-header-code"
					>
						{patientCode()}
					</span>

					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						Parcours médical
					</span>
				</div>
			</div>
		</div>

		<Button variant="secondary" onclick={() => goto(resolve('/patients'))}>
			Retour aux patients
		</Button>
	</div>
</section>
