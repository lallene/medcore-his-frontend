/**
 * Cartographie centrale des intentions de statut → classes Tailwind MedCore.
 * Un même statut / intention = même représentation.
 */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

const toneClasses: Record<StatusTone, string> = {
	neutral: 'border-slate-200 bg-slate-50 text-slate-700',
	info: 'border-sky-200 bg-sky-50 text-sky-800',
	success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
	warning: 'border-amber-200 bg-amber-50 text-amber-900',
	danger: 'border-red-200 bg-red-50 text-red-800',
	primary: 'border-primary-border bg-primary-soft text-primary'
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
	PROCESSING: 'info',
	SENT: 'success',
	BREACHED: 'danger',
	OVERDUE: 'danger',

	APPROVED: 'success',
	REJECTED: 'danger',
	VALIDATED: 'success',
	PAID: 'success',
	ISSUED: 'info',
	CANCELLED_BILLING: 'danger',

	// Parcours médical, facturation et stock — mêmes tons que les badges locaux d'origine.
	ORDERED: 'info',
	SCHEDULED: 'info',
	SAMPLE_PENDING: 'warning',
	SAMPLE_COLLECTED: 'info',
	RESULT_ENTERED: 'info',
	REPORT_DRAFTED: 'warning',
	REPORT_CLOSED: 'neutral',
	REQUESTED: 'warning',
	EXECUTED: 'info',
	PERFORMED: 'success',
	VOIDED: 'danger',
	AVAILABLE: 'success',
	LOW_STOCK: 'warning',
	OUT_OF_STOCK: 'danger',
	VALID: 'success',
	EXPIRING_SOON: 'warning',
	EXPIRED: 'danger',
	DEPLETED: 'neutral',

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

/**
 * Variantes de bouton. Primaire = action principale (une par zone) ; secondaire =
 * alternative neutre contournée ; ghost = action tertiaire, teintée au repos pour
 * rester identifiable sans survol ; danger réservé aux actions destructives ;
 * success aux validations positives explicites.
 */
export const buttonVariantClasses = {
	primary:
		'border border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
	secondary:
		'border border-border-strong bg-surface text-foreground hover:border-slate-400 hover:bg-surface-muted active:bg-surface-sunken',
	ghost:
		'border border-transparent bg-primary-soft text-primary hover:border-primary-border hover:text-primary-active active:bg-primary-border/50',
	danger:
		'border border-transparent bg-danger-strong text-danger-foreground shadow-xs hover:bg-red-800 active:bg-red-900',
	success:
		'border border-transparent bg-success-strong text-success-foreground shadow-xs hover:bg-emerald-800 active:bg-emerald-900'
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;

/** Socle commun aux boutons et aux liens présentés comme des boutons. */
export const buttonBaseClasses =
	'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors [&_svg]:shrink-0';

/** Disabled pour `<button disabled>` comme pour un lien `aria-disabled`. */
export const buttonDisabledClasses =
	'disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55';

export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonSizeClasses: Record<ButtonSize, string> = {
	sm: 'min-h-control-sm px-3 text-small rounded-md',
	md: 'min-h-control px-4 text-sm rounded-lg',
	lg: 'min-h-control-lg px-5 text-sm rounded-lg'
};
