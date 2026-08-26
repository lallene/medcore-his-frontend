/**
 * Cartographie centrale des intentions de statut → classes Tailwind MedCore.
 * Un même statut / intention = même représentation.
 */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

const toneClasses: Record<StatusTone, string> = {
	neutral: 'border-slate-200 bg-slate-100 text-slate-700',
	info: 'border-sky-200 bg-sky-50 text-sky-800',
	success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
	warning: 'border-amber-200 bg-amber-50 text-amber-900',
	danger: 'border-red-200 bg-red-50 text-red-800',
	primary: 'border-blue-200 bg-blue-50 text-[#0E4C92]'
};

/** Statuts transverses QA / workflow / clinique courants. */
const statusToneByKey: Record<string, StatusTone> = {
	PASSED: 'success',
	FAILED: 'danger',
	RUNNING: 'info',
	CANCELLED: 'neutral',
	SKIPPED: 'neutral',
	NOT_IMPLEMENTED: 'warning',

	ACTIVE: 'success',
	INACTIVE: 'neutral',
	DRAFT: 'warning',
	IN_PROGRESS: 'info',
	COMPLETED: 'success',
	RESOLVED: 'success',
	CLOSED: 'neutral',
	OPEN: 'info',
	PENDING: 'warning',
	WAITING: 'warning',
	BREACHED: 'danger',
	OVERDUE: 'danger',

	APPROVED: 'success',
	REJECTED: 'danger',
	VALIDATED: 'success',
	PAID: 'success',
	ISSUED: 'info',
	CANCELLED_BILLING: 'danger',

	NORMAL: 'success',
	LOW: 'info',
	HIGH: 'warning',
	CRITICAL: 'danger',

	P1: 'danger',
	P2: 'warning',
	P3: 'info',
	P4: 'neutral'
};

export function statusTone(status: string): StatusTone {
	const key = status.trim().toUpperCase().replace(/\s+/g, '_');
	return statusToneByKey[key] ?? 'neutral';
}

export function statusBadgeClass(status: string): string {
	return toneClasses[statusTone(status)];
}

export function toneBadgeClass(tone: StatusTone): string {
	return toneClasses[tone];
}

export const buttonVariantClasses = {
	primary:
		'bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)] focus-visible:ring-primary/30',
	secondary:
		'bg-secondary text-secondary-foreground hover:bg-slate-300 focus-visible:ring-slate-400/40',
	ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400/30',
	danger: 'bg-danger text-danger-foreground hover:bg-red-600 focus-visible:ring-danger/30',
	success: 'bg-success text-success-foreground hover:bg-emerald-600 focus-visible:ring-success/30'
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
