import type {
	CommonMedicalRecord,
	MedicalRecordDeletedIDs,
	UpdateCommonMedicalRecordPatch
} from '../types/medical-record.ts';

type BackendEntity = {
	id: number;
	medical_record_id: number;
	patient_id: number;
	created_at: string;
	updated_at: string;
};

export type BackendMedicalRecordResponse = {
	medical_record: {
		id: number;
		patient_id: number;
		record_number: string;
		status: string;
		created_at: string;
		updated_at: string;
	};
	profile:
		| null
		| (BackendEntity & {
				email: string;
				address: string;
				marital_status: string;
				profession: string;
				photo_url: string;
				emergency_contact_first_name: string;
				emergency_contact_last_name: string;
				emergency_contact_relationship: string;
				emergency_contact_phone: string;
				legal_guardian_name: string;
				legal_guardian_relationship: string;
				legal_guardian_phone: string;
				legal_guardian_address: string;
				insurance_name: string;
				mutual_name: string;
				insurance_number: string;
				coverage_organization: string;
				blood_group: string;
				rhesus: string;
				updated_by: number;
		  });
	allergies: Array<
		BackendEntity & {
			allergen_type: string;
			allergen_name: string;
			reaction: string;
			severity: string;
			comment: string;
			is_active: boolean;
			created_by: number;
		}
	>;
	medical_histories: Array<
		BackendEntity & {
			type: string;
			title: string;
			description: string;
			start_date: string | null;
			end_date: string | null;
			status: string;
			severity: string;
			comment: string;
			created_by: number;
		}
	>;
	surgical_histories: Array<
		BackendEntity & {
			procedure_name: string;
			procedure_date: string | null;
			facility: string;
			complications: string;
			comment: string;
			created_by: number;
		}
	>;
	family_medical_histories: Array<
		BackendEntity & { disease: string; relationship: string; comment: string; created_by: number }
	>;
	regular_treatments: Array<
		BackendEntity & {
			medication_name: string;
			dosage: string;
			frequency: string;
			start_date: string | null;
			prescriber: string;
			is_active: boolean;
			created_by: number;
		}
	>;
	vaccinations: Array<
		BackendEntity & {
			vaccine_name: string;
			dose: string;
			vaccination_date: string | null;
			next_booster_date: string | null;
			status: string;
			created_by: number;
		}
	>;
	disabilities: Array<
		BackendEntity & { type: string; level: string; special_needs: string; created_by: number }
	>;
	lifestyle:
		| null
		| (BackendEntity & {
				tobacco: string;
				alcohol: string;
				physical_activity: string;
				diet: string;
				updated_by: number;
		  });
	medical_devices: Array<
		BackendEntity & {
			type: string;
			name: string;
			reference: string;
			implantation_date: string | null;
			comment: string;
			is_active: boolean;
			created_by: number;
		}
	>;
	vital_signs: Array<
		BackendEntity & {
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
			pain_location: string;
			pain_type: string;
			pain_duration: string;
			comment: string;
			measured_by: number;
			measured_at: string;
		}
	>;
	documents: Array<
		BackendEntity & {
			consultation_id: number | null;
			type: string;
			label: string;
			document_date: string | null;
			file_name: string;
			mime_type: string;
			file_url: string;
			description: string;
			uploaded_by: number;
		}
	>;
};

type PersistedValue = string | number | boolean | null;
type PatchItem = Record<string, PersistedValue>;

export function emptyDeletedIDs(): MedicalRecordDeletedIDs {
	return {
		allergies: [],
		medicalHistories: [],
		surgicalHistories: [],
		familyHistories: [],
		usualTreatments: [],
		vaccinations: [],
		disabilities: [],
		medicalDevices: [],
		vitalsHistory: [],
		documents: []
	};
}

export function isMedicalRecordConflict(status: number | undefined): boolean {
	return status === 409;
}

function localDate(value: string | null | undefined): string {
	return value ? value.slice(0, 10) : '';
}

function localDateTime(value: string): string {
	return value ? value.slice(0, 16) : '';
}

function knownValue(value: string, values: Record<string, string>): string {
	return values[value.toLowerCase()] ?? value;
}

export function mapMedicalRecordResponse(
	response: BackendMedicalRecordResponse
): CommonMedicalRecord {
	const profile = response.profile;
	return {
		id: response.medical_record.id,
		patientId: response.medical_record.patient_id,
		recordNumber: response.medical_record.record_number,
		createdAt: response.medical_record.created_at,
		updatedAt: response.medical_record.updated_at,
		facilityName: '',
		status: knownValue(response.medical_record.status, {
			active: 'ACTIVE',
			archived: 'ARCHIVED',
			closed: 'CLOSED'
		}) as CommonMedicalRecord['status'],
		lastName: '',
		firstNames: '',
		birthDate: null,
		age: null,
		sex: '',
		phone: '',
		isMinor: false,
		photoReference: profile?.photo_url ?? '',
		address: profile?.address ?? '',
		email: profile?.email ?? '',
		maritalStatus: profile?.marital_status ?? '',
		profession: profile?.profession ?? '',
		emergencyContact: {
			lastName: profile?.emergency_contact_last_name ?? '',
			firstNames: profile?.emergency_contact_first_name ?? '',
			relationship: profile?.emergency_contact_relationship ?? '',
			phone: profile?.emergency_contact_phone ?? '',
			email: '',
			address: ''
		},
		legalGuardian: {
			lastName: profile?.legal_guardian_name ?? '',
			firstNames: '',
			relationship: profile?.legal_guardian_relationship ?? '',
			phone: profile?.legal_guardian_phone ?? '',
			email: '',
			address: profile?.legal_guardian_address ?? ''
		},
		medicalCoverage: {
			isInsured: Boolean(
				profile?.insurance_name || profile?.mutual_name || profile?.insurance_number
			),
			insuranceName: profile?.insurance_name ?? '',
			mutualName: profile?.mutual_name ?? '',
			insuredNumber: profile?.insurance_number ?? '',
			coverageOrganization: profile?.coverage_organization ?? '',
			coverageRate: null
		},
		bloodGroup: profile?.blood_group ?? '',
		rhesus: profile?.rhesus ?? '',
		lifestyle: {
			smokingStatus: response.lifestyle?.tobacco ?? '',
			cigarettesPerDay: null,
			alcoholStatus: response.lifestyle?.alcohol ?? '',
			physicalActivityLevel: response.lifestyle?.physical_activity ?? '',
			dietDescription: response.lifestyle?.diet ?? '',
			notes: ''
		},
		allergies: response.allergies.map((item) => ({
			id: item.id,
			category: knownValue(item.allergen_type, {
				medication: 'MEDICATION',
				food: 'FOOD',
				product: 'PRODUCT',
				substance: 'SUBSTANCE',
				other: 'OTHER'
			}),
			name: item.allergen_name,
			reaction: item.reaction,
			severity: knownValue(item.severity, {
				low: 'LOW',
				medium: 'MODERATE',
				high: 'HIGH',
				anaphylaxis: 'ANAPHYLAXIS'
			}),
			diagnosedAt: localDate(item.created_at),
			notes: item.comment,
			isActive: item.is_active
		})),
		medicalHistories: response.medical_histories.map((item) => ({
			id: item.id,
			disease: item.title,
			historyType: knownValue(item.type, { chronic: 'CHRONIC', past: 'PAST' }),
			diagnosedAt: localDate(item.start_date),
			resolvedAt: localDate(item.end_date),
			status: knownValue(item.status, {
				active: 'ACTIVE',
				resolved: 'RESOLVED',
				unknown: 'UNKNOWN'
			}),
			severity: item.severity,
			description: item.description,
			comment: item.comment,
			notes: item.description || item.comment
		})),
		surgicalHistories: response.surgical_histories.map((item) => ({
			id: item.id,
			procedureName: item.procedure_name,
			procedureDate: localDate(item.procedure_date),
			facility: item.facility,
			indication: '',
			complications: item.complications,
			notes: item.comment
		})),
		familyHistories: response.family_medical_histories.map((item) => ({
			id: item.id,
			relationship: item.relationship,
			disease: item.disease,
			ageAtDiagnosis: null,
			notes: item.comment
		})),
		usualTreatments: response.regular_treatments.map((item) => ({
			id: item.id,
			medicationName: item.medication_name,
			dosage: item.dosage,
			frequency: item.frequency,
			startDate: localDate(item.start_date),
			endDate: '',
			prescriber: item.prescriber,
			status: item.is_active ? 'ONGOING' : 'STOPPED',
			isActive: item.is_active,
			notes: ''
		})),
		vaccinations: response.vaccinations.map((item) => ({
			id: item.id,
			vaccineName: item.vaccine_name,
			dose: item.dose,
			administeredDate: localDate(item.vaccination_date),
			nextReminderDate: localDate(item.next_booster_date),
			status: knownValue(item.status, {
				planned: 'PLANNED',
				completed: 'COMPLETED',
				delayed: 'DELAYED',
				missed: 'MISSED'
			}),
			batchNumber: '',
			center: ''
		})),
		disabilities: response.disabilities.map((item) => ({
			id: item.id,
			type: item.type,
			level: item.level,
			specialNeeds: item.special_needs,
			notes: ''
		})),
		medicalDevices: response.medical_devices.map((item) => ({
			id: item.id,
			type: knownValue(item.type, {
				pacemaker: 'PACEMAKER',
				prosthesis: 'PROSTHESIS',
				implant: 'IMPLANT',
				catheter: 'CATHETER',
				other: 'OTHER'
			}),
			name: item.name,
			reference: item.reference,
			implantationDate: localDate(item.implantation_date),
			manufacturer: '',
			notes: item.comment,
			isActive: item.is_active
		})),
		vitalsHistory: response.vital_signs.map((item) => ({
			id: item.id,
			consultationId: item.consultation_id,
			measuredAt: localDateTime(item.measured_at),
			weightKg: item.weight_kg,
			heightCm: item.height_cm,
			bmi: item.bmi,
			temperature: item.temperature_c,
			bloodPressureSystolic: item.systolic_bp,
			bloodPressureDiastolic: item.diastolic_bp,
			heartRate: item.heart_rate,
			respiratoryRate: item.respiratory_rate,
			oxygenSaturation: item.oxygen_saturation,
			bloodGlucose: item.blood_glucose,
			waistCircumferenceCm: item.waist_circumference_cm,
			painScore: item.pain_score,
			painLocation: item.pain_location,
			painType: item.pain_type,
			painDuration: item.pain_duration,
			measuredBy: item.measured_by ? String(item.measured_by) : '',
			comment: item.comment
		})),
		documents: response.documents.map((item) => ({
			id: item.id,
			consultationId: item.consultation_id,
			type: knownValue(item.type, {
				prescription: 'PRESCRIPTION',
				certificate: 'CERTIFICATE',
				report: 'REPORT',
				image: 'IMAGE',
				pdf: 'PDF',
				other: 'OTHER'
			}),
			title: item.label,
			documentDate: item.document_date === null ? null : localDate(item.document_date),
			fileReference: item.file_url,
			fileName: item.file_name,
			mimeType: item.mime_type,
			description: item.description,
			uploadedBy: item.uploaded_by ? String(item.uploaded_by) : ''
		}))
	};
}

function apiDate(value: string): string | null {
	return value === ''
		? null
		: value.includes('T')
			? new Date(value).toISOString()
			: `${value}T00:00:00Z`;
}

function apiInstant(value: string): string | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function backendEnum(value: string, values: Record<string, string>): string {
	return values[value] ?? value;
}

function changedFields(original: PatchItem, current: PatchItem): PatchItem {
	const result: PatchItem = {};
	for (const [key, value] of Object.entries(current)) {
		if (!Object.is(original[key], value)) result[key] = value;
	}
	return result;
}

function collectionPatch<T extends { id?: number }>(
	original: T[],
	current: T[],
	deleted: number[],
	serialize: (item: T) => PatchItem
) {
	const originalByID = new Map(
		original.filter((item) => item.id !== undefined).map((item) => [item.id as number, item])
	);
	const upsert: PatchItem[] = [];
	for (const item of current) {
		const serialized = serialize(item);
		if (item.id === undefined) {
			upsert.push(serialized);
			continue;
		}
		const previous = originalByID.get(item.id);
		if (!previous) {
			upsert.push({ id: item.id, ...serialized });
			continue;
		}
		const diff = changedFields(serialize(previous), serialized);
		if (Object.keys(diff).length > 0) upsert.push({ id: item.id, ...diff });
	}
	return upsert.length || deleted.length ? { upsert, delete_ids: [...deleted] } : undefined;
}

export function buildMedicalRecordPatch(
	original: CommonMedicalRecord,
	current: CommonMedicalRecord,
	deleted: MedicalRecordDeletedIDs
): UpdateCommonMedicalRecordPatch {
	const patch: UpdateCommonMedicalRecordPatch = { expected_updated_at: original.updatedAt };
	const originalProfile: PatchItem = profileFields(original);
	const currentProfile = profileFields(current);
	const profile = changedFields(originalProfile, currentProfile);
	if (Object.keys(profile).length) patch.profile = profile as Record<string, string>;
	const originalLifestyle = lifestyleFields(original);
	const currentLifestyle = lifestyleFields(current);
	const lifestyle = changedFields(originalLifestyle, currentLifestyle);
	if (Object.keys(lifestyle).length) patch.lifestyle = lifestyle as Record<string, string>;
	const allergies = collectionPatch(
		original.allergies,
		current.allergies,
		deleted.allergies,
		allergyFields
	);
	if (allergies) patch.allergies = allergies;
	const medicalHistories = collectionPatch(
		original.medicalHistories,
		current.medicalHistories,
		deleted.medicalHistories,
		medicalHistoryFields
	);
	if (medicalHistories) patch.medical_histories = medicalHistories;
	const surgicalHistories = collectionPatch(
		original.surgicalHistories,
		current.surgicalHistories,
		deleted.surgicalHistories,
		(item) => ({
			procedure_name: item.procedureName,
			procedure_date: apiDate(item.procedureDate),
			facility: item.facility,
			complications: item.complications,
			comment: item.notes
		})
	);
	if (surgicalHistories) patch.surgical_histories = surgicalHistories;
	const familyMedicalHistories = collectionPatch(
		original.familyHistories,
		current.familyHistories,
		deleted.familyHistories,
		(item) => ({ disease: item.disease, relationship: item.relationship, comment: item.notes })
	);
	if (familyMedicalHistories) patch.family_medical_histories = familyMedicalHistories;
	const regularTreatments = collectionPatch(
		original.usualTreatments,
		current.usualTreatments,
		deleted.usualTreatments,
		(item) => ({
			medication_name: item.medicationName,
			dosage: item.dosage,
			frequency: item.frequency,
			start_date: apiDate(item.startDate),
			prescriber: item.prescriber,
			is_active:
				item.status === 'ONGOING' ? true : item.status === 'STOPPED' ? false : item.isActive
		})
	);
	if (regularTreatments) patch.regular_treatments = regularTreatments;
	const vaccinations = collectionPatch(
		original.vaccinations,
		current.vaccinations,
		deleted.vaccinations,
		(item) => ({
			vaccine_name: item.vaccineName,
			dose: item.dose,
			vaccination_date: apiDate(item.administeredDate),
			next_booster_date: apiDate(item.nextReminderDate),
			status: backendEnum(item.status, {
				PLANNED: 'planned',
				COMPLETED: 'completed',
				DELAYED: 'delayed',
				MISSED: 'missed'
			})
		})
	);
	if (vaccinations) patch.vaccinations = vaccinations;
	const disabilities = collectionPatch(
		original.disabilities,
		current.disabilities,
		deleted.disabilities,
		(item) => ({ type: item.type, level: item.level, special_needs: item.specialNeeds })
	);
	if (disabilities) patch.disabilities = disabilities;
	const medicalDevices = collectionPatch(
		original.medicalDevices,
		current.medicalDevices,
		deleted.medicalDevices,
		(item) => ({
			type: backendEnum(item.type, {
				PACEMAKER: 'pacemaker',
				PROSTHESIS: 'prosthesis',
				IMPLANT: 'implant',
				CATHETER: 'catheter',
				OTHER: 'other'
			}),
			name: item.name,
			reference: item.reference,
			implantation_date: apiDate(item.implantationDate),
			comment: item.notes,
			is_active: item.isActive
		})
	);
	if (medicalDevices) patch.medical_devices = medicalDevices;
	const vitalSigns = collectionPatch(
		original.vitalsHistory,
		current.vitalsHistory,
		deleted.vitalsHistory,
		vitalFields
	);
	if (vitalSigns) patch.vital_signs = vitalSigns;
	const documents = collectionPatch(
		original.documents,
		current.documents,
		deleted.documents,
		documentFields
	);
	if (documents) patch.documents = documents;
	return patch;
}

function profileFields(record: CommonMedicalRecord): PatchItem {
	return {
		email: record.email,
		address: record.address,
		marital_status: record.maritalStatus,
		profession: record.profession,
		photo_url: record.photoReference,
		emergency_contact_first_name: record.emergencyContact.firstNames,
		emergency_contact_last_name: record.emergencyContact.lastName,
		emergency_contact_relationship: record.emergencyContact.relationship,
		emergency_contact_phone: record.emergencyContact.phone,
		legal_guardian_name: [record.legalGuardian.firstNames, record.legalGuardian.lastName]
			.filter(Boolean)
			.join(' '),
		legal_guardian_relationship: record.legalGuardian.relationship,
		legal_guardian_phone: record.legalGuardian.phone,
		legal_guardian_address: record.legalGuardian.address,
		insurance_name: record.medicalCoverage.insuranceName,
		mutual_name: record.medicalCoverage.mutualName,
		insurance_number: record.medicalCoverage.insuredNumber,
		coverage_organization: record.medicalCoverage.coverageOrganization,
		blood_group: record.bloodGroup,
		rhesus: record.rhesus
	};
}
function lifestyleFields(record: CommonMedicalRecord): PatchItem {
	return {
		tobacco: record.lifestyle.smokingStatus,
		alcohol: record.lifestyle.alcoholStatus,
		physical_activity: record.lifestyle.physicalActivityLevel,
		diet: record.lifestyle.dietDescription
	};
}
function allergyFields(item: CommonMedicalRecord['allergies'][number]): PatchItem {
	return {
		allergen_type: backendEnum(item.category, {
			MEDICATION: 'medication',
			FOOD: 'food',
			PRODUCT: 'product',
			SUBSTANCE: 'substance',
			OTHER: 'other'
		}),
		allergen_name: item.name,
		reaction: item.reaction,
		severity: backendEnum(item.severity, {
			LOW: 'low',
			MODERATE: 'medium',
			HIGH: 'high',
			ANAPHYLAXIS: 'anaphylaxis'
		}),
		comment: item.notes,
		is_active: item.isActive
	};
}
function medicalHistoryFields(item: CommonMedicalRecord['medicalHistories'][number]): PatchItem {
	const notesChanged = item.notes !== (item.description || item.comment);
	return {
		type: backendEnum(item.historyType, { PAST: 'past', CHRONIC: 'chronic' }),
		title: item.disease,
		description: notesChanged ? item.notes : item.description,
		start_date: apiDate(item.diagnosedAt),
		end_date: apiDate(item.resolvedAt),
		status: backendEnum(item.status, {
			ACTIVE: 'active',
			RESOLVED: 'resolved',
			UNKNOWN: 'unknown'
		}),
		severity: item.severity,
		comment: item.comment
	};
}
function vitalFields(item: CommonMedicalRecord['vitalsHistory'][number]): PatchItem {
	return {
		consultation_id: item.consultationId,
		weight_kg: item.weightKg,
		height_cm: item.heightCm,
		temperature_c: item.temperature,
		systolic_bp: item.bloodPressureSystolic,
		diastolic_bp: item.bloodPressureDiastolic,
		heart_rate: item.heartRate,
		respiratory_rate: item.respiratoryRate,
		oxygen_saturation: item.oxygenSaturation,
		blood_glucose: item.bloodGlucose,
		waist_circumference_cm: item.waistCircumferenceCm,
		pain_score: item.painScore,
		pain_location: item.painLocation,
		pain_type: item.painType,
		pain_duration: item.painDuration,
		measured_at: apiInstant(item.measuredAt),
		comment: item.comment
	};
}
function documentFields(item: CommonMedicalRecord['documents'][number]): PatchItem {
	return {
		consultation_id: item.consultationId,
		type: backendEnum(item.type, {
			PRESCRIPTION: 'prescription',
			CERTIFICATE: 'certificate',
			REPORT: 'report',
			IMAGE: 'image',
			PDF: 'pdf',
			OTHER: 'other'
		}),
		label: item.title,
		document_date: item.documentDate === null ? null : apiDate(item.documentDate),
		file_name: item.fileName,
		mime_type: item.mimeType,
		file_url: item.fileReference,
		description: item.description
	};
}
