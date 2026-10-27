import { api } from '$lib/api/client';
import type {
	GrcAction,
	GrcActionPayload,
	GrcAsset,
	GrcAssetPayload,
	GrcAudit,
	GrcAuditPayload,
	GrcControl,
	GrcControlImplementation,
	GrcControlImplementationPayload,
	GrcControlPayload,
	GrcCoverageReport,
	GrcDashboard,
	GrcEvidence,
	GrcEvidencePayload,
	GrcFinding,
	GrcFindingOption,
	GrcFindingPayload,
	GrcFramework,
	GrcLinkedAction,
	GrcLinkedAssessment,
	GrcLinkedControl,
	GrcLinkedEvidence,
	GrcLinkedFinding,
	GrcPage,
	GrcRequirement,
	GrcRisk,
	GrcRiskPayload,
	GrcRiskSummary,
	GrcSecurityIncident,
	GrcSecurityIncidentPayload,
	GrcSecurityIncidentUpdatePayload,
	GrcGovernancePolicy,
	GrcGovernancePolicyPayload,
	GrcGovernancePolicyUpdatePayload,
	GrcReporting
} from '$lib/types/grc';

export interface GrcDashboardFilters {
	expiringSoonDays?: number;
	dueSoonDays?: number;
}

/** Les routes GRC renvoient l'objet directement (sans enveloppe `data`). */
export async function getGrcDashboard(filters: GrcDashboardFilters = {}): Promise<GrcDashboard> {
	const response = await api.get<GrcDashboard>('/api/grc/dashboard', { params: filters });
	return response.data;
}

export interface GrcReportingFilters {
	evidenceExpiringSoonDays?: number;
	actionDueSoonDays?: number;
	frameworkIds?: number[];
}

/** Reporting analytique. frameworkIds est envoyé en liste séparée par des virgules. */
export async function getGrcReporting(filters: GrcReportingFilters = {}): Promise<GrcReporting> {
	const params: Record<string, string | number> = {};
	if (filters.evidenceExpiringSoonDays != null) {
		params.evidenceExpiringSoonDays = filters.evidenceExpiringSoonDays;
	}
	if (filters.actionDueSoonDays != null) params.actionDueSoonDays = filters.actionDueSoonDays;
	if (filters.frameworkIds && filters.frameworkIds.length > 0) {
		params.frameworkIds = filters.frameworkIds.join(',');
	}
	return (await api.get<GrcReporting>('/api/grc/reporting', { params })).data;
}

export type GrcAssetQuery = Record<string, string | number>;

export async function listGrcAssets(params: GrcAssetQuery = {}): Promise<GrcPage<GrcAsset>> {
	return (await api.get<GrcPage<GrcAsset>>('/api/grc/assets', { params })).data;
}

export async function getGrcAsset(id: number): Promise<GrcAsset> {
	return (await api.get<GrcAsset>(`/api/grc/assets/${id}`)).data;
}

export async function saveGrcAsset(payload: GrcAssetPayload, id?: number): Promise<GrcAsset> {
	const response = id
		? await api.put<GrcAsset>(`/api/grc/assets/${id}`, payload)
		: await api.post<GrcAsset>('/api/grc/assets', payload);
	return response.data;
}

/** Risques liés à un actif (relation existante Risk.assetId, permission grc.risk.read). */
export async function listGrcAssetRisks(
	assetId: number,
	page = 1,
	limit = 10
): Promise<GrcPage<GrcRiskSummary>> {
	return (
		await api.get<GrcPage<GrcRiskSummary>>('/api/grc/risks', {
			params: { assetId, page, limit }
		})
	).data;
}

export type GrcRiskQuery = Record<string, string | number>;

export async function listGrcRisks(params: GrcRiskQuery = {}): Promise<GrcPage<GrcRisk>> {
	return (await api.get<GrcPage<GrcRisk>>('/api/grc/risks', { params })).data;
}

export async function getGrcRisk(id: number): Promise<GrcRisk> {
	return (await api.get<GrcRisk>(`/api/grc/risks/${id}`)).data;
}

export async function saveGrcRisk(payload: GrcRiskPayload, id?: number): Promise<GrcRisk> {
	const response = id
		? await api.put<GrcRisk>(`/api/grc/risks/${id}`, payload)
		: await api.post<GrcRisk>('/api/grc/risks', payload);
	return response.data;
}

/** Relations d'un risque, en lecture, via les filtres riskId existants (chacune sa permission). */
export async function listGrcRiskControls(riskId: number): Promise<GrcPage<GrcLinkedControl>> {
	return (
		await api.get<GrcPage<GrcLinkedControl>>('/api/grc/controls', {
			params: { riskId, limit: 50 }
		})
	).data;
}

export async function listGrcRiskActions(riskId: number): Promise<GrcPage<GrcLinkedAction>> {
	return (
		await api.get<GrcPage<GrcLinkedAction>>('/api/grc/actions', { params: { riskId, limit: 50 } })
	).data;
}

export async function listGrcRiskFindings(riskId: number): Promise<GrcPage<GrcLinkedFinding>> {
	return (
		await api.get<GrcPage<GrcLinkedFinding>>('/api/grc/findings', {
			params: { riskId, limit: 50 }
		})
	).data;
}

export type GrcComplianceQuery = Record<string, string | number | boolean>;

export async function listGrcFrameworks(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcFramework>> {
	return (await api.get<GrcPage<GrcFramework>>('/api/grc/frameworks', { params })).data;
}

export async function getGrcFramework(id: number): Promise<GrcFramework> {
	return (await api.get<GrcFramework>(`/api/grc/frameworks/${id}`)).data;
}

/** Couverture globale et, pour chaque référentiel demandé, sa propre couverture. */
export async function getGrcCoverage(frameworkIds: number[] = []): Promise<GrcCoverageReport> {
	const params = frameworkIds.length ? { frameworkIds: frameworkIds.join(',') } : {};
	return (await api.get<GrcCoverageReport>('/api/grc/compliance/coverage', { params })).data;
}

export async function listGrcRequirements(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcRequirement>> {
	return (await api.get<GrcPage<GrcRequirement>>('/api/grc/requirements', { params })).data;
}

export async function getGrcRequirement(id: number): Promise<GrcRequirement> {
	return (await api.get<GrcRequirement>(`/api/grc/requirements/${id}`)).data;
}

/** Contrôles liés à une exigence (relation RequirementControl existante). */
export async function listGrcRequirementControls(
	requirementId: number
): Promise<GrcPage<GrcLinkedControl>> {
	return (
		await api.get<GrcPage<GrcLinkedControl>>('/api/grc/controls', {
			params: { requirementId, limit: 100 }
		})
	).data;
}

export async function searchGrcControls(search: string): Promise<GrcPage<GrcLinkedControl>> {
	return (
		await api.get<GrcPage<GrcLinkedControl>>('/api/grc/controls', {
			params: { search: search || undefined, limit: 20 }
		})
	).data;
}

export async function linkGrcRequirementControl(requirementId: number, controlId: number) {
	await api.post('/api/grc/requirement-controls', { requirementId, controlId });
}

export async function unlinkGrcRequirementControl(requirementId: number, controlId: number) {
	await api.delete(`/api/grc/requirement-controls/${requirementId}/${controlId}`);
}

export async function listGrcControls(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcControl>> {
	return (await api.get<GrcPage<GrcControl>>('/api/grc/controls', { params })).data;
}

export async function getGrcControl(id: number): Promise<GrcControl> {
	return (await api.get<GrcControl>(`/api/grc/controls/${id}`)).data;
}

export async function saveGrcControl(payload: GrcControlPayload, id?: number): Promise<GrcControl> {
	const response = id
		? await api.put<GrcControl>(`/api/grc/controls/${id}`, payload)
		: await api.post<GrcControl>('/api/grc/controls', payload);
	return response.data;
}

export async function listGrcImplementations(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcControlImplementation>> {
	return (
		await api.get<GrcPage<GrcControlImplementation>>('/api/grc/control-implementations', {
			params
		})
	).data;
}

export async function getGrcImplementation(id: number): Promise<GrcControlImplementation> {
	return (await api.get<GrcControlImplementation>(`/api/grc/control-implementations/${id}`)).data;
}

export async function saveGrcImplementation(
	payload: GrcControlImplementationPayload,
	id?: number
): Promise<GrcControlImplementation> {
	const response = id
		? await api.put<GrcControlImplementation>(`/api/grc/control-implementations/${id}`, payload)
		: await api.post<GrcControlImplementation>('/api/grc/control-implementations', payload);
	return response.data;
}

/** Relations d'un contrôle via les filtres existants (chacune sa permission de lecture). */
export async function listGrcControlRequirements(controlId: number) {
	return (
		await api.get<GrcPage<GrcRequirement>>('/api/grc/requirements', {
			params: { controlId, limit: 100 }
		})
	).data;
}

export async function listGrcControlRisks(controlId: number) {
	return (await api.get<GrcPage<GrcRisk>>('/api/grc/risks', { params: { controlId, limit: 100 } }))
		.data;
}

export async function searchGrcRequirements(search: string) {
	return (
		await api.get<GrcPage<GrcRequirement>>('/api/grc/requirements', {
			params: { search: search || undefined, limit: 20 }
		})
	).data;
}

export async function searchGrcRisks(search: string) {
	return (
		await api.get<GrcPage<GrcRisk>>('/api/grc/risks', {
			params: { search: search || undefined, limit: 20 }
		})
	).data;
}

export async function linkGrcControlRisk(controlId: number, riskId: number) {
	await api.post('/api/grc/control-risks', { controlId, riskId });
}

export async function unlinkGrcControlRisk(controlId: number, riskId: number) {
	await api.delete(`/api/grc/control-risks/${controlId}/${riskId}`);
}

/** Évaluations et preuves d'une implémentation (lecture seule). */
export async function listGrcImplementationAssessments(controlImplementationId: number) {
	return (
		await api.get<GrcPage<GrcLinkedAssessment>>('/api/grc/assessments', {
			params: { controlImplementationId, limit: 50 }
		})
	).data;
}

export async function listGrcImplementationEvidence(controlImplementationId: number) {
	return (
		await api.get<GrcPage<GrcLinkedEvidence>>('/api/grc/evidence', {
			params: { controlImplementationId, limit: 50 }
		})
	).data;
}

export async function listGrcEvidence(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcEvidence>> {
	return (await api.get<GrcPage<GrcEvidence>>('/api/grc/evidence', { params })).data;
}

export async function getGrcEvidence(id: number, expiringSoonDays?: number): Promise<GrcEvidence> {
	const params = expiringSoonDays ? { expiringSoonDays } : {};
	return (await api.get<GrcEvidence>(`/api/grc/evidence/${id}`, { params })).data;
}

export async function saveGrcEvidence(
	payload: GrcEvidencePayload,
	id?: number
): Promise<GrcEvidence> {
	const response = id
		? await api.put<GrcEvidence>(`/api/grc/evidence/${id}`, payload)
		: await api.post<GrcEvidence>('/api/grc/evidence', payload);
	return response.data;
}

/** Évaluations ayant examiné une preuve (liens d'évaluation existants, lecture seule). */
export async function listGrcEvidenceAssessments(evidenceId: number) {
	return (
		await api.get<GrcPage<GrcLinkedAssessment>>('/api/grc/assessments', {
			params: { evidenceId, limit: 50 }
		})
	).data;
}

export async function listGrcActions(params: GrcComplianceQuery = {}): Promise<GrcPage<GrcAction>> {
	return (await api.get<GrcPage<GrcAction>>('/api/grc/actions', { params })).data;
}

export async function getGrcAction(id: number, dueSoonDays?: number): Promise<GrcAction> {
	const params = dueSoonDays ? { dueSoonDays } : {};
	return (await api.get<GrcAction>(`/api/grc/actions/${id}`, { params })).data;
}

export async function saveGrcAction(payload: GrcActionPayload, id?: number): Promise<GrcAction> {
	const response = id
		? await api.put<GrcAction>(`/api/grc/actions/${id}`, payload)
		: await api.post<GrcAction>('/api/grc/actions', payload);
	return response.data;
}

/** Constats ouverts proposés comme cible (les constats clôturés ou acceptés sont refusés par le serveur). */
export async function searchGrcFindings(search: string) {
	return (
		await api.get<GrcPage<GrcFindingOption>>('/api/grc/findings', {
			params: { search: search || undefined, limit: 50 }
		})
	).data;
}

export async function listGrcAudits(params: GrcComplianceQuery = {}): Promise<GrcPage<GrcAudit>> {
	return (await api.get<GrcPage<GrcAudit>>('/api/grc/audits', { params })).data;
}

export async function getGrcAudit(id: number): Promise<GrcAudit> {
	return (await api.get<GrcAudit>(`/api/grc/audits/${id}`)).data;
}

export async function saveGrcAudit(payload: GrcAuditPayload, id?: number): Promise<GrcAudit> {
	const response = id
		? await api.put<GrcAudit>(`/api/grc/audits/${id}`, payload)
		: await api.post<GrcAudit>('/api/grc/audits', payload);
	return response.data;
}

/** Clôture d'un audit : route dédiée (grc.audit.complete), sans corps. */
export async function completeGrcAudit(id: number): Promise<GrcAudit> {
	return (await api.post<GrcAudit>(`/api/grc/audits/${id}/complete`)).data;
}

export async function listGrcAuditFindings(
	auditEngagementId: number,
	params: GrcComplianceQuery = {}
) {
	return (
		await api.get<GrcPage<GrcFinding>>('/api/grc/findings', {
			params: { auditEngagementId, limit: 100, ...params }
		})
	).data;
}

export async function getGrcFinding(id: number): Promise<GrcFinding> {
	return (await api.get<GrcFinding>(`/api/grc/findings/${id}`)).data;
}

export async function saveGrcFinding(payload: GrcFindingPayload, id?: number): Promise<GrcFinding> {
	const response = id
		? await api.put<GrcFinding>(`/api/grc/findings/${id}`, payload)
		: await api.post<GrcFinding>('/api/grc/findings', payload);
	return response.data;
}

/** Clôture : route dédiée (grc.finding.close) ; refusée tant qu'une action liée est ouverte. */
export async function closeGrcFinding(id: number): Promise<GrcFinding> {
	return (await api.post<GrcFinding>(`/api/grc/findings/${id}/close`)).data;
}

/** Acceptation : route dédiée (grc.finding.accept), justification obligatoire. */
export async function acceptGrcFinding(id: number, closureNote: string): Promise<GrcFinding> {
	return (await api.post<GrcFinding>(`/api/grc/findings/${id}/accept`, { closureNote })).data;
}

export async function listGrcIncidents(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcSecurityIncident>> {
	return (await api.get<GrcPage<GrcSecurityIncident>>('/api/grc/incidents', { params })).data;
}

export async function getGrcIncident(id: number): Promise<GrcSecurityIncident> {
	return (await api.get<GrcSecurityIncident>(`/api/grc/incidents/${id}`)).data;
}

export async function createGrcIncident(
	payload: GrcSecurityIncidentPayload
): Promise<GrcSecurityIncident> {
	return (await api.post<GrcSecurityIncident>('/api/grc/incidents', payload)).data;
}

export async function updateGrcIncident(
	id: number,
	payload: GrcSecurityIncidentUpdatePayload
): Promise<GrcSecurityIncident> {
	return (await api.put<GrcSecurityIncident>(`/api/grc/incidents/${id}`, payload)).data;
}

/** Clôture : route dédiée (grc.incident.close). Le PUT ne peut pas clôturer. */
export async function closeGrcIncident(id: number): Promise<GrcSecurityIncident> {
	return (await api.post<GrcSecurityIncident>(`/api/grc/incidents/${id}/close`)).data;
}

export async function listGrcPolicies(
	params: GrcComplianceQuery = {}
): Promise<GrcPage<GrcGovernancePolicy>> {
	return (await api.get<GrcPage<GrcGovernancePolicy>>('/api/grc/policies', { params })).data;
}

export async function getGrcPolicy(id: number): Promise<GrcGovernancePolicy> {
	return (await api.get<GrcGovernancePolicy>(`/api/grc/policies/${id}`)).data;
}

export async function createGrcPolicy(
	payload: GrcGovernancePolicyPayload
): Promise<GrcGovernancePolicy> {
	return (await api.post<GrcGovernancePolicy>('/api/grc/policies', payload)).data;
}

export async function updateGrcPolicy(
	id: number,
	payload: GrcGovernancePolicyUpdatePayload
): Promise<GrcGovernancePolicy> {
	return (await api.put<GrcGovernancePolicy>(`/api/grc/policies/${id}`, payload)).data;
}

/** Approbation : route dédiée (grc.policy.approve). Le PUT ne peut pas approuver. */
export async function approveGrcPolicy(id: number): Promise<GrcGovernancePolicy> {
	return (await api.post<GrcGovernancePolicy>(`/api/grc/policies/${id}/approve`)).data;
}

/** Publication : route dédiée (grc.policy.publish). effectiveFrom est exigé. */
export async function publishGrcPolicy(id: number): Promise<GrcGovernancePolicy> {
	return (await api.post<GrcGovernancePolicy>(`/api/grc/policies/${id}/publish`)).data;
}

/** Retrait : route dédiée (grc.policy.retire). Une politique retirée est immuable. */
export async function retireGrcPolicy(id: number): Promise<GrcGovernancePolicy> {
	return (await api.post<GrcGovernancePolicy>(`/api/grc/policies/${id}/retire`)).data;
}

/** Actions de remédiation d'un constat (relation existante, permission grc.action.read). */
export async function listGrcFindingActions(findingId: number) {
	return (
		await api.get<GrcPage<GrcLinkedAction>>('/api/grc/actions', {
			params: { findingId, limit: 100 }
		})
	).data;
}
