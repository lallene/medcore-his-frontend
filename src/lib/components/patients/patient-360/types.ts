export type PatientTab =
	| 'overview'
	| 'consultations'
	| 'medical-record'
	| 'exams'
	| 'prescriptions'
	| 'hospitalizations'
	| 'insurance'
	| 'billing'
	| 'documents'
	| 'timeline';

export type PatientTabIcon = typeof import('lucide-svelte').LayoutDashboard;

export interface PatientTabItem {
	id: PatientTab;
	label: string;
	icon: PatientTabIcon;
	count?: number;
}
