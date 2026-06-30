export interface Patient {
	id: number;
	numeroDossier: string;
	nom: string;
	prenoms: string;
	telephone: string;
}

export interface CreatePatientPayload {
	nom: string;
	prenoms: string;
	sexe: string;
	telephone: string;
	quartier?: string;
}
