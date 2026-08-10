import { api } from '$lib/api/client';

import type {
	Consultation,
	ConsultationDetail,
	ConsultationListFilters,
	ConsultationListResponse,
	ConsultationReason,
	CreateConsultationPayload,
	MedicalExam,
	PhysicalExamArea,
	UpdateConsultationPayload,
	UpdateConsultationStatusPayload
} from '$lib/types/consultation';

export async function getConsultationReasons(): Promise<ConsultationReason[]> {
	const response = await api.get<ConsultationReason[]>('/api/consultations/reasons');
	return response.data;
}

export async function getMedicalExams(): Promise<MedicalExam[]> {
	const response = await api.get<MedicalExam[]>('/api/consultations/exams');
	return response.data;
}

export async function createConsultation(
	payload: CreateConsultationPayload
): Promise<Consultation> {
	const response = await api.post<Consultation>('/api/consultations', payload);
	return response.data;
}

export async function getConsultations(
	filters: ConsultationListFilters = {}
): Promise<ConsultationListResponse> {
	const response = await api.get<ConsultationListResponse>('/api/consultations', {
		params: filters
	});
	return response.data;
}

export async function getPatientConsultations(patientId: number): Promise<Consultation[]> {
	const response = await api.get<Consultation[]>(`/api/patients/${patientId}/consultations`);
	return response.data;
}

export async function getPhysicalExamAreas(): Promise<PhysicalExamArea[]> {
	const response = await api.get<PhysicalExamArea[]>('/api/consultations/physical-exam-areas');
	return response.data;
}

export async function getConsultation(consultationId: number): Promise<ConsultationDetail> {
	const response = await api.get<ConsultationDetail>(`/api/consultations/${consultationId}`);

	return response.data;
}

export async function updateConsultation(
	consultationId: number,
	payload: UpdateConsultationPayload
): Promise<ConsultationDetail> {
	const response = await api.put<ConsultationDetail>(
		`/api/consultations/${consultationId}`,
		payload
	);

	return response.data;
}

export async function updateConsultationStatus(
	consultationId: number,
	payload: UpdateConsultationStatusPayload
): Promise<ConsultationDetail> {
	const response = await api.patch<ConsultationDetail>(
		`/api/consultations/${consultationId}/status`,
		payload
	);

	return response.data;
}
