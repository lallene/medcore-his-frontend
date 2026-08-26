import { api } from './client';
import type { QACampaign, QAFilters, QAKPIs, QAPage, QATestResult } from '$lib/types/qa';
export const listQACampaigns = async (filters: QAFilters = {}) =>
	(await api.get<QAPage>('/api/qa/campaigns', { params: filters })).data;
export const getQAKPIs = async () => (await api.get<QAKPIs>('/api/qa/kpis')).data;
export const getQACampaign = async (id: number) =>
	(await api.get<QACampaign>(`/api/qa/campaigns/${id}`)).data;
export const getQATestResults = async (id: number) =>
	(await api.get<QATestResult[]>(`/api/qa/campaigns/${id}/results`)).data;
