export type QACampaignStatus = 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';
export interface QAArtifact {
	id: number;
	campaignId: number;
	testResultId: number | null;
	type: string;
	name: string;
	location: string;
	createdAt: string;
}
export interface QATestResult {
	id: number;
	campaignId: number;
	suite: string;
	testKey: string;
	title: string;
	status: string;
	durationMs: number;
	errorMessage?: string;
	retryCount: number;
	createdAt: string;
	artifacts: QAArtifact[];
}
export interface QACampaign {
	id: number;
	runId: string;
	runType: string;
	commitSha: string;
	branch: string;
	environment: string;
	startedAt: string;
	finishedAt: string | null;
	durationMs: number;
	total: number;
	passed: number;
	failed: number;
	skipped: number;
	notImplemented: number;
	status: QACampaignStatus;
	triggeredBy: string;
	createdAt: string;
	artifacts?: QAArtifact[];
}
export interface QAPage {
	data: QACampaign[];
	meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface QAKPIs {
	lastCampaign: QACampaign | null;
	campaigns: number;
	passed: number;
	failed: number;
	passRate: number;
}
export interface QAFilters {
	environment?: string;
	status?: string;
	dateFrom?: string;
	dateTo?: string;
	suite?: string;
	page?: number;
	limit?: number;
}
