/**
 * LOT28E-C2-B — MedicalDocument lifecycle UI copy helpers.
 * Persisted remove = archive; unsaved remove = local discard.
 */

export function medicalDocumentRemoveAriaLabel(
	documentId: number | undefined,
	index: number
): string {
	return documentId === undefined
		? `Retirer le document non enregistré ${index + 1}`
		: `Archiver le document ${index + 1}`;
}

export function medicalDocumentRemoveTitle(documentId: number | undefined): string {
	return documentId === undefined ? 'Retirer' : 'Archiver';
}
