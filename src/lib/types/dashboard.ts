export interface WorkflowStats {
	draft: number;
	submitted: number;
	controlled: number;
	validated: number;
	rejected: number;
	cancelled: number;
}

export interface ActivityItem {
	time: string;
	description: string;
	type: string;
}

export interface Dashboard {
	consultations: number;
	/** Activité filtrée (service + période [from,to)). */
	hospitalizations: number;
	pharmacyPurchases: number;
	patientsSeen: number;
	queueTickets: number;
	billedAmount: number;
	/** Factures créées sur la période dont le solde patient / assurance reste dû. */
	patientReceivables: number;
	insuranceReceivables: number;
	/** Remboursements exécutés ; null quand un service est filtré (non ventilable). */
	refunds: number | null;
	/** Actes réalisés non annulés. */
	labExams: number;
	imagingExams: number;
	otherActs: number;
	patients: number;
	insured: number;
	companies: number;
	guarantors: number;
	vouchers: number;
	validated: number;
	pending: number;
	rejected: number;
	workflow: WorkflowStats;
	recentActivities: ActivityItem[];
}

export interface DashboardResponse {
	consultations: number;
	/** Activité filtrée (service + période [from,to)). */
	hospitalizations: number;
	pharmacyPurchases: number;
	patientsSeen: number;
	queueTickets: number;
	billedAmount: number;
	/** Factures créées sur la période dont le solde patient / assurance reste dû. */
	patientReceivables: number;
	insuranceReceivables: number;
	/** Remboursements exécutés ; null quand un service est filtré (non ventilable). */
	refunds: number | null;
	/** Actes réalisés non annulés. */
	labExams: number;
	imagingExams: number;
	otherActs: number;
	patients: number;
	insured: number;
	companies: number;
	guarantors: number;
	vouchers: number;
	validated: number;
	pending: number;
	rejected: number;
	workflow: {
		draft: number;
		submitted: number;
		controlled: number;
		validated: number;
		rejected: number;
		cancelled: number;
	};
	recentActivities: ActivityItem[];
}
