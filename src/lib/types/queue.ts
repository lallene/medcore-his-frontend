export type QueueStage =
	| 'RECEPTION'
	| 'WAITING_TRIAGE'
	| 'TRIAGE_IN_PROGRESS'
	| 'WAITING_DOCTOR'
	| 'DOCTOR_IN_PROGRESS'
	| 'COMPLETED'
	| 'CANCELLED'
	| 'ON_HOLD'
	| 'NO_SHOW'
	| 'REDIRECTED';

export type QueueStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'ON_HOLD';

export type QueuePriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type QueueSource = 'APPOINTMENT' | 'WALK_IN';

export type FinanceStatus =
	'CLEAR' | 'PAYMENT_REQUIRED' | 'INSURANCE_PENDING' | 'EXEMPT' | 'BLOCKED';

export type AppointmentStatus =
	'SCHEDULED' | 'ARRIVED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type Punctuality = 'EARLY' | 'ON_TIME' | 'LATE';

export interface QueueTicket {
	id: number;
	reference: string;
	patientId: number;
	appointmentId?: number;
	source: QueueSource;
	serviceId: number;
	expectedDoctorId?: number;
	arrivedAt: string;
	checkedInAt: string;
	stage: QueueStage;
	status: QueueStatus;
	priority: QueuePriority;
	financeStatus: FinanceStatus;
	financeOverride: boolean;
	financeOverrideNote: string;
	identityConfirmed: boolean;
	triageTakenBy?: number;
	triageTakenAt?: string;
	triageCompletedBy?: number;
	triageCompletedAt?: string;
	doctorTakenBy?: number;
	doctorTakenAt?: string;
	consultationId?: number;
	vitalSignsId?: number;
	version: number;
	createdBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface VitalSummary {
	id: number;
	temperatureC?: number;
	systolicBp?: number;
	diastolicBp?: number;
	heartRate?: number;
	oxygenSaturation?: number;
	weightKg?: number;
	heightCm?: number;
	measuredAt?: string;
	abnormalTemp: boolean;
	abnormalBp: boolean;
	abnormalHr: boolean;
	abnormalSpo2: boolean;
}

export interface ClinicalSnippet {
	label: string;
	severity?: string;
}

export interface QueueTicketRow extends QueueTicket {
	patientCode: string;
	patientName: string;
	patientSex?: string;
	patientAgeYears?: number;
	patientDob?: string;
	patientPhone?: string;
	serviceName: string;
	expectedDoctorName: string;
	doctorTakenByName?: string;
	reason?: string;
	waitMinutes: number;
	punctuality?: Punctuality;
	appointmentTime?: string;
	vitalSigns?: VitalSummary;
}

export interface QueueAppointment {
	id: number;
	patientId: number;
	serviceId: number;
	expectedDoctorId?: number;
	scheduledAt: string;
	reason: string;
	status: AppointmentStatus;
	arrivedAt?: string;
	checkedInAt?: string;
	queueTicketId?: number;
	createdBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface QueueAppointmentRow extends QueueAppointment {
	patientCode: string;
	patientName: string;
	serviceName: string;
	expectedDoctorName: string;
	punctuality?: Punctuality;
	hasActiveTicket: boolean;
}

export interface QueueHistory {
	id: number;
	ticketId: number;
	actorUserID: number;
	fromStage: string;
	toStage: string;
	eventType: string;
	reason: string;
	createdAt: string;
}

export interface QueueTicketPage {
	items: QueueTicketRow[];
	total: number;
	page: number;
	limit: number;
}

export interface QueueAppointmentPage {
	items: QueueAppointmentRow[];
	total: number;
	page: number;
	limit: number;
}

export interface QueueKPIs {
	arrivedToday: number;
	waitingReception: number;
	waitingTriage: number;
	waitingDoctor: number;
	inProgress: number;
	completedToday: number;
	avgWaitMinutes: number;
	lateAppointments: number;
}

export interface DoctorWorklistKPIs {
	toTreat: number;
	urgent: number;
	inConsultation: number;
	avgWaitMinutes: number;
	completedToday: number;
	avgConsultationMinutes: number;
	lastCompletedAt?: string;
}

export interface DoctorWorklistPage {
	items: QueueTicketRow[];
	total: number;
	page: number;
	limit: number;
	kpis: DoctorWorklistKPIs;
}

export interface QueueTicketDetail {
	ticket: QueueTicketRow;
	history: QueueHistory[];
	allergies?: ClinicalSnippet[];
	histories?: ClinicalSnippet[];
}

export interface FinanceEvaluation {
	patientId: number;
	financeStatus: FinanceStatus;
}

export interface CreateAppointmentPayload {
	patientId: number;
	serviceId: number;
	expectedDoctorId?: number;
	scheduledAt: string;
	reason?: string;
}

export interface AppointmentCheckInPayload {
	identityConfirmed: boolean;
	financeOverride?: boolean;
	financeOverrideNote?: string;
	priority?: QueuePriority;
}

export interface WalkInCheckInPayload {
	patientId: number;
	serviceId: number;
	expectedDoctorId?: number;
	identityConfirmed: boolean;
	financeOverride?: boolean;
	financeOverrideNote?: string;
	priority?: QueuePriority;
	reason?: string;
}

export interface CompleteTriagePayload {
	vitalSignsId?: number;
}

export interface TakeDoctorPayload {
	createConsultation?: boolean;
}

export interface CancelTicketPayload {
	reason?: string;
}

export interface SetPriorityPayload {
	priority: QueuePriority;
	reason?: string;
}
