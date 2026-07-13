import { api } from '$lib/api/client';

import type {
	CommonMedicalRecord,
	UpdateCommonMedicalRecordPayload
} from '$lib/types/medical-record';

type BackendMedicalRecordResponse = {
	medical_record: {
		id: number;
		patient_id: number;
		record_number: string;
		status: string;
		created_at: string;
		updated_at: string;
	};

	profile: {
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
	} | null;

	allergies: Array<{
		id: number;
		allergen_type: string;
		allergen_name: string;
		reaction: string;
		severity: string;
		comment: string;
		created_at: string;
	}>;

	medical_histories: Array<{
		id: number;
		type: string;
		title: string;
		description: string;
		start_date: string | null;
		end_date: string | null;
		status: string;
		comment: string;
	}>;

	surgical_histories: Array<{
		id: number;
		procedure_name: string;
		procedure_date: string | null;
		facility: string;
		complications: string;
		comment: string;
	}>;

	family_medical_histories: Array<{
		id: number;
		disease: string;
		relationship: string;
		comment: string;
	}>;

	regular_treatments: Array<{
		id: number;
		medication_name: string;
		dosage: string;
		frequency: string;
		start_date: string | null;
		prescriber: string;
		is_active: boolean;
	}>;

	vaccinations: Array<{
		id: number;
		vaccine_name: string;
		dose: string;
		vaccination_date: string | null;
		next_booster_date: string | null;
		status: string;
	}>;

	disabilities: Array<{
		id: number;
		type: string;
		level: string;
		special_needs: string;
	}>;

	lifestyle: {
		tobacco: string;
		alcohol: string;
		physical_activity: string;
		diet: string;
	} | null;

	medical_devices: Array<{
		id: number;
		type: string;
		name: string;
		reference: string;
		implantation_date: string | null;
		comment: string;
		is_active: boolean;
	}>;

	vital_signs: Array<{
		id: number;
		measured_at: string;
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
		pain_location: string;
		pain_type: string;
		pain_duration: string;
	}>;

	documents: Array<{
		id: number;
		type: string;
		label: string;
		file_url: string;
		description: string;
		uploaded_by: number;
		created_at: string;
		document_date: string | null;
		file_name: string;
		mime_type: string;
	}>;
};

function normalizeDate(value: string | null | undefined): string {
	return value ? value.slice(0, 10) : '';
}

function mapResponse(response: BackendMedicalRecordResponse): CommonMedicalRecord {
	const profile = response.profile;

	return {
		id: response.medical_record.id,
		patientId: response.medical_record.patient_id,

		recordNumber: response.medical_record.record_number,
		createdAt: response.medical_record.created_at,
		facilityName: '',
		status:
			response.medical_record.status.toUpperCase() === 'ARCHIVED'
				? 'ARCHIVED'
				: response.medical_record.status.toUpperCase() === 'CLOSED'
					? 'CLOSED'
					: 'ACTIVE',

		lastName: '',
		firstNames: '',
		birthDate: null,
		age: null,
		sex: '',
		photoReference: profile?.photo_url ?? '',

		address: profile?.address ?? '',
		phone: '',
		email: profile?.email ?? '',

		maritalStatus: profile?.marital_status ?? '',
		profession: profile?.profession ?? '',

		isMinor: false,

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
			smokingStatus: '',
			cigarettesPerDay: null,
			alcoholStatus: '',
			physicalActivityLevel: '',
			dietDescription: response.lifestyle?.diet ?? '',
			notes: [
				response.lifestyle?.tobacco ? `Tabac : ${response.lifestyle.tobacco}` : '',
				response.lifestyle?.alcohol ? `Alcool : ${response.lifestyle.alcohol}` : '',
				response.lifestyle?.physical_activity
					? `Activité : ${response.lifestyle.physical_activity}`
					: ''
			]
				.filter(Boolean)
				.join(' — ')
		},

		allergies: response.allergies.map((item) => ({
			id: item.id,
			category:
				item.allergen_type.toUpperCase() === 'FOOD'
					? 'FOOD'
					: item.allergen_type.toUpperCase() === 'PRODUCT'
						? 'PRODUCT'
						: item.allergen_type.toUpperCase() === 'SUBSTANCE'
							? 'SUBSTANCE'
							: item.allergen_type.toUpperCase() === 'OTHER'
								? 'OTHER'
								: 'MEDICATION',
			name: item.allergen_name,
			reaction: item.reaction,
			severity:
				item.severity.toUpperCase() === 'HIGH'
					? 'HIGH'
					: item.severity.toUpperCase() === 'ANAPHYLAXIS'
						? 'ANAPHYLAXIS'
						: item.severity.toUpperCase() === 'MEDIUM'
							? 'MODERATE'
							: 'LOW',
			diagnosedAt: normalizeDate(item.created_at),
			notes: item.comment
		})),

		medicalHistories: response.medical_histories.map((item) => ({
			id: item.id,
			disease: item.title,
			historyType: item.type.toUpperCase() === 'CHRONIC' ? 'CHRONIC' : 'PAST',
			diagnosedAt: normalizeDate(item.start_date),
			resolvedAt: normalizeDate(item.end_date),
			status:
				item.status.toUpperCase() === 'ACTIVE'
					? 'ACTIVE'
					: item.status.toUpperCase() === 'RESOLVED'
						? 'RESOLVED'
						: 'UNKNOWN',
			notes: item.description || item.comment
		})),

		surgicalHistories: response.surgical_histories.map((item) => ({
			id: item.id,
			procedureName: item.procedure_name,
			procedureDate: normalizeDate(item.procedure_date),
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
			startDate: normalizeDate(item.start_date),
			endDate: '',
			prescriber: item.prescriber,
			status: item.is_active ? 'ONGOING' : 'STOPPED',
			notes: ''
		})),

		vaccinations: response.vaccinations.map((item) => ({
			id: item.id,
			vaccineName: item.vaccine_name,
			dose: item.dose,
			administeredDate: normalizeDate(item.vaccination_date),
			nextReminderDate: normalizeDate(item.next_booster_date),
			status:
				item.status.toUpperCase() === 'COMPLETED'
					? 'COMPLETED'
					: item.status.toUpperCase() === 'DELAYED'
						? 'DELAYED'
						: item.status.toUpperCase() === 'MISSED'
							? 'MISSED'
							: 'PLANNED',
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
			type:
				item.type.toUpperCase() === 'PACEMAKER'
					? 'PACEMAKER'
					: item.type.toUpperCase() === 'PROSTHESIS'
						? 'PROSTHESIS'
						: item.type.toUpperCase() === 'IMPLANT'
							? 'IMPLANT'
							: item.type.toUpperCase() === 'CATHETER'
								? 'CATHETER'
								: 'OTHER',
			name: item.name,
			reference: item.reference,
			implantationDate: normalizeDate(item.implantation_date),
			manufacturer: '',
			notes: item.comment
		})),

		vitalsHistory: response.vital_signs.map((item) => ({
			id: item.id,
			measuredAt: item.measured_at.slice(0, 16),
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
			painLocation: item.pain_location ?? '',
			painType: item.pain_type ?? '',
			painDuration: item.pain_duration ?? '',
			measuredBy: item.measured_by > 0 ? String(item.measured_by) : ''
		})),

		documents: response.documents.map((item) => ({
			id: item.id,
			type:
				item.type.toUpperCase() === 'PRESCRIPTION'
					? 'PRESCRIPTION'
					: item.type.toUpperCase() === 'CERTIFICATE'
						? 'CERTIFICATE'
						: item.type.toUpperCase() === 'REPORT'
							? 'REPORT'
							: item.type.toUpperCase() === 'IMAGE'
								? 'IMAGE'
								: item.type.toUpperCase() === 'PDF'
									? 'PDF'
									: 'OTHER',
			title: item.label,
			documentDate: normalizeDate(item.document_date ?? item.created_at),
			fileReference: item.file_url,
			description: item.description,
			uploadedBy: item.uploaded_by > 0 ? String(item.uploaded_by) : ''
		})),

		updatedAt: response.medical_record.updated_at
	};
}

function nullableDate(value: string): string | null {
	return value.trim() === '' ? null : value;
}

function mapPayload(payload: UpdateCommonMedicalRecordPayload) {
	return {
		profile: {
			email: payload.email,
			address: payload.address,
			marital_status: payload.maritalStatus,
			profession: payload.profession,
			photo_url: payload.photoReference,

			emergency_contact_first_name: payload.emergencyContact.firstNames,
			emergency_contact_last_name: payload.emergencyContact.lastName,
			emergency_contact_relationship: payload.emergencyContact.relationship,
			emergency_contact_phone: payload.emergencyContact.phone,

			legal_guardian_name: [payload.legalGuardian.firstNames, payload.legalGuardian.lastName]
				.filter(Boolean)
				.join(' '),
			legal_guardian_relationship: payload.legalGuardian.relationship,
			legal_guardian_phone: payload.legalGuardian.phone,
			legal_guardian_address: payload.legalGuardian.address,

			insurance_name: payload.medicalCoverage.insuranceName,
			mutual_name: payload.medicalCoverage.mutualName,
			insurance_number: payload.medicalCoverage.insuredNumber,
			coverage_organization: payload.medicalCoverage.coverageOrganization,

			blood_group: payload.bloodGroup,
			rhesus: payload.rhesus
		},

		surgical_histories: payload.surgicalHistories.map((item) => ({
			procedure_name: item.procedureName,
			procedure_date: nullableDate(item.procedureDate),
			facility: item.facility,
			complications: item.complications,
			comment: item.notes
		})),

		family_medical_histories: payload.familyHistories.map((item) => ({
			disease: item.disease,
			relationship: item.relationship,
			comment: item.notes
		})),

		regular_treatments: payload.usualTreatments.map((item) => ({
			medication_name: item.medicationName,
			dosage: item.dosage,
			frequency: item.frequency,
			start_date: nullableDate(item.startDate),
			prescriber: item.prescriber,
			is_active: item.status === 'ONGOING'
		})),

		vaccinations: payload.vaccinations.map((item) => ({
			vaccine_name: item.vaccineName,
			dose: item.dose,
			vaccination_date: nullableDate(item.administeredDate),
			next_booster_date: nullableDate(item.nextReminderDate),
			status: item.status
		})),

		disabilities: payload.disabilities.map((item) => ({
			type: item.type,
			level: item.level,
			special_needs: item.specialNeeds
		})),

		lifestyle: {
			tobacco: payload.lifestyle.smokingStatus,
			alcohol: payload.lifestyle.alcoholStatus,
			physical_activity: payload.lifestyle.physicalActivityLevel,
			diet: payload.lifestyle.dietDescription
		},

		medical_devices: payload.medicalDevices.map((item) => ({
			type: item.type,
			name: item.name,
			reference: item.reference,
			implantation_date: nullableDate(item.implantationDate),
			comment: item.notes,
			is_active: true
		})),

		vital_signs: payload.vitalsHistory.map((item) => ({
			id: item.id ?? 0,
			consultation_id: null,

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

			measured_at: nullableDateTime(item.measuredAt),
			measured_by: Number(item.measuredBy) || 1,
			comment: ''
		})),

		documents: payload.documents.map((item) => ({
			id: item.id ?? 0,
			consultation_id: null,
			type: item.type,
			label: item.title,
			document_date: nullableDate(item.documentDate),
			file_name: '',
			mime_type: '',
			file_url: item.fileReference,
			description: item.description,
			uploaded_by: Number(item.uploadedBy) || 1
		})),

		allergies: payload.allergies.map((item) => ({
			allergen_type: item.category.toLowerCase(),
			allergen_name: item.name,
			reaction: item.reaction,
			severity: item.severity === 'MODERATE' ? 'medium' : item.severity.toLowerCase(),
			comment: item.notes,
			is_active: true
		})),

		medical_histories: payload.medicalHistories.map((item) => ({
			type: item.historyType.toLowerCase(),
			title: item.disease,
			description: item.notes,
			start_date: nullableDate(item.diagnosedAt),
			end_date: nullableDate(item.resolvedAt),
			status: item.status.toLowerCase(),
			severity: 'medium',
			comment: item.notes
		})),

		updated_by: 1
	};
}

export async function getPatientMedicalRecord(patientId: number): Promise<CommonMedicalRecord> {
	const response = await api.get<BackendMedicalRecordResponse>(
		`/api/patients/${patientId}/common-medical-record`
	);

	return mapResponse(response.data);
}

export async function updatePatientMedicalRecord(
	patientId: number,
	payload: UpdateCommonMedicalRecordPayload
): Promise<CommonMedicalRecord> {
	const response = await api.put<BackendMedicalRecordResponse>(
		`/api/patients/${patientId}/common-medical-record`,
		mapPayload(payload)
	);

	return mapResponse(response.data);
}

function nullableDateTime(value: string): string | null {
	const normalized = value.trim();

	if (normalized === '') {
		return null;
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date.toISOString();
}
