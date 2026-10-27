import type { GrcComplianceCoverage } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';
import { coverageDetail, formatGrcPercent } from './dashboard-state.ts';

/** Enums backend des référentiels et exigences (aucune valeur inventée). */
export const frameworkStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	ACTIVE: 'Actif',
	ARCHIVED: 'Archivé'
};

export const requirementStatusLabel: Record<string, string> = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive'
};

export const COMPLIANCE_PAGE_SIZE = 20;

export const canReadFrameworks = (p: string[]) => canAny(p, ['grc.framework.read']);
export const canReadRequirements = (p: string[]) => canAny(p, ['grc.requirement.read']);
/** La couverture agrège les exigences des référentiels : les deux lectures sont requises. */
export const canReadCoverage = (p: string[]) => canReadFrameworks(p) && canReadRequirements(p);
export const canReadControls = (p: string[]) => canAny(p, ['grc.control.read']);
/** Le mapping exigence ↔ contrôle est géré avec la permission des contrôles (route existante). */
export const canManageMapping = (p: string[]) => canAny(p, ['grc.control.manage']);

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

/** Libellé texte du mapping d'une exigence (jamais une couleur seule). */
export const mappingLabel = (mappedControls: number) =>
	mappedControls === 0
		? 'Non couverte'
		: mappedControls === 1
			? 'Couverte · 1 contrôle'
			: `Couverte · ${mappedControls} contrôles`;

/** Présentation unique de la couverture, partagée avec le tableau de bord GRC. */
export const coveragePercent = (c?: GrcComplianceCoverage | null) =>
	c ? formatGrcPercent(c.controlMappingCoverage.percent) : '—';

export const coverageText = (c?: GrcComplianceCoverage | null) =>
	c ? coverageDetail(c.controlMappingCoverage) : '—';

export interface FrameworkFilters {
	search: string;
	status: string;
	page: number;
}

export const emptyFrameworkFilters = (): FrameworkFilters => ({ search: '', status: '', page: 1 });

export function frameworkQuery(f: FrameworkFilters, limit = COMPLIANCE_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	return query;
}

export interface RequirementFilters {
	search: string;
	status: string;
	/** '' (tous), 'true' (couvertes) ou 'false' (non couvertes). */
	mapped: '' | 'true' | 'false';
	page: number;
}

export const emptyRequirementFilters = (): RequirementFilters => ({
	search: '',
	status: '',
	mapped: '',
	page: 1
});

export function requirementQuery(
	frameworkId: number,
	f: RequirementFilters,
	limit = COMPLIANCE_PAGE_SIZE
) {
	const query: Record<string, string | number> = {
		frameworkId,
		page: Math.max(1, f.page),
		limit
	};
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (f.mapped) query.mapped = f.mapped;
	return query;
}

export const hasActiveRequirementFilters = (f: RequirementFilters) =>
	!!(f.search.trim() || f.status || f.mapped);

/** Couverture d'un référentiel dans un rapport, ou null s'il n'y figure pas. */
export const coverageOf = (frameworks: GrcComplianceCoverage[], frameworkId: number) =>
	frameworks.find((c) => c.frameworkId === frameworkId) ?? null;

/** Explique un 0/0 : un référentiel non actif n'a aucune exigence applicable. */
export function coverageNote(status: string, c?: GrcComplianceCoverage | null) {
	if (!c || c.applicableRequirements > 0) return '';
	if (status !== 'ACTIVE') return 'Référentiel non actif : aucune exigence applicable.';
	return c.requirements === 0 ? 'Aucune exigence enregistrée.' : 'Aucune exigence active.';
}
