import type { GrcCount, GrcReporting, GrcReportingFrameworkCoverage } from '$lib/types/grc';
import type { ChartTone } from '../../design/charts.ts';
import { canAny } from '../../rbac/permissions.ts';
import {
	GRC_WINDOW_DEFAULT,
	distributionRows,
	parseGrcWindow,
	riskLevelLabel,
	riskLevelTone,
	severityLabel,
	statusLabel,
	type GrcDistributionRow
} from './dashboard-state.ts';

export const GRC_REPORTING_PERMISSION = 'grc.reporting.read';
export const REPORTING_FRAMEWORK_SCOPE = 'compliance';
export const REPORTING_FRAMEWORK_FILTER_LABEL = 'Référentiels — section conformité';
export const REPORTING_MAX_FRAMEWORKS = 100;

export const canReadGrcReporting = (permissions: string[]) =>
	canAny(permissions, [GRC_REPORTING_PERMISSION]);

/** Libellés d'affichage. L'ordre des catégories reste celui renvoyé par l'API. */
export const reportingLabel: Record<string, string> = {
	...statusLabel,
	IN_REVIEW: 'En revue',
	APPROVED: 'Approuvée',
	PUBLISHED: 'Publiée',
	INVESTIGATING: 'En investigation',
	CONTAINED: 'Contenu',
	EXPIRING_SOON: 'Expire bientôt',
	EXPIRED: 'Expirée',
	INVALID: 'Invalide',
	OVERDUE: 'En retard',
	DUE_SOON: 'Échéance proche',
	UPCOMING: 'À venir',
	NO_DUE_DATE: 'Sans échéance',
	REDUCE: 'Réduire',
	ACCEPT: 'Accepter',
	AVOID: 'Éviter',
	TRANSFER: 'Transférer',
	INTERNAL: 'Interne',
	EXTERNAL: 'Externe',
	VENDOR: 'Prestataire',
	NONE: 'Sans actif',
	DOCUMENT: 'Document',
	CONFIGURATION: 'Configuration',
	LOG: 'Journal',
	SCREENSHOT: 'Capture',
	REPORT: 'Rapport',
	TEST_RESULT: 'Résultat de test',
	CERTIFICATE: 'Certificat',
	OTHER: 'Autre'
};

export const reportingSections = [
	"Vue d'ensemble",
	'Risques',
	'Conformité',
	'Contrôles',
	'Preuves',
	"Plans d'actions",
	'Audits & constats',
	'Incidents',
	'Gouvernance'
] as const;

export function reportingRows(
	counts: GrcCount[],
	labels: Record<string, string> = reportingLabel,
	tones: Record<string, ChartTone> = {}
): GrcDistributionRow[] {
	return distributionRows(counts, labels, tones);
}

export function levelRows(counts: GrcCount[]): GrcDistributionRow[] {
	return distributionRows(counts, riskLevelLabel, riskLevelTone);
}

export function severityRows(counts: GrcCount[]): GrcDistributionRow[] {
	return distributionRows(counts, { ...reportingLabel, ...severityLabel }, riskLevelTone);
}

/** Conserve l'ordre de l'API, y compris les zéros. */
export function distributionKeys(counts: GrcCount[]): string[] {
	return counts.map((item) => item.key);
}

export function toggleFramework(selected: number[], id: number): number[] {
	if (!Number.isInteger(id) || id <= 0) return selected;
	if (selected.includes(id)) return selected.filter((value) => value !== id);
	if (selected.length >= REPORTING_MAX_FRAMEWORKS) return selected;
	return [...selected, id];
}

export function reportingWindow(raw: string): number | null {
	return parseGrcWindow(raw);
}

export function isReportingZero(report: GrcReporting): boolean {
	const figures = Object.values(report.executive).filter((value) => typeof value === 'number');
	return figures.every((value) => value === 0) && report.executive.mappingCoverage.percent === 0;
}

export function frameworkOptionList(
	frameworks: GrcReportingFrameworkCoverage[]
): Array<{ id: number; label: string }> {
	return frameworks.map((framework) => ({
		id: framework.frameworkId,
		label: `${framework.code} — ${framework.name}`
	}));
}

export interface ReportingSessionView {
	access: 'denied' | 'allowed';
	phase: 'loading' | 'error' | 'ready';
	zero: boolean;
	scope: string;
	sections: readonly string[];
	viewport: 'desktop' | 'tablet' | 'mobile';
	horizontalPageScroll: false;
}

/** Simulation de la page : présentation et droits, pas un recalcul des KPI. */
export function simulateReportingSession(input: {
	permissions: string[];
	phase: 'loading' | 'error' | 'ready';
	report: GrcReporting | null;
	viewport: 'desktop' | 'tablet' | 'mobile';
}): ReportingSessionView {
	if (!canReadGrcReporting(input.permissions)) {
		return {
			access: 'denied',
			phase: input.phase,
			zero: false,
			scope: REPORTING_FRAMEWORK_SCOPE,
			sections: [],
			viewport: input.viewport,
			horizontalPageScroll: false
		};
	}
	return {
		access: 'allowed',
		phase: input.phase,
		zero: input.report != null && isReportingZero(input.report),
		scope: input.report?.frameworkScope.appliesTo ?? REPORTING_FRAMEWORK_SCOPE,
		sections: input.phase === 'ready' ? reportingSections : [],
		viewport: input.viewport,
		horizontalPageScroll: false
	};
}

export { GRC_WINDOW_DEFAULT };
