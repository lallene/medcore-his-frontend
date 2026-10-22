/** LOT AIDE — help entry served by GET /api/help/entries (already permission-filtered). */
export interface HelpEntry {
	helpKey: string;
	module: string;
	page: string;
	elementType: 'field' | 'select' | 'action' | 'status' | 'section' | 'table_column' | 'page';
	elementLabel: string;
	shortHelp: string;
	detailedHelp?: string;
	actionHelp?: string;
	sortOrder: number;
}

export interface HelpCatalogResponse {
	version: string;
	entries: HelpEntry[];
}
