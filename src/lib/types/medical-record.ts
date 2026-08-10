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
	patient_id: number;
	medical_record: MedicalRecord;
	alerts: MedicalAlert[];
	allergies: Allergy[];
	medical_histories: MedicalHistory[];
	last_vital_signs: VitalSign | null;
	timeline: MedicalTimelineEvent[];
	recent_consultations: MedicalSummaryConsultation[];
	documents: MedicalSummaryDocument[];
};

export type MedicalSummaryConsultation = {
	id: number;
	patient_id: number;
	doctor_name: string;
	service: string;
	status: string;
	diagnosis: string;
	observations: string;
	treatment: string;
	created_at: string;
};

export type MedicalSummaryDocument = {
	consultation_id: number;
	type: string;
	label: string;
	url: string;
};

export type MedicalRecordStatus = 'ACTIVE' | 'ARCHIVED' | 'CLOSED';

export type MedicalRecordAllergy = {
	id?: number;
	category: string;
	name: string;
	reaction: string;
	severity: string;
	diagnosedAt: string;
	notes: string;
	isActive: boolean;
};

export type MedicalHistoryItem = {
	id?: number;
	disease: string;
	historyType: string;
	diagnosedAt: string;
	resolvedAt: string;
	status: string;
	severity: string;
	description: string;
	comment: string;
	notes: string;
};

export type SurgicalHistoryItem = {
	id?: number;
	procedureName: string;
	procedureDate: string;
	facility: string;
	indication: string;
	complications: string;
	notes: string;
};

export type FamilyHistoryItem = {
	id?: number;
	relationship: string;
	disease: string;
	ageAtDiagnosis: number | null;
	notes: string;
};

export type UsualTreatmentItem = {
	id?: number;
	medicationName: string;
	dosage: string;
	frequency: string;
	startDate: string;
	endDate: string;
	prescriber: string;
	status: string;
	isActive: boolean;
	notes: string;
};

export type VaccinationItem = {
	id?: number;
	vaccineName: string;
	dose: string;
	administeredDate: string;
	nextReminderDate: string;
	status: string;
	batchNumber: string;
	center: string;
};

export type DisabilityItem = {
	id?: number;
	type: string;
	level: string;
	specialNeeds: string;
	notes: string;
};

export type MedicalDeviceItem = {
	id?: number;
	type: string;
	name: string;
	reference: string;
	implantationDate: string;
	manufacturer: string;
	notes: string;
	isActive: boolean;
};

export type VitalRecord = {
	id?: number;
	consultationId: number | null;
	measuredAt: string;
	weightKg: number | null;
	heightCm: number | null;
	bmi: number | null;
	temperature: number | null;
	bloodPressureSystolic: number | null;
	bloodPressureDiastolic: number | null;
	heartRate: number | null;
	respiratoryRate: number | null;
	oxygenSaturation: number | null;
	bloodGlucose: number | null;
	waistCircumferenceCm: number | null;
	painScore: number | null;
	painLocation: string;
	painType: string;
	painDuration: string;
	measuredBy: string;
	comment: string;
};

export type MedicalDocument = {
	id?: number;
	consultationId: number | null;
	type: string;
	title: string;
	documentDate: string | null;
	fileReference: string;
	fileName: string;
	mimeType: string;
	description: string;
	uploadedBy: string;
};

export type EmergencyContact = {
	lastName: string;
	firstNames: string;
	relationship: string;
	phone: string;
	email: string;
	address: string;
};

export type LegalGuardian = {
	lastName: string;
	firstNames: string;
	relationship: string;
	phone: string;
	email: string;
	address: string;
};

export type MedicalCoverage = {
	isInsured: boolean;
	insuranceName: string;
	mutualName: string;
	insuredNumber: string;
	coverageOrganization: string;
	coverageRate: number | null;
};

export type Lifestyle = {
	smokingStatus: string;
	cigarettesPerDay: number | null;
	alcoholStatus: string;
	physicalActivityLevel: string;
	dietDescription: string;
	notes: string;
};

export type CommonMedicalRecord = {
	id?: number;
	patientId: number;
	recordNumber: string;
	createdAt: string;
	facilityName: string;
	status: MedicalRecordStatus;
	lastName: string;
	firstNames: string;
	birthDate: string | null;
	age: number | null;
	sex: string;
	photoReference: string;
	address: string;
	phone: string;
	email: string;
	maritalStatus: string;
	profession: string;
	isMinor: boolean;
	emergencyContact: EmergencyContact;
	legalGuardian: LegalGuardian;
	medicalCoverage: MedicalCoverage;
	bloodGroup: string;
	rhesus: string;
	lifestyle: Lifestyle;
	allergies: MedicalRecordAllergy[];
	medicalHistories: MedicalHistoryItem[];
	surgicalHistories: SurgicalHistoryItem[];
	familyHistories: FamilyHistoryItem[];
	usualTreatments: UsualTreatmentItem[];
	vaccinations: VaccinationItem[];
	disabilities: DisabilityItem[];
	medicalDevices: MedicalDeviceItem[];
	vitalsHistory: VitalRecord[];
	documents: MedicalDocument[];
	updatedAt: string;
};

export type MedicalRecordCollectionKey =
	| 'allergies'
	| 'medicalHistories'
	| 'surgicalHistories'
	| 'familyHistories'
	| 'usualTreatments'
	| 'vaccinations'
	| 'disabilities'
	| 'medicalDevices'
	| 'vitalsHistory'
	| 'documents';

export type MedicalRecordDeletedIDs = Record<MedicalRecordCollectionKey, number[]>;

export type PatchCollection<T extends object> = {
	upsert: T[];
	delete_ids: number[];
};

export type MedicalRecordPatchValue = string | number | boolean | null;
export type MedicalRecordPatchItem = Record<string, MedicalRecordPatchValue>;

export type UpdateCommonMedicalRecordPatch = {
	expected_updated_at: string;
	profile?: Record<string, string>;
	lifestyle?: Record<string, string>;
	allergies?: PatchCollection<MedicalRecordPatchItem>;
	medical_histories?: PatchCollection<MedicalRecordPatchItem>;
	surgical_histories?: PatchCollection<MedicalRecordPatchItem>;
	family_medical_histories?: PatchCollection<MedicalRecordPatchItem>;
	regular_treatments?: PatchCollection<MedicalRecordPatchItem>;
	vaccinations?: PatchCollection<MedicalRecordPatchItem>;
	disabilities?: PatchCollection<MedicalRecordPatchItem>;
	medical_devices?: PatchCollection<MedicalRecordPatchItem>;
	vital_signs?: PatchCollection<MedicalRecordPatchItem>;
	documents?: PatchCollection<MedicalRecordPatchItem>;
};
