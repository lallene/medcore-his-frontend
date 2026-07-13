export type PatientSummaryPatient = {
	id: number;
	code_patient: string;
	numero_dossier: string;
	last_name: string;
	first_names: string;
	sex: string;
	birth_date: string | null;
	age: number | null;
	phone: string;
	address: string;
	is_insured: boolean;
	coverage_rate: number;
	insurance_number: string;
	blood_group: string;
	rhesus: string;
	insurance_name: string;
	mutual_name: string;
	photo_url: string;
};

export type PatientSummaryMedicalRecord = {
	id: number;
	record_number: string;
	status: string;
	active_allergies: number;
	chronic_diseases: number;
	current_treatments: number;
};

export type PatientSummaryAllergy = {
	id: number;
	name: string;
	type: string;
	reaction: string;
	severity: string;
	is_high_risk: boolean;
};

export type PatientSummaryChronicDisease = {
	id: number;
	name: string;
	severity: string;
	diagnosed_at: string | null;
};

export type PatientSummaryTreatment = {
	id: number;
	medication_name: string;
	dosage: string;
	frequency: string;
	start_date: string | null;
	prescriber: string;
};

export type PatientSummaryVitals = {
	id: number;
	measured_at: string;
	weight_kg: number | null;
	height_cm: number | null;
	bmi: number | null;
	systolic_bp: number | null;
	diastolic_bp: number | null;
	heart_rate: number | null;
	temperature: number | null;
	respiratory_rate: number | null;
	oxygen_saturation: number | null;
	blood_glucose: number | null;
	pain_score: number | null;
	waist_circumference_cm: number | null;
};

export type PatientSummaryConsultation = {
	id: number;
	date: string;
	service: string;
	doctor_name: string;
	diagnosis: string;
	status: string;
};

export type PatientClinicalAlert = {
	severity: string;
	code: string;
	title: string;
	description: string;
	source: string;
};

export type PatientSummaryStatistics = {
	consultations: number;
	hospitalizations: number;
	prescriptions: number;
	exams: number;
	documents: number;
};

export type PatientSummary = {
	patient: PatientSummaryPatient;
	medical_record: PatientSummaryMedicalRecord;
	allergies: PatientSummaryAllergy[];
	chronic_diseases: PatientSummaryChronicDisease[];
	active_treatments: PatientSummaryTreatment[];
	last_vitals: PatientSummaryVitals | null;
	last_consultation: PatientSummaryConsultation | null;
	clinical_alerts: PatientClinicalAlert[];
	statistics: PatientSummaryStatistics;
};
