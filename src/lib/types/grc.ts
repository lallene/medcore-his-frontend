/** Contrat de GET /api/grc/dashboard (agrégats en lecture seule, calculés à `generatedAt`). */
export interface GrcCount {
	key: string;
	count: number;
}

/** Pourcentage explicite : `percent` vaut 0 quand le dénominateur est 0. */
export interface GrcRatio {
	numerator: number;
	denominator: number;
	percent: number;
}

export interface GrcDashboard {
	generatedAt: string;
	windows: { expiringSoonDays: number; dueSoonDays: number };
	summary: {
		assets: number;
		openRisks: number;
		criticalOrHighRisks: number;
		controls: number;
		evidenceIssues: number;
		openRemediationActions: number;
		openFindings: number;
		overdueItems: number;
		controlMappingCoveragePercent: number;
	};
	assets: {
		total: number;
		active: number;
		critical: number;
		byStatus: GrcCount[];
		byCriticality: GrcCount[];
	};
	risks: {
		total: number;
		open: number;
		critical: number;
		high: number;
		byStatus: GrcCount[];
		residualByLevel: GrcCount[];
		inherentByLevel: GrcCount[];
	};
	controls: {
		total: number;
		byStatus: GrcCount[];
		implementations: number;
		implementationsByStatus: GrcCount[];
		implementationsByLatestAssessmentResult: GrcCount[];
	};
	compliance: {
		frameworks: number;
		frameworksByStatus: GrcCount[];
		requirements: number;
		applicableRequirements: number;
		mappedRequirements: number;
		unmappedRequirements: number;
		controlMappingCoverage: GrcRatio;
	};
	evidence: {
		total: number;
		byStatus: GrcCount[];
		valid: number;
		expired: number;
		expiringSoon: number;
		invalid: number;
	};
	actions: {
		total: number;
		byStatus: GrcCount[];
		byPriority: GrcCount[];
		open: number;
		overdue: number;
		dueSoon: number;
	};
	assessments: {
		total: number;
		byStatus: GrcCount[];
		reassessmentDue: number;
		hasInvalidEvidence: number;
	};
	audits: { total: number; byStatus: GrcCount[] };
	findings: {
		total: number;
		byStatus: GrcCount[];
		bySeverity: GrcCount[];
		open: number;
		overdue: number;
	};
	attention: {
		criticalResidualRisks: number;
		highResidualRisks: number;
		expiredEvidence: number;
		evidenceExpiringSoon: number;
		overdueActions: number;
		actionsDueSoon: number;
		reassessmentsDue: number;
		overdueFindings: number;
	};
}

/** Service propriétaire tel que préchargé par l'API GRC. */
export interface GrcServiceRef {
	id: number;
	code: string;
	name: string;
	active: boolean;
}

/** Profil propriétaire tel que préchargé par l'API GRC (sans nom : l'utilisateur n'est pas exposé). */
export interface GrcProfileRef {
	id: number;
	employeeCode: string;
	jobTitle: string;
	active: boolean;
}

/** Actif GRC (GET /api/grc/assets[/:id]). */
export interface GrcAsset {
	id: number;
	code: string;
	name: string;
	type: string;
	description: string;
	criticality: string;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	status: string;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface GrcPage<T> {
	items: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/** Corps de POST/PUT /api/grc/assets : aucun champ géré par le serveur. */
export interface GrcAssetPayload {
	code: string;
	name: string;
	type: string;
	description: string;
	criticality: string;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	status: string;
}

/** Risque GRC (GET /api/grc/risks[/:id]). Scores et niveaux sont calculés par le serveur. */
export interface GrcRisk {
	id: number;
	reference: string;
	title: string;
	description: string;
	assetId: number | null;
	asset?: Pick<GrcAsset, 'id' | 'code' | 'name' | 'status'>;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	approverProfileId: number | null;
	approverProfile?: GrcProfileRef;
	threat: string;
	vulnerability: string;
	likelihood: number;
	impact: number;
	inherentScore: number;
	inherentLevel: string;
	residualLikelihood: number;
	residualImpact: number;
	residualScore: number;
	residualLevel: string;
	treatment: string;
	treatmentDueAt: string | null;
	status: string;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

/** Champs d'un risque utilisés par le détail d'un actif. */
export type GrcRiskSummary = Pick<
	GrcRisk,
	| 'id'
	| 'reference'
	| 'title'
	| 'inherentScore'
	| 'residualScore'
	| 'residualLevel'
	| 'treatment'
	| 'status'
>;

/** Corps de POST/PUT /api/grc/risks : ni identifiant, ni auteur, ni score, ni niveau. */
export interface GrcRiskPayload {
	reference: string;
	title: string;
	description: string;
	assetId: number | null;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	approverProfileId: number | null;
	threat: string;
	vulnerability: string;
	likelihood: number;
	impact: number;
	residualLikelihood: number;
	residualImpact: number;
	treatment: string;
	treatmentDueAt: string | null;
	status: string;
}

/** Relations lues depuis le détail d'un risque (lecture seule). */
export interface GrcLinkedControl {
	id: number;
	code: string;
	name: string;
	category: string;
	status: string;
}

export interface GrcLinkedAction {
	id: number;
	reference: string;
	title: string;
	priority: string;
	status: string;
	dueAt: string | null;
	overdue: boolean;
}

export interface GrcLinkedFinding {
	id: number;
	reference: string;
	title: string;
	severity: string;
	status: string;
	dueAt: string | null;
	overdue: boolean;
}

/** Référentiel de conformité (GET /api/grc/frameworks[/:id]). */
export interface GrcFramework {
	id: number;
	code: string;
	name: string;
	version: string;
	description: string;
	source: string;
	status: string;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/** Exigence (GET /api/grc/requirements[/:id]) ; `mappedControls` est calculé par le serveur. */
export interface GrcRequirement {
	id: number;
	frameworkId: number;
	framework?: Pick<GrcFramework, 'id' | 'code' | 'name' | 'version' | 'status'>;
	code: string;
	title: string;
	description: string;
	parentRequirementId: number | null;
	parentRequirement?: Pick<GrcRequirement, 'id' | 'code' | 'title'>;
	status: string;
	mappedControls: number;
	createdAt: string;
	updatedAt: string;
}

/** Couverture du mapping exigences → contrôles (même définition que le tableau de bord). */
export interface GrcComplianceCoverage {
	frameworkId: number | null;
	requirements: number;
	applicableRequirements: number;
	mappedRequirements: number;
	unmappedRequirements: number;
	controlMappingCoverage: GrcRatio;
}

export interface GrcCoverageReport {
	overall: GrcComplianceCoverage;
	frameworks: GrcComplianceCoverage[];
}

/** Contrôle du catalogue (GET /api/grc/controls[/:id]) ; les compteurs sont calculés par le serveur. */
export interface GrcControl {
	id: number;
	code: string;
	name: string;
	description: string;
	category: string;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	status: string;
	requirementCount: number;
	riskCount: number;
	implementationCount: number;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface GrcControlPayload {
	code: string;
	name: string;
	description: string;
	category: string;
	ownerProfileId: number | null;
	owningServiceId: number | null;
	status: string;
}

/** Mise en œuvre d'un contrôle sur un actif (GET /api/grc/control-implementations[/:id]). */
export interface GrcControlImplementation {
	id: number;
	controlId: number;
	control?: Pick<GrcControl, 'id' | 'code' | 'name' | 'status'>;
	assetId: number;
	asset?: Pick<GrcAsset, 'id' | 'code' | 'name' | 'status'>;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	status: string;
	implementationDetails: string;
	implementedAt: string | null;
	lastReviewedAt: string | null;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface GrcControlImplementationPayload {
	controlId: number;
	assetId: number;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	status: string;
	implementationDetails: string;
	implementedAt: string | null;
	lastReviewedAt: string | null;
}

/** Évaluation et preuve d'une implémentation (lecture seule, relations GRC-01C/01D). */
export interface GrcLinkedAssessment {
	id: number;
	reference: string;
	title: string;
	type: string;
	status: string;
	result: string | null;
	assessedAt: string | null;
	reassessmentDue: boolean;
	hasInvalidEvidence: boolean;
}

export interface GrcLinkedEvidence {
	id: number;
	reference: string;
	title: string;
	type: string;
	status: string;
	expiresAt: string | null;
	expired: boolean;
}

/**
 * Preuve GRC (GET /api/grc/evidence[/:id]) : métadonnées et référence documentaire,
 * jamais le document lui-même. `validity` et `expired` sont calculés par le serveur.
 */
export interface GrcEvidence {
	id: number;
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number;
	controlImplementation?: Pick<
		GrcControlImplementation,
		'id' | 'controlId' | 'assetId' | 'status'
	> & {
		control?: Pick<GrcControl, 'id' | 'code' | 'name'>;
		asset?: Pick<GrcAsset, 'id' | 'code' | 'name'>;
	};
	type: string;
	status: string;
	externalReference: string;
	collectedAt: string | null;
	validFrom: string | null;
	expiresAt: string | null;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	expired: boolean;
	validity: string;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface GrcEvidencePayload {
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number;
	type: string;
	status: string;
	externalReference: string;
	collectedAt: string | null;
	validFrom: string | null;
	expiresAt: string | null;
	ownerProfileId: number | null;
	owningServiceId: number | null;
}

/**
 * Action de remédiation (GET /api/grc/actions[/:id]) : élément du plan d'actions.
 * `dueState` et `overdue` sont calculés par le serveur.
 */
export interface GrcAction {
	id: number;
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number | null;
	controlImplementation?: Pick<
		GrcControlImplementation,
		'id' | 'controlId' | 'assetId' | 'status'
	> & {
		control?: Pick<GrcControl, 'id' | 'code' | 'name'>;
		asset?: Pick<GrcAsset, 'id' | 'code' | 'name'>;
	};
	riskId: number | null;
	risk?: Pick<GrcRisk, 'id' | 'reference' | 'title' | 'status'>;
	findingId: number | null;
	finding?: { id: number; reference: string; title: string; status: string };
	assigneeProfileId: number | null;
	assigneeProfile?: GrcProfileRef;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	priority: string;
	status: string;
	dueAt: string | null;
	completedAt: string | null;
	overdue: boolean;
	dueState: string;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface GrcActionPayload {
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number | null;
	riskId: number | null;
	findingId: number | null;
	assigneeProfileId: number | null;
	owningServiceId: number | null;
	priority: string;
	status: string;
	dueAt: string | null;
	completedAt: string | null;
}

/** Constat proposé comme cible d'une action (GET /api/grc/findings, lecture seule ici). */
export interface GrcFindingOption {
	id: number;
	reference: string;
	title: string;
	status: string;
}

/** Audit GRC (AuditEngagement) : les compteurs de constats sont calculés par le serveur. */
export interface GrcAudit {
	id: number;
	reference: string;
	title: string;
	description: string;
	scope: string;
	type: string;
	status: string;
	leadAuditorProfileId: number | null;
	leadAuditorProfile?: GrcProfileRef;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	plannedStartAt: string | null;
	plannedEndAt: string | null;
	startedAt: string | null;
	completedAt: string | null;
	findingCount: number;
	openFindingCount: number;
	overdueFindingCount: number;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

/** Corps de POST/PUT /api/grc/audits ; COMPLETED passe uniquement par /complete. */
export interface GrcAuditPayload {
	reference: string;
	title: string;
	description: string;
	scope: string;
	type: string;
	status: string;
	leadAuditorProfileId: number | null;
	owningServiceId: number | null;
	plannedStartAt: string | null;
	plannedEndAt: string | null;
	startedAt: string | null;
}

/** Constat (Finding) : source unique et immuable (audit ou évaluation). */
export interface GrcFinding {
	id: number;
	reference: string;
	title: string;
	description: string;
	auditEngagementId: number | null;
	auditEngagement?: Pick<GrcAudit, 'id' | 'reference' | 'title' | 'status'>;
	assessmentId: number | null;
	assessment?: { id: number; reference: string; title: string };
	category: string;
	severity: string;
	status: string;
	controlImplementationId: number | null;
	controlImplementation?: GrcAction['controlImplementation'];
	riskId: number | null;
	risk?: Pick<GrcRisk, 'id' | 'reference' | 'title' | 'status'>;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	dueAt: string | null;
	resolvedAt: string | null;
	closedAt: string | null;
	closureNote: string;
	overdue: boolean;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

/** Corps de POST/PUT /api/grc/findings ; CLOSED et ACCEPTED passent par /close et /accept. */
export interface GrcFindingPayload {
	reference: string;
	title: string;
	description: string;
	auditEngagementId: number | null;
	assessmentId: number | null;
	category: string;
	severity: string;
	status: string;
	controlImplementationId: number | null;
	riskId: number | null;
	ownerProfileId: number | null;
	owningServiceId: number | null;
	dueAt: string | null;
	closureNote: string;
}

/**
 * Incident de sécurité GRC (GET /api/grc/incidents[/:id]).
 * Distinct d'un ticket de support. La sévérité n'est pas un niveau de risque.
 */
export interface GrcSecurityIncident {
	id: number;
	reference: string;
	title: string;
	description: string;
	severity: string;
	status: string;
	detectedAt: string;
	occurredAt: string | null;
	resolvedAt: string | null;
	closedAt: string | null;
	riskId: number | null;
	risk?: Pick<GrcRisk, 'id' | 'reference' | 'title' | 'status' | 'residualLevel'>;
	assetId: number | null;
	asset?: Pick<GrcAsset, 'id' | 'code' | 'name' | 'status'>;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

/** Corps de POST /api/grc/incidents. Le statut initial OPEN est imposé par le serveur. */
export interface GrcSecurityIncidentPayload {
	reference: string;
	title: string;
	description: string;
	severity: string;
	detectedAt: string;
	occurredAt: string | null;
	riskId: number | null;
	assetId: number | null;
	owningServiceId: number | null;
	ownerProfileId: number | null;
}

/** Corps de PUT /api/grc/incidents/:id. CLOSED est refusé : il passe par /close. */
export interface GrcSecurityIncidentUpdatePayload extends GrcSecurityIncidentPayload {
	status: string;
}

/** Référentiel ou contrôle lié à une politique, sans dupliquer l'agrégat. */
export interface GrcPolicyLink {
	id: number;
	code: string;
	name: string;
	status: string;
}

/** Politique de gouvernance (GET /api/grc/policies[/:id]). */
export interface GrcGovernancePolicy {
	id: number;
	reference: string;
	title: string;
	description: string;
	version: string;
	status: string;
	effectiveFrom: string | null;
	effectiveTo: string | null;
	owningServiceId: number | null;
	owningService?: GrcServiceRef;
	ownerProfileId: number | null;
	ownerProfile?: GrcProfileRef;
	approverProfileId: number | null;
	approverProfile?: GrcProfileRef;
	approvedAt: string | null;
	publishedAt: string | null;
	retiredAt: string | null;
	frameworks?: GrcPolicyLink[];
	controls?: GrcPolicyLink[];
	frameworkCount: number;
	controlCount: number;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

/** Corps de POST /api/grc/policies. Le statut initial DRAFT est imposé par le serveur. */
export interface GrcGovernancePolicyPayload {
	reference: string;
	title: string;
	description: string;
	version: string;
	effectiveFrom: string | null;
	effectiveTo: string | null;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	approverProfileId: number | null;
	frameworkIds?: number[];
	controlIds?: number[];
}

/**
 * Corps de PUT /api/grc/policies/:id.
 * APPROVED, PUBLISHED et RETIRED ne sont pas des cibles : ils passent par
 * /approve, /publish et /retire. Un statut omis conserve le statut courant.
 * frameworkIds / controlIds omis conservent les liens ; [] les retire.
 */
export interface GrcGovernancePolicyUpdatePayload extends GrcGovernancePolicyPayload {
	status?: string;
}

/** Contrat de GET /api/grc/reporting. Chiffres courants, pas une série historique. */
export interface GrcReportingWindows {
	evidenceExpiringSoonDays: number;
	actionDueSoonDays: number;
}

export interface GrcReportingFrameworkScope {
	appliesTo: 'compliance';
	frameworkIds: number[];
}

export interface GrcReportingServiceCount {
	serviceId: number | null;
	code: string;
	name: string;
	count: number;
}

export interface GrcReportingFrameworkCoverage {
	frameworkId: number;
	code: string;
	name: string;
	status: string;
	activeRequirements: number;
	applicableRequirements: number;
	mappedRequirements: number;
	mappingCoverage: GrcRatio;
}

export interface GrcReporting {
	generatedAt: string;
	windows: GrcReportingWindows;
	frameworkScope: GrcReportingFrameworkScope;
	executive: {
		assetsTotal: number;
		openRisks: number;
		highCriticalOpenRisks: number;
		activeFrameworks: number;
		applicableRequirements: number;
		mappedRequirements: number;
		mappingCoverage: GrcRatio;
		controlsTotal: number;
		implementationsTotal: number;
		evidenceExpired: number;
		evidenceExpiringSoon: number;
		evidenceInvalid: number;
		openActions: number;
		overdueActions: number;
		dueSoonActions: number;
		activeAudits: number;
		openFindings: number;
		overdueFindings: number;
		activeIncidents: number;
		publishedPolicies: number;
		policiesInReview: number;
	};
	risks: {
		byStatus: GrcCount[];
		byTreatment: GrcCount[];
		openByInherentLevel: GrcCount[];
		openByResidualLevel: GrcCount[];
		highCriticalOpenRisks: number;
		openByOwningService: GrcReportingServiceCount[];
		openByAssetCriticality: GrcCount[];
	};
	compliance: {
		activeFrameworks: number;
		activeRequirements: number;
		applicableRequirements: number;
		mappedRequirements: number;
		mappingCoverage: GrcRatio;
		byFramework: GrcReportingFrameworkCoverage[];
	};
	controls: {
		total: number;
		byStatus: GrcCount[];
		implementationsTotal: number;
		implementationsByStatus: GrcCount[];
	};
	evidence: {
		byValidity: GrcCount[];
		byType: GrcCount[];
		valid: number;
		expiringSoon: number;
		expired: number;
		invalid: number;
	};
	actions: {
		byStatus: GrcCount[];
		byDueState: GrcCount[];
		openByPriority: GrcCount[];
		open: number;
		overdue: number;
		dueSoon: number;
	};
	audits: {
		byStatus: GrcCount[];
		byType: GrcCount[];
		active: number;
		completed: number;
	};
	findings: {
		byStatus: GrcCount[];
		bySeverity: GrcCount[];
		open: number;
		overdue: number;
	};
	incidents: {
		byStatus: GrcCount[];
		bySeverity: GrcCount[];
		active: number;
	};
	policies: {
		byStatus: GrcCount[];
		byOwningService: GrcReportingServiceCount[];
		published: number;
		inReview: number;
	};
}
