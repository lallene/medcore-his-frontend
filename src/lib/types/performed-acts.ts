import type { ActCategory } from './act-catalog';

export type PerformedActStatus = 'PERFORMED' | 'VOIDED';

export interface PerformedAct {
	id: number;
	patientId: number;
	actCatalogEntryId: number;
	actCode: string;
	actLabel: string;
	actDescription: string;
	actCategory: ActCategory;
	basePrice: number;
	currency: string;
	billable: boolean;
	insuranceEligible: boolean;
	quantity: number;
	performedAt: string;
	performedBy: number;
	status: PerformedActStatus;
	consultationId?: number | null;
	appointmentId?: number | null;
	hospitalizationId?: number | null;
	sourceType?: string;
	sourceId?: number | null;
	voidedAt?: string | null;
	voidedBy?: number | null;
	voidReason?: string;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface PerformedActCreateRequest {
	patientId: number;
	actCatalogEntryId: number;
	quantity?: number;
	performedAt?: string;
	consultationId?: number;
	appointmentId?: number;
	hospitalizationId?: number;
}

export interface PerformedActVoidRequest {
	reason: string;
}

export interface PerformedActPage {
	data: PerformedAct[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface PerformedActListParams {
	patientId?: number;
	status?: PerformedActStatus | '';
	category?: ActCategory | '';
	consultationId?: number;
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
}
