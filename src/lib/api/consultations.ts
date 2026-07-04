import { api } from '$lib/api/client';

import type {
	Consultation,
	ConsultationReason,
	CreateConsultationPayload,
	MedicalExam
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

export async function getConsultations(): Promise<Consultation[]> {
	const response = await api.get<Consultation[]>('/api/consultations');
	return response.data;
}

export async function getPatientConsultations(patientId: number): Promise<Consultation[]> {
	const response = await api.get<Consultation[]>(`/api/patients/${patientId}/consultations`);
	return response.data;
}

import type { PhysicalExamArea } from '$lib/types/consultation';

export async function getPhysicalExamAreas(): Promise<PhysicalExamArea[]> {
	const response = await api.get<PhysicalExamArea[]>('/api/consultations/physical-exam-areas');
	return response.data;
}
