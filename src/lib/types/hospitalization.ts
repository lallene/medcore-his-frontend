export type HospitalizationStatus = 'PLANNED' | 'ADMITTED' | 'DISCHARGED' | 'CANCELLED';

export interface Hospitalization {
	id: number;
	patientId: number;
	medicalRecordId: number;
	sourceConsultationId: number;
	admissionNumber: string;
	hospitalizationType: string;
	admissionReason: string;
	admissionDiagnosis: string;
	department: string;
	status: HospitalizationStatus;
	admittedAt: string | null;
	expectedDischargeAt: string | null;
	dischargedAt: string | null;
	dischargeDiagnosis: string;
	dischargeSummary: string;
	createdBy: number | null;
	updatedBy: number | null;
	createdAt: string;
	updatedAt: string;
	patient: { id: number; nom: string; prenoms: string; codePatient: string; numeroDossier: string };
	sourceConsultation: { id: number; service: string; doctorName: string; diagnosis: string };
}

export interface HospitalizationListMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface HospitalizationListResult {
	data: Hospitalization[];
	meta: HospitalizationListMeta;
}
export interface HospitalizationFilters {
	page?: number;
	limit?: number;
	patientId?: number;
	status?: HospitalizationStatus | '';
	department?: string;
	from?: string;
	to?: string;
}
export interface CreateHospitalizationPayload {
	patientId: number;
	sourceConsultationId: number;
	admissionDiagnosis?: string;
	expectedDischargeAt?: string;
}

export type HospitalizationAction = 'admit' | 'discharge' | 'cancel';
