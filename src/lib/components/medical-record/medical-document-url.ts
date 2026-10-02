/**
 * LOT28E-C2-A — MedicalDocument external reference URL trust (frontend UX mirror).
 * Backend remains authoritative.
 */

export const MEDICAL_DOCUMENT_FILE_URL_MAX_LEN = 500;

/** True when value is a safe absolute HTTPS external document reference. */
export function isSafeExternalDocumentURL(value: string | null | undefined): boolean {
	const trimmed = (value ?? '').trim();
	if (!trimmed || trimmed.length > MEDICAL_DOCUMENT_FILE_URL_MAX_LEN) {
		return false;
	}
	if (!trimmed.includes('://')) {
		return false;
	}
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return false;
	}
	if (parsed.protocol.toLowerCase() !== 'https:') {
		return false;
	}
	if (!parsed.hostname) {
		return false;
	}
	// Reject embedded credentials (userinfo).
	if (parsed.username !== '' || parsed.password !== '') {
		return false;
	}
	return true;
}

/** Neutral UX copy when a stored reference cannot be opened safely. */
export function externalDocumentReferenceStatus(
	value: string | null | undefined
): 'empty' | 'safe' | 'invalid' {
	const trimmed = (value ?? '').trim();
	if (!trimmed) return 'empty';
	return isSafeExternalDocumentURL(trimmed) ? 'safe' : 'invalid';
}
