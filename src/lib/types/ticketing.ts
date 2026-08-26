export type TicketStatus =
	| 'NEW'
	| 'TRIAGED'
	| 'ASSIGNED'
	| 'IN_PROGRESS'
	| 'WAITING_USER'
	| 'WAITING_THIRD_PARTY'
	| 'RESOLVED'
	| 'CLOSED'
	| 'CANCELLED'
	| 'REOPENED';
export interface Ticket {
	id: number;
	reference: string;
	type: string;
	categoryCode: string;
	subcategory: string;
	title: string;
	description: string;
	status: TicketStatus;
	priority: 'P1' | 'P2' | 'P3' | 'P4';
	impact: string;
	urgency: string;
	requesterUserId: number;
	requesterName: string;
	serviceId?: number;
	serviceName: string;
	assignedToUserId?: number;
	assignedName: string;
	assignedQueue: string;
	applicationModule: string;
	pageUrl: string;
	requestId: string;
	frontendVersion: string;
	patientRef?: string;
	encounterRef?: string;
	responseDueAt: string;
	resolutionDueAt: string;
	firstResponseAt?: string;
	resolvedAt?: string;
	closedAt?: string;
	resolutionSummary: string;
	resolutionCode: string;
	responseSlaBreached: boolean;
	resolutionSlaBreached: boolean;
	createdAt: string;
	updatedAt: string;
}
export interface TicketComment {
	id: number;
	ticketId: number;
	authorUserId: number;
	visibility: 'PUBLIC' | 'INTERNAL';
	content: string;
	createdAt: string;
}
export interface TicketHistory {
	id: number;
	ticketId: number;
	actorUserId: number;
	eventType: string;
	field: string;
	oldValue: string;
	newValue: string;
	createdAt: string;
}
export interface TicketAttachment {
	id: number;
	ticketId: number;
	originalName: string;
	mimeType: string;
	size: number;
	createdAt: string;
}
export interface TicketDetail extends Ticket {
	comments: TicketComment[];
	attachments: TicketAttachment[];
	history: TicketHistory[];
	assignments: unknown[];
}
export interface TicketPage {
	items: Ticket[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface TicketCategory {
	id: number;
	code: string;
	name: string;
	type: string;
	parentId?: number;
	active: boolean;
}
export interface TicketKPIs {
	open: number;
	newToday: number;
	p1p2: number;
	slaBreached: number;
	resolved: number;
	reopened: number;
	averageFirstResponseMinutes: number;
	mttrMinutes: number;
}
export interface TicketAgent {
	userId: number;
	name: string;
	serviceName: string;
}
export interface TicketNotification {
	id: number;
	ticketId: number;
	eventType: string;
	message: string;
	readAt?: string;
	createdAt: string;
}
export interface CreateTicketPayload {
	type: string;
	categoryCode: string;
	subcategory?: string;
	title: string;
	description: string;
	impact?: string;
	urgency?: string;
	applicationModule?: string;
	pageUrl?: string;
	requestId?: string;
	frontendVersion?: string;
	patientRef?: string;
	encounterRef?: string;
}
