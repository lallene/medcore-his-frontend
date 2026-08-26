import type { TicketStatus } from '$lib/types/ticketing';
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
