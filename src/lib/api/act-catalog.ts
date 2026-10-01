import { api } from './client';
import type {
	ActCatalogCreateRequest,
	ActCatalogEntry,
	ActCatalogListParams,
	ActCatalogPage,
	ActCatalogUpdateRequest
} from '$lib/types/act-catalog';

export const listActCatalog = async (params: ActCatalogListParams = {}) => {
	const query: Record<string, string | number> = {};
	if (params.search) query.search = params.search;
	if (params.category) query.category = params.category;
	if (params.page) query.page = params.page;
	if (params.limit) query.limit = params.limit;
	if (params.active !== undefined) query.active = params.active ? 'true' : 'false';
	return (await api.get<ActCatalogPage>('/api/act-catalog', { params: query })).data;
};

export const getActCatalogEntry = async (id: number) =>
	(await api.get<ActCatalogEntry>(`/api/act-catalog/${id}`)).data;

export const createActCatalogEntry = async (payload: ActCatalogCreateRequest) =>
	(await api.post<ActCatalogEntry>('/api/act-catalog', payload)).data;

export const updateActCatalogEntry = async (id: number, payload: ActCatalogUpdateRequest) =>
	(await api.put<ActCatalogEntry>(`/api/act-catalog/${id}`, payload)).data;
