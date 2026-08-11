export type LaboratoryStatus =
	| 'ORDERED'
	| 'SAMPLE_PENDING'
	| 'SAMPLE_COLLECTED'
	| 'IN_PROGRESS'
	| 'RESULT_ENTERED'
	| 'VALIDATED'
	| 'CANCELLED'
	| 'REJECTED';
export type LaboratoryFlag = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type LaboratoryListItem = {
	id: number;
	requestNumber: string;
	patientId: number;
	patientName: string;
	patientCode: string;
	medicalRecordId: number | null;
	consultationId: number;
	examCode: string;
	examName: string;
	category: string;
	service: string;
	prescriber: string;
	prescribedAt: string;
	priority: string;
	status: LaboratoryStatus;
	sampleIdentifier: string;
};
export type LaboratorySample = {
	id: number;
	orderId: number;
	sampleIdentifier: string;
	sampleType: string;
	status: string;
	comment: string;
	collectedBy: number;
	collectedAt: string;
};
export type LaboratoryResult = {
	id: number;
	orderId: number;
	parameter: string;
	value: string;
	numericValue: number | null;
	unit: string;
	referenceMin: number | null;
	referenceMax: number | null;
	referenceText: string;
	flag: LaboratoryFlag;
	comment: string;
	enteredBy: number;
};
export type LaboratoryOrder = {
	id: number;
	requestNumber: string;
	consultationId: number;
	medicalExamId: number;
	patientId: number;
	medicalRecordId: number | null;
	priority: string;
	status: LaboratoryStatus;
	prescribedBy: number;
	createdBy: number;
	updatedBy: number;
	cancelledReason: string;
	createdAt: string;
	updatedAt: string;
	validatedAt: string | null;
	validatedBy: number | null;
	sample?: LaboratorySample;
	results: LaboratoryResult[];
	patientName: string;
	patientCode: string;
	examName: string;
	examCode: string;
	category: string;
	service: string;
	prescriber: string;
};
export type LaboratoryFilters = {
	page?: number;
	limit?: number;
	patientId?: number;
	consultationId?: number;
	status?: string;
	priority?: string;
	category?: string;
	search?: string;
};
export type LaboratoryListResponse = {
	data: LaboratoryListItem[];
	meta: { page: number; limit: number; total: number; totalPages: number };
};
export type LaboratoryResultInput = {
	parameter: string;
	value: string;
	unit: string;
	referenceMin: number | null;
	referenceMax: number | null;
	referenceText: string;
	criticalMin: number | null;
	criticalMax: number | null;
	comment: string;
};
