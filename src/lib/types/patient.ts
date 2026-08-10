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
	quartier?: string;
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

export interface PatientListMeta {
	limit: number;
	page: number;
	total: number;
	totalPages: number;
}

export interface PatientListResult {
	data: Patient[];
	meta: PatientListMeta;
}
