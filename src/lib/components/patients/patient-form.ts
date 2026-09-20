import type { CreatePatientPayload, Patient, UpdatePatientPayload } from '$lib/types/patient';

export const PATIENT_EMAIL_MAX_LENGTH = 150;

export type PatientFormValues = {
	nom: string;
	prenoms: string;
	sexe: string;
	dateNaissance: string;
	/** Non-rendered preservation state for full-form PUT (backend Age *int). */
	age: number | null;
	telephone: string;
	email: string;
	quartier: string;
	personneContact: string;
	isAssure: boolean;
	tauxCouverture: number;
	matriculeAssure: string;
};

export function emptyPatientFormValues(): PatientFormValues {
	return {
		nom: '',
		prenoms: '',
		sexe: '',
		dateNaissance: '',
		age: null,
		telephone: '',
		email: '',
		quartier: '',
		personneContact: '',
		isAssure: false,
		tauxCouverture: 0,
		matriculeAssure: ''
	};
}

/** Normalize API date (ISO or yyyy-mm-dd) for <input type="date">. */
export function toDateInputValue(value?: string | null): string {
	if (!value) return '';
	const trimmed = value.trim();
	if (!trimmed) return '';
	return trimmed.slice(0, 10);
}

export function patientToFormValues(patient: Patient): PatientFormValues {
	return {
		nom: patient.nom ?? '',
		prenoms: patient.prenoms ?? '',
		sexe: patient.sexe ?? '',
		dateNaissance: toDateInputValue(patient.dateNaissance),
		age: patient.age ?? null,
		telephone: patient.telephone ?? '',
		email: patient.email ?? '',
		quartier: patient.quartier ?? '',
		personneContact: patient.personneContact ?? '',
		isAssure: Boolean(patient.isAssure),
		tauxCouverture: Number(patient.tauxCouverture ?? 0),
		matriculeAssure: patient.matriculeAssure ?? ''
	};
}

/** Empty-state display for canonical Patient.email (Contact / info blocks). */
export function formatPatientEmailDisplay(email?: string | null): string {
	const trimmed = email?.trim() ?? '';
	return trimmed || '—';
}

export function buildCreatePatientPayload(values: PatientFormValues): CreatePatientPayload {
	const payload: CreatePatientPayload = {
		nom: values.nom.trim(),
		prenoms: values.prenoms.trim(),
		sexe: values.sexe.trim(),
		telephone: values.telephone.trim(),
		quartier: values.quartier.trim() || undefined,
		personneContact: values.personneContact.trim() || undefined,
		isAssure: values.isAssure,
		tauxCouverture: values.tauxCouverture,
		matriculeAssure: values.matriculeAssure.trim() || undefined
	};

	const birth = values.dateNaissance.trim();
	if (birth) {
		payload.dateNaissance = birth;
	}

	// Blank allowed; trim only. Case preserved. Always send so backend receives explicit value.
	payload.email = values.email.trim();

	return payload;
}

/**
 * Full-form update: always includes email so unrelated edits preserve the loaded value
 * and clearing the field sends "" for backend clear semantics.
 */
export function buildUpdatePatientPayload(values: PatientFormValues): UpdatePatientPayload {
	const payload: UpdatePatientPayload = {
		nom: values.nom.trim(),
		prenoms: values.prenoms.trim(),
		sexe: values.sexe.trim(),
		// Always send preserved age (including null). Omitting age clears backend Age.
		age: values.age,
		telephone: values.telephone.trim(),
		email: values.email.trim(),
		quartier: values.quartier.trim(),
		personneContact: values.personneContact.trim(),
		isAssure: values.isAssure,
		tauxCouverture: values.tauxCouverture,
		matriculeAssure: values.matriculeAssure.trim()
	};

	const birth = values.dateNaissance.trim();
	if (birth) {
		payload.dateNaissance = birth;
	}

	return payload;
}
