export type ClinicalTimelineSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ClinicalTimelineEvent = {
	id: number;
	medical_record_id: number;
	patient_id: number;

	event_type: string;
	category: string;

	title: string;
	description: string;

	department_id: number | null;
	reference_type: string;
	reference_id: number | null;

	severity: ClinicalTimelineSeverity | string;

	event_date: string;
	created_by: number;
	created_at: string;
};
