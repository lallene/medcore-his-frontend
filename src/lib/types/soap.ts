export type ConsultationSOAP = {
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
};

export type UpsertConsultationSOAPPayload = {
	chiefComplaint: string;
	historyOfPresentIllness: string;
	associatedSymptoms: string;
	patientReportedNotes: string;

	generalAppearance: string;
	consciousness: string;
	hydrationStatus: string;
	physicalExamSummary: string;

	primaryDiagnosis: string;
	associatedDiagnoses: string;
	clinicalImpression: string;

	treatmentPlan: string;
	investigationPlan: string;
	followUpPlan: string;
	patientAdvice: string;
	disposition: string;

	userId: number;
};
