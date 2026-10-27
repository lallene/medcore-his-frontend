import type { GrcCount, GrcDashboard, GrcRatio } from '$lib/types/grc';
import type { ChartTone } from '../../design/charts.ts';
import { canAny } from '../../rbac/permissions.ts';

export const GRC_DASHBOARD_PERMISSION = 'grc.dashboard.read';

export const canReadGrcDashboard = (permissions: string[]) =>
	canAny(permissions, [GRC_DASHBOARD_PERMISSION]);

/** Fenêtres « bientôt » acceptées par l'API : entier de 1 à 365 jours, 30 par défaut. */
export const GRC_WINDOW_DEFAULT = 30;
export const GRC_WINDOW_MIN = 1;
export const GRC_WINDOW_MAX = 365;
export const GRC_WINDOW_OPTIONS = [7, 15, 30, 60, 90, 180, 365] as const;

/** Entier strict dans les bornes, sinon null (aucune correction silencieuse). */
export function parseGrcWindow(raw: string): number | null {
	const value = raw.trim();
	if (!/^\d+$/.test(value)) return null;
	const days = Number(value);
	return days >= GRC_WINDOW_MIN && days <= GRC_WINDOW_MAX ? days : null;
}

export const riskLevelLabel: Record<string, string> = {
	LOW: 'Faible (1–4)',
	MEDIUM: 'Modéré (5–9)',
	HIGH: 'Élevé (10–14)',
	CRITICAL: 'Critique (15–25)'
};

export const riskLevelTone: Record<string, ChartTone> = {
	LOW: 'success',
	MEDIUM: 'info',
	HIGH: 'warning',
	CRITICAL: 'danger'
};

export const severityLabel: Record<string, string> = {
	LOW: 'Faible',
	MEDIUM: 'Moyenne',
	HIGH: 'Élevée',
	CRITICAL: 'Critique'
};

export const assessmentResultLabel: Record<string, string> = {
	EFFECTIVE: 'Efficace',
	PARTIALLY_EFFECTIVE: 'Partiellement efficace',
	INEFFECTIVE: 'Inefficace',
	NOT_APPLICABLE: 'Non applicable',
	NOT_ASSESSED: 'Non évalué'
};

export const assessmentResultTone: Record<string, ChartTone> = {
	EFFECTIVE: 'success',
	PARTIALLY_EFFECTIVE: 'warning',
	INEFFECTIVE: 'danger',
	NOT_APPLICABLE: 'neutral',
	NOT_ASSESSED: 'info'
};

export const statusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	OPEN: 'Ouvert',
	IN_TREATMENT: 'En traitement',
	ACCEPTED: 'Accepté',
	CLOSED: 'Clôturé',
	ACTIVE: 'Actif',
	INACTIVE: 'Inactif',
	RETIRED: 'Retiré',
	ARCHIVED: 'Archivé',
	PLANNED: 'Planifié',
	IMPLEMENTED: 'Mis en œuvre',
	PARTIAL: 'Partiel',
	NOT_IMPLEMENTED: 'Non mis en œuvre',
	NOT_APPLICABLE: 'Non applicable',
	VALID: 'Valide',
	REVOKED: 'Révoquée',
	IN_PROGRESS: 'En cours',
	BLOCKED: 'Bloquée',
	DONE: 'Terminée',
	CANCELLED: 'Annulé',
	COMPLETED: 'Terminé',
	IN_REMEDIATION: 'En remédiation',
	RESOLVED: 'Résolu'
};

export interface GrcDistributionRow {
	id: string;
	label: string;
	value: number;
	tone: ChartTone;
}

/** Répartition dans l'ordre de l'API ; une clé inconnue garde son code comme libellé. */
export function distributionRows(
	counts: GrcCount[],
	labels: Record<string, string> = statusLabel,
	tones: Record<string, ChartTone> = {}
): GrcDistributionRow[] {
	return counts.map((c) => ({
		id: c.key,
		label: labels[c.key] ?? c.key,
		value: c.count,
		tone: tones[c.key] ?? 'primary'
	}));
}

export const formatGrcNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

export const formatGrcPercent = (value: number) =>
	`${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} %`;

/** Couverture du mapping exigences → contrôles ; ce n'est pas un score de conformité. */
export function coverageDetail(ratio: GrcRatio): string {
	if (ratio.denominator === 0) return 'Aucune exigence applicable';
	return `${formatGrcNumber(ratio.numerator)} exigence(s) couverte(s) sur ${formatGrcNumber(ratio.denominator)} applicable(s)`;
}

export function formatGeneratedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export interface GrcAttentionItem {
	id: keyof GrcDashboard['attention'];
	label: string;
	description: string;
	count: number;
	tone: 'danger' | 'warning';
}

/** Points d'attention dans un ordre fixe, sans pondération ni score global. */
export function attentionItems(d: GrcDashboard): GrcAttentionItem[] {
	const { attention: a, windows: w } = d;
	return [
		{
			id: 'criticalResidualRisks',
			label: 'Risques critiques',
			description: 'Risques ouverts au score résiduel 15–25',
			count: a.criticalResidualRisks,
			tone: 'danger'
		},
		{
			id: 'highResidualRisks',
			label: 'Risques élevés',
			description: 'Risques ouverts au score résiduel 10–14',
			count: a.highResidualRisks,
			tone: 'warning'
		},
		{
			id: 'expiredEvidence',
			label: 'Preuves expirées',
			description: 'Preuves valides dont l’échéance est dépassée',
			count: a.expiredEvidence,
			tone: 'danger'
		},
		{
			id: 'evidenceExpiringSoon',
			label: 'Preuves bientôt expirées',
			description: `Expiration dans les ${w.expiringSoonDays} prochains jours`,
			count: a.evidenceExpiringSoon,
			tone: 'warning'
		},
		{
			id: 'overdueActions',
			label: 'Actions en retard',
			description: 'Actions de remédiation non terminées dont l’échéance est dépassée',
			count: a.overdueActions,
			tone: 'danger'
		},
		{
			id: 'actionsDueSoon',
			label: 'Actions à échéance proche',
			description: `Échéance dans les ${w.dueSoonDays} prochains jours`,
			count: a.actionsDueSoon,
			tone: 'warning'
		},
		{
			id: 'reassessmentsDue',
			label: 'Réévaluations dues',
			description: 'Évaluations terminées dont la date de réévaluation est passée',
			count: a.reassessmentsDue,
			tone: 'warning'
		},
		{
			id: 'overdueFindings',
			label: 'Constats en retard',
			description: 'Constats ouverts ou en remédiation dont l’échéance est dépassée',
			count: a.overdueFindings,
			tone: 'danger'
		}
	];
}

/** Aucune donnée GRC enregistrée : la page affiche un état vide plutôt que des zéros. */
export function isGrcDashboardEmpty(d: GrcDashboard): boolean {
	return [
		d.assets.total,
		d.risks.total,
		d.controls.total,
		d.controls.implementations,
		d.compliance.frameworks,
		d.compliance.requirements,
		d.evidence.total,
		d.actions.total,
		d.assessments.total,
		d.audits.total,
		d.findings.total
	].every((total) => total === 0);
}
