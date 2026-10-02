/** LOT28E-B1 — canonical clinical timeline event labels (French UI). */
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
		case 'vital_sign_added':
			return 'Constantes enregistrées';
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
