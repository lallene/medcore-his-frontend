import { api } from './client';
import type {
	PerformedAct,
	PerformedActCreateRequest,
	PerformedActListParams,
	PerformedActPage,
	PerformedActVoidRequest
} from '$lib/types/performed-acts';

export const listPerformedActs = async (params: PerformedActListParams = {}) => {
	const query: Record<string, string | number> = {};
	if (params.patientId) query.patientId = params.patientId;
	if (params.status) query.status = params.status;
	if (params.category) query.category = params.category;
	if (params.consultationId) query.consultationId = params.consultationId;
	if (params.from) query.from = params.from;
	if (params.to) query.to = params.to;
	if (params.page) query.page = params.page;
	if (params.limit) query.limit = params.limit;
	return (await api.get<PerformedActPage>('/api/performed-acts', { params: query })).data;
};

export const getPerformedAct = async (id: number) =>
	(await api.get<PerformedAct>(`/api/performed-acts/${id}`)).data;

export const createPerformedAct = async (payload: PerformedActCreateRequest) =>
	(await api.post<PerformedAct>('/api/performed-acts', payload)).data;

export const voidPerformedAct = async (id: number, payload: PerformedActVoidRequest) =>
	(await api.post<PerformedAct>(`/api/performed-acts/${id}/void`, payload)).data;
