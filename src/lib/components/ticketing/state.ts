import type { Ticket, TicketStatus } from '$lib/types/ticketing';

export const statusLabels: Record<TicketStatus, string> = {
	NEW: 'Nouveau',
	TRIAGED: 'Qualifié',
	ASSIGNED: 'Affecté',
	IN_PROGRESS: 'En cours',
	WAITING_USER: 'Attente utilisateur',
	WAITING_THIRD_PARTY: 'Attente tiers',
	RESOLVED: 'Résolu',
	CLOSED: 'Fermé',
	CANCELLED: 'Annulé',
	REOPENED: 'Rouvert'
};

/** Colonnes officielles de la file support — ordre stable pour UI et tests. */
export const supportQueueColumns = [
	'Référence',
	'Sujet',
	'Demandeur',
	'Service',
	'Priorité',
	'Statut',
	'Assigné',
	'SLA'
] as const;

export const emptyCell = '—';

export function supportRequesterLabel(ticket: Pick<Ticket, 'requesterName'>): string {
	const value = ticket.requesterName?.trim();
	return value || emptyCell;
}

export function supportServiceLabel(ticket: Pick<Ticket, 'serviceName'>): string {
	const value = ticket.serviceName?.trim();
	return value || emptyCell;
}

export function supportAssigneeLabel(
	ticket: Pick<Ticket, 'assignedName' | 'assignedQueue'>
): string {
	const name = ticket.assignedName?.trim();
	if (name) return name;
	const queue = ticket.assignedQueue?.trim();
	return queue || emptyCell;
}

export function supportSlaLabel(
	ticket: Pick<Ticket, 'responseSlaBreached' | 'resolutionSlaBreached'>
): string {
	return ticket.responseSlaBreached || ticket.resolutionSlaBreached ? 'Dépassé' : 'OK';
}
export const allowedNext = (status: TicketStatus): TicketStatus[] =>
	({
		NEW: ['TRIAGED', 'ASSIGNED', 'CANCELLED'],
		TRIAGED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
		ASSIGNED: ['IN_PROGRESS', 'WAITING_USER', 'WAITING_THIRD_PARTY', 'RESOLVED'],
		IN_PROGRESS: ['WAITING_USER', 'WAITING_THIRD_PARTY', 'RESOLVED'],
		WAITING_USER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
		WAITING_THIRD_PARTY: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
		RESOLVED: ['CLOSED', 'REOPENED'],
		REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
		CLOSED: [],
		CANCELLED: []
	})[status] as TicketStatus[];
export const isSlaBreached = (due: string, completed?: string) =>
	!completed && new Date(due).getTime() < Date.now();
