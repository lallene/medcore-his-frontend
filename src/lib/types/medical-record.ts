export type MedicalRecord = {
	id: number;
	patient_id: number;
	record_number: string;
	status: string;
	created_at: string;
	updated_at: string;
};

export type MedicalAlert = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	type: string;
	title: string;
	description: string;
	severity: string;
	is_active: boolean;
	created_by: number;
	created_at: string;
	updated_at: string;
};

export type Allergy = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	allergen_type: string;
	allergen_name: string;
	reaction: string;
	severity: string;
	comment: string;
	is_active: boolean;
	created_by: number;
	created_at: string;
	updated_at: string;
};

export type MedicalHistory = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	type: string;
	title: string;
	description: string;
	start_date: string | null;
	end_date: string | null;
	status: string;
	severity: string;
	comment: string;
	created_by: number;
	created_at: string;
	updated_at: string;
};

export type VitalSign = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	consultation_id: number | null;
	weight_kg: number | null;
	height_cm: number | null;
	bmi: number | null;
	temperature_c: number | null;
	systolic_bp: number | null;
	diastolic_bp: number | null;
	heart_rate: number | null;
	respiratory_rate: number | null;
	oxygen_saturation: number | null;
	blood_glucose: number | null;
	waist_circumference_cm: number | null;
	pain_score: number | null;
	comment: string;
	measured_by: number;
	measured_at: string;
	created_at: string;
	updated_at: string;
};

export type MedicalTimelineEvent = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	event_type: string;
	category: string;
	title: string;
	description: string;
	department_id: number | null;
	reference_type: string;
	reference_id: number | null;
	severity: string;
	event_date: string;
	created_by: number;
	created_at: string;
};

export type PatientMedicalSummary = {
	medical_record: MedicalRecord;
	alerts: MedicalAlert[];
	allergies: Allergy[];
	medical_histories: MedicalHistory[];
	last_vital_signs: VitalSign | null;
	timeline: MedicalTimelineEvent[];
};
