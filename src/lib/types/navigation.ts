export type NavigationIcon = 'dashboard' | 'patients' | 'insurance' | 'administration';

export interface NavigationItem {
	title: string;
	href: '/dashboard' | '/patients' | '/insurance/companies' | '/administration';
	icon: NavigationIcon;
}
