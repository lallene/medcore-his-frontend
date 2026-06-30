import type { Consultation, CreateConsultationPayload } from '$lib/types/consultation';

const STORAGE_KEY = 'medcore_consultations';

function readConsultations(): Consultation[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw ? (JSON.parse(raw) as Consultation[]) : [];
}

function saveConsultations(consultations: Consultation[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(consultations));
}

export async function createConsultation(
	payload: CreateConsultationPayload
): Promise<Consultation> {
	const consultations = readConsultations();

	const consultation: Consultation = {
		id: Date.now(),
		...payload,
		status: 'completed',
		createdAt: new Date().toISOString()
	};

	saveConsultations([consultation, ...consultations]);

	return consultation;
}

export async function getConsultations(): Promise<Consultation[]> {
	return readConsultations();
}

export async function getPatientConsultations(patientId: number): Promise<Consultation[]> {
	return readConsultations().filter((item) => item.patientId === patientId);
}
