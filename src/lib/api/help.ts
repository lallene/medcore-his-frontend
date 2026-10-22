import { api } from './client';
import type { HelpCatalogResponse } from '$lib/types/help';

/** One request for the whole visible catalog (ETag revalidation handled by the browser cache). */
export async function fetchHelpCatalog(): Promise<HelpCatalogResponse> {
	return (await api.get<HelpCatalogResponse>('/api/help/entries')).data;
}
