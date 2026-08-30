/** LOT 23G — scheduling / agenda domain (authoritative backend DTOs). */

export type AppointmentStatus =
	'SCHEDULED' | 'ARRIVED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
	id: number;
	patientId: number;
	serviceId: number;
	expectedDoctorId?: number | null;
	appointmentTypeId?: number;
	scheduledAt: string;
	scheduledEndAt?: string | null;
	reason: string;
	status: AppointmentStatus;
	arrivedAt?: string | null;
	checkedInAt?: string | null;
	queueTicketId?: number | null;
	idempotencyKey?: string;
	createdBy: number;
	createdAt: string;
	updatedAt: string;
	patientCode: string;
	patientName: string;
	serviceName: string;
	expectedDoctorName: string;
	appointmentTypeCode?: string;
	appointmentTypeName?: string;
	durationMinutes?: number;
	punctuality?: string;
	hasActiveTicket: boolean;
}

export interface AppointmentListResponse {
	items: Appointment[];
	total: number;
	page: number;
	limit: number;
}

export interface AppointmentListFilters {
	from: string;
	to: string;
	serviceId?: number;
	practitionerId?: number;
	patientId?: number;
	status?: AppointmentStatus;
	appointmentTypeId?: number;
	page?: number;
	limit?: number;
}

export interface AppointmentType {
	id: number;
	code: string;
	name: string;
	defaultDurationMinutes: number;
	serviceId?: number | null;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AppointmentTypeListResponse {
	items: AppointmentType[];
}

export interface AvailabilitySlot {
	practitionerId: number;
	serviceId: number;
	startAt: string;
	endAt: string;
	durationMinutes: number;
	appointmentTypeId?: number;
}

export interface AvailabilityQuery {
	serviceId: number;
	from: string;
	to: string;
	practitionerId?: number;
	appointmentTypeId?: number;
	durationMinutes?: number;
	slotStepMinutes?: number;
}

export interface AvailabilityResponse {
	query: Record<string, unknown>;
	timezone: string;
	slots: AvailabilitySlot[];
	count: number;
	snapshotNote?: string;
}

export interface BookAppointmentRequest {
	patientId: number;
	serviceId: number;
	practitionerId?: number;
	appointmentTypeId?: number;
	startAt: string;
	durationMinutes?: number;
	reason?: string;
	idempotencyKey?: string;
}

export interface RescheduleAppointmentRequest {
	startAt: string;
	expectedScheduledAt: string;
	expectedScheduledEndAt: string;
	practitionerId?: number;
	appointmentTypeId?: number;
	durationMinutes?: number;
	reason?: string;
	idempotencyKey?: string;
}

export interface CancelAppointmentRequest {
	reason?: string;
	idempotencyKey?: string;
}

export interface NoShowAppointmentRequest {
	reason?: string;
	idempotencyKey?: string;
}

export interface AppointmentCheckInRequest {
	identityConfirmed: true;
	financeOverride?: boolean;
	financeOverrideNote?: string;
	priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
}

/** Raw ticket returned by LOT 23F check-in (not enriched TicketDTO). */
export interface AppointmentCheckInResult {
	id: number;
	reference: string;
	patientId: number;
	appointmentId?: number;
	serviceId: number;
	stage: string;
	status: string;
	financeStatus: string;
	createdAt: string;
	updatedAt: string;
}
