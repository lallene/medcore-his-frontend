import { api } from '$lib/api/client';

export type ConsultationStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface ConsultationVitals {
	id: number;
	consultationId: number;
	temperature?: number | null;
	bloodPressureSystolic?: number | null;
	bloodPressureDiastolic?: number | null;
	heartRate?: number | null;
	respiratoryRate?: number | null;
	oxygenSaturation?: number | null;
	weight?: number | null;
	height?: number | null;
	bloodGlucose?: number | null;
	painScore?: number | null;
}

export interface ConsultationReason {
	id: number;
	code: string;
	name: string;
	category: string;
	isActive: boolean;
}

export interface ConsultationExam {
	id: number;
	code: string;
	name: string;
	category: string;
	isActive: boolean;
}

export interface ConsultationPrescription {
	id: number;
	consultationId: number;
	presentationId?: number | null;
	medicationName: string;
	dosage: string;
	form: string;
	route: string;
	quantity: number;
	frequency: string;
	duration: string;
	instructions: string;
	createdAt: string;
	updatedAt: string;
}

export interface PatientConsultation {
	id: number;
	patientId: number;

	doctorName: string;
	service: string;
	status: ConsultationStatus;

	startedAt?: string | null;
	completedAt?: string | null;
	cancelledAt?: string | null;
	cancellationReason: string;

	diagnosis: string;
	observations: string;
	treatment: string;

	sickLeaveRequired: boolean;
	sickLeaveDays: number;
	sickLeaveStartDate?: string | null;
	sickLeaveEndDate?: string | null;

	vitals: ConsultationVitals;
	reasons: ConsultationReason[];
	exams: ConsultationExam[];
	prescriptions: ConsultationPrescription[];

	hospitalizationRequired: boolean;
	hospitalizationReason: string;
	hospitalizationType: string;
	hospitalizationDuration: number;

	createdAt: string;
	updatedAt: string;

	antecedent: ConsultationAntecedent;
	physicalExams: ConsultationPhysicalExam[];
	administeredTreatments: ConsultationAdministeredTreatment[];
	previousMedications: ConsultationPreviousMedication[];
	surgicalHistories: ConsultationSurgicalHistory[];
	gynecoObstetricHistories: ConsultationGynecoObstetricHistory[];

	specialty_data?: ConsultationSpecialtyData | null;
	soap?: ConsultationSOAP | null;
}

export interface ConsultationAntecedent {
	id: number;
	consultationId: number;
	previousMedication: string;
	hasHta?: boolean | null;
	hasDiabetes?: boolean | null;
	otherMedical: string;
	surgicalHistory: string;
	gynecoObstetricHistory: string;
	ddr: string;
	pregnancyOngoing?: boolean | null;
	tobacco?: boolean | null;
	alcohol?: boolean | null;
	visitType: string;
	createdAt: string;
	updatedAt: string;
}

export interface PhysicalExamArea {
	id: number;
	code: string;
	category: string;
	name: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationPhysicalExam {
	id: number;
	consultationId: number;
	areaId: number;
	area: PhysicalExamArea;
	observation: string;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationAdministeredTreatment {
	id: number;
	consultationId: number;
	presentationId?: number | null;
	medicationName: string;
	dosage: string;
	form: string;
	route: string;
	quantity: number;
	instructions: string;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationPreviousMedication {
	id: number;
	consultationId: number;
	presentationId?: number | null;
	medicationName: string;
	dosage: string;
	form: string;
	route: string;
	instructions: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationSurgicalHistory {
	id: number;
	consultationId: number;
	procedureName: string;
	procedureDate: string;
	indication: string;
	complications: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationGynecoObstetricHistory {
	id: number;
	consultationId: number;
	eventType: string;
	eventDate: string;
	outcome: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

export interface ConsultationSOAP {
	id: number;
	consultation_id: number;

	chief_complaint: string;
	history_of_present_illness: string;
	associated_symptoms: string;
	patient_reported_notes: string;

	general_appearance: string;
	consciousness: string;
	hydration_status: string;
	physical_exam_summary: string;

	primary_diagnosis: string;
	associated_diagnoses: string;
	clinical_impression: string;

	treatment_plan: string;
	investigation_plan: string;
	follow_up_plan: string;
	patient_advice: string;
	disposition: string;

	created_by: number;
	updated_by: number;
	created_at: string;
	updated_at: string;
}

export interface ConsultationSpecialtyData {
	id: number;
	consultation_id: number;
	specialty_code: string;
	data: string;
	created_by: number;
	updated_by: number;
	created_at: string;
	updated_at: string;
}

export async function getPatientConsultations(patientId: number): Promise<PatientConsultation[]> {
	const response = await api.get<PatientConsultation[]>(`/api/patients/${patientId}/consultations`);

	return response.data;
}
