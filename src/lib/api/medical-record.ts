import axios from 'axios';

import { api } from '$lib/api/client';
import { getPatient } from '$lib/api/patients';
import {
	buildMedicalRecordPatch,
	isMedicalRecordConflict,
	mapMedicalRecordResponse,
	type BackendMedicalRecordResponse
} from '$lib/api/medical-record-mapper';

import type {
	CommonMedicalRecord,
	MedicalRecordDeletedIDs,
	UpdateCommonMedicalRecordPatch
} from '$lib/types/medical-record';

export class MedicalRecordConflictError extends Error {
	constructor() {
		super(
			'Ce dossier a été modifié par un autre utilisateur. Rechargez les données avant de poursuivre.'
		);
		this.name = 'MedicalRecordConflictError';
	}
}

function enrichWithPatient(
	record: CommonMedicalRecord,
	patient: Awaited<ReturnType<typeof getPatient>>
): CommonMedicalRecord {
	return {
		...record,
		lastName: patient.nom ?? '',
		firstNames: patient.prenoms ?? '',
		birthDate: patient.dateNaissance ? patient.dateNaissance.slice(0, 10) : null,
		age: patient.age ?? null,
		sex: patient.sexe ?? '',
		phone: patient.telephone ?? '',
		address: record.address || patient.quartier || '',
		medicalCoverage: {
			...record.medicalCoverage,
			isInsured: record.medicalCoverage.isInsured || patient.isAssure || false,
			insuredNumber: record.medicalCoverage.insuredNumber || patient.matriculeAssure || '',
			coverageRate: record.medicalCoverage.coverageRate ?? patient.tauxCouverture ?? null
		}
	};
}

export async function getPatientMedicalRecord(patientId: number): Promise<CommonMedicalRecord> {
	const [response, patient] = await Promise.all([
		api.get<BackendMedicalRecordResponse>(`/api/patients/${patientId}/common-medical-record`),
		getPatient(patientId)
	]);
	return enrichWithPatient(mapMedicalRecordResponse(response.data), patient);
}

export async function updatePatientMedicalRecord(
	patientId: number,
	current: CommonMedicalRecord,
	original: CommonMedicalRecord,
	deletedIDs: MedicalRecordDeletedIDs
): Promise<CommonMedicalRecord> {
	const payload: UpdateCommonMedicalRecordPatch = buildMedicalRecordPatch(
		original,
		current,
		deletedIDs
	);

	try {
		const response = await api.put<BackendMedicalRecordResponse>(
			`/api/patients/${patientId}/common-medical-record`,
			payload
		);
		const patient = await getPatient(patientId);
		return enrichWithPatient(mapMedicalRecordResponse(response.data), patient);
	} catch (error: unknown) {
		if (axios.isAxiosError(error) && isMedicalRecordConflict(error.response?.status)) {
			throw new MedicalRecordConflictError();
		}
		throw error;
	}
}

export { buildMedicalRecordPatch, mapMedicalRecordResponse };
