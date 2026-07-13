export type ClinicalTimelineSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ClinicalTimelineEvent = {
	id: number;
	medical_record_id: number;

	event_type: string;
	category: string;

	title: string;
	description: string;

	source_type: string;
	source_id: number;

	severity: ClinicalTimelineSeverity | string;

	event_date: string;
	created_by: number;
	created_at: string;
};
