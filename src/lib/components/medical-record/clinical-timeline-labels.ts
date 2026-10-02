/** LOT28E — clinical timeline event labels (French UI). */

/** Backend AddVitalSign canonical runtime event type. */
export const TIMELINE_EVENT_VITAL_SIGNS_RECORDED = 'vital_signs_recorded';

/** Legacy FE-only alias — never emit; read-compat only. */
export const TIMELINE_EVENT_VITAL_SIGN_ADDED_LEGACY = 'vital_sign_added';

/** Backend AddVitalSign category (stored). */
export const TIMELINE_CATEGORY_VITAL_SIGNS = 'vital_signs';

/** Legacy singular category seen in older FE metric buckets. */
export const TIMELINE_CATEGORY_VITAL_SIGN_LEGACY = 'vital_sign';

export const TIMELINE_LABEL_VITAL_SIGNS = 'Constantes enregistrées';

export function clinicalTimelineEventLabel(
	eventType: string | null | undefined,
	fallbackTitle?: string | null
): string {
	const type = (eventType ?? '').trim().toLowerCase();
	switch (type) {
		case 'consultation_created':
			return 'Consultation créée';
		case 'consultation_completed':
			return 'Consultation terminée';
		case 'consultation_cancelled':
			return 'Consultation annulée';
		case 'consultation_status_changed':
			return 'Statut de consultation';
		case 'medication_prescribed':
			return 'Prescription médicale';
		case 'exam_requested':
			return 'Examen demandé';
		case TIMELINE_EVENT_VITAL_SIGNS_RECORDED:
		case TIMELINE_EVENT_VITAL_SIGN_ADDED_LEGACY:
			return TIMELINE_LABEL_VITAL_SIGNS;
		case 'medical_history_added':
			return 'Antécédent médical';
		case 'allergy_added':
			return 'Allergie enregistrée';
		case 'soap_updated':
			return 'Note SOAP mise à jour';
		case 'specialty_data_updated':
			return 'Volet spécialisé mis à jour';
		case 'common_medical_record_updated':
			return 'Dossier médical mis à jour';
		case 'document_added':
			return 'Document médical ajouté';
		case 'document_archived':
			return 'Document médical archivé';
		default:
			return (fallbackTitle ?? '').trim() || 'Événement clinique';
	}
}

/** True for canonical backend vital category and legacy singular FE alias. */
export function isVitalSignTimelineCategory(category: string | null | undefined): boolean {
	const value = (category ?? '').trim().toLowerCase();
	return value === TIMELINE_CATEGORY_VITAL_SIGNS || value === TIMELINE_CATEGORY_VITAL_SIGN_LEGACY;
}

/** True for canonical backend vital event type and legacy FE alias. */
export function isVitalSignTimelineEventType(eventType: string | null | undefined): boolean {
	const value = (eventType ?? '').trim().toLowerCase();
	return (
		value === TIMELINE_EVENT_VITAL_SIGNS_RECORDED ||
		value === TIMELINE_EVENT_VITAL_SIGN_ADDED_LEGACY
	);
}

/**
 * Categories that contribute to the Patient360 “dossier / constantes / documents” metric bucket.
 * Includes backend `vital_signs` and legacy `vital_sign`.
 */
export function isMedicalRecordTimelineMetricCategory(
	category: string | null | undefined
): boolean {
	const value = (category ?? '').trim().toLowerCase();
	return (
		['medical_record', 'allergy', 'medical_history', 'document'].includes(value) ||
		isVitalSignTimelineCategory(value)
	);
}
