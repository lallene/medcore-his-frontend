export interface Consultation {
	id: number;
	patientId: number;
	patientName: string;
	doctorName: string;
	service: string;
	reason: string;
	diagnosis: string;
	treatment: string;
	status: 'draft' | 'completed';
	createdAt: string;
}

export interface CreateConsultationPayload {
	patientId: number;
	patientName: string;
	doctorName: string;
	service: string;
	reason: string;
	diagnosis: string;
	treatment: string;
}
