export type SpecialtyCode =
	| 'GENERAL_MEDICINE'
	| 'GYNECO_OBSTETRICS'
	| 'PEDIATRICS'
	| 'ENT'
	| 'MATERNITY'
	| 'GENERAL_SURGERY'
	| 'CARDIOLOGY'
	| 'GASTROENTEROLOGY'
	| 'DIABETOLOGY'
	| 'DERMATOLOGY'
	| 'DENTISTRY'
	| 'ULTRASOUND'
	| 'LABORATORY'
	| 'EMERGENCY';

export type ConsultationSpecialtyResponse = {
	id: number;
	consultation_id: number;
	specialty_code: SpecialtyCode;
	data: Record<string, unknown>;
	created_by: number;
	updated_by: number;
	created_at: string;
	updated_at: string;
};

export type UpsertConsultationSpecialtyPayload = {
	specialtyCode: SpecialtyCode;
	data: Record<string, unknown>;
	userId: number;
};

export type SpecialtyOption = {
	code: SpecialtyCode;
	label: string;
	description: string;
};

export type ConsultationSpecialty = {
	id: number;
	consultation_id: number;
	specialty_code: SpecialtyCode;
	data: Record<string, unknown>;
	created_by: number;
	updated_by: number;
	created_at: string;
	updated_at: string;
};

export type SaveConsultationSpecialtyPayload = {
	specialtyCode: SpecialtyCode;
	data: Record<string, unknown>;
	userId?: number;
};
