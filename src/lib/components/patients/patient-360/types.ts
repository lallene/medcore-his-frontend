export type PatientTab =
	| 'overview'
	| 'appointments'
	| 'consultations'
	| 'medical-record'
	| 'exams'
	| 'prescriptions'
	| 'hospitalizations'
	| 'performed-acts'
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
