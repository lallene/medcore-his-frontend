export type ConsultationStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export type ConsultationReason = {
	id: number;
	code: string;
	name: string;
	category: string;
	isActive: boolean;
};

export type MedicalExam = {
	id: number;
	code: string;
	name: string;
	category: string;
	isActive: boolean;
};

export type ConsultationVitals = {
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
};

export type PrescriptionPayload = {
	presentationId: number;
	quantity: number;
	duration?: string;
	instructions?: string;
};

export type Consultation = {
	id: number;
	patientId: number;
	doctorName: string;
	service: string;
	status: ConsultationStatus;
	diagnosis: string;
	observations: string;
	treatment: string;
	sickLeaveRequired: boolean;
	sickLeaveDays: number;
	vitals: ConsultationVitals;
	reasons: ConsultationReason[];
	exams: MedicalExam[];
	prescriptions: ConsultationPrescription[];
	hospitalizationRequired: boolean;
	hospitalizationReason: string;
	hospitalizationType: string;
	hospitalizationDuration: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateConsultationPayload = {
	patientId: number;
	doctorName: string;
	service: string;
	reasonIds: number[];
	vitals: ConsultationVitals;
	diagnosis: string;
	observations: string;
	treatment: string;
	sickLeaveRequired: boolean;
	sickLeaveDays: number;
	examIds: number[];
	prescriptions: PrescriptionPayload[];
	hospitalizationRequired: boolean;
	hospitalizationReason: string;
	hospitalizationType: string;
	hospitalizationDuration: number;
};

export type ConsultationPrescription = {
	id: number;
	consultationId: number;
	presentationId: number | null;
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
};