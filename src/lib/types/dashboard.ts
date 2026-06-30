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
