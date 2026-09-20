export interface Patient {
	id: number;
	codePatient: string;
	numeroDossier: string;
	nom: string;
	prenoms: string;
	sexe: string;
	dateNaissance?: string | null;
	age?: number | null;
	telephone: string;
	/** Canonical contact email from Patient.Email (backend JSON "email"). */
	email?: string;
	quartier?: string;
	personneContact?: string;
	isAssure: boolean;
	tauxCouverture: number;
	matriculeAssure?: string;
}

export interface CreatePatientPayload {
	nom: string;
	prenoms: string;
	sexe: string;
	telephone: string;
	dateNaissance?: string;
	email?: string;
	quartier?: string;
	personneContact?: string;
	isAssure?: boolean;
	tauxCouverture?: number;
	matriculeAssure?: string;
}

/**
 * Full-form PUT body for patient edit.
 * For email: always send the form value ("" clears; non-empty replaces).
 * Omitting email is reserved for partial clients and is not used by the full edit form.
 */
export interface UpdatePatientPayload {
	nom: string;
	prenoms: string;
	sexe: string;
	dateNaissance?: string;
	/**
	 * Preserved on full-form PUT. Backend assigns patient.Age = req.Age;
	 * omitting age decodes as nil and clears the stored value.
	 */
	age?: number | null;
	telephone: string;
	email?: string;
	quartier?: string;
	personneContact?: string;
	isAssure: boolean;
	tauxCouverture: number;
	matriculeAssure?: string;
}

export interface PatientListMeta {
	limit: number;
	page: number;
	total: number;
	totalPages: number;
}

export interface PatientListResponse {
	data: Patient[];
	meta: PatientListMeta;
}

export interface PatientListResult {
	data: Patient[];
	meta: PatientListMeta;
}
