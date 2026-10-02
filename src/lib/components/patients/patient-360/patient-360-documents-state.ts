export type DocumentsViewState = 'denied' | 'error' | 'empty' | 'list';

/** LOT28E-C1: DENIED/ERROR must never collapse to EMPTY. */
export function classifyDocumentsView(input: {
	denied: boolean;
	error: string;
	documentCount: number;
}): DocumentsViewState {
	if (input.denied) return 'denied';
	if (input.error.trim() !== '') return 'error';
	if (input.documentCount <= 0) return 'empty';
	return 'list';
}
