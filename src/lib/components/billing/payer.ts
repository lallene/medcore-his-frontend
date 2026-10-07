export type PayerMode = 'PATIENT' | 'INDIVIDUAL' | 'ORGANIZATION';

export type PayerFormState = {
	patientIsPayer: boolean;
	mode: 'INDIVIDUAL' | 'ORGANIZATION';
	displayName: string;
	phone: string;
	relationship: string;
};

export type PayerPayload = {
	mode: PayerMode;
	displayName?: string;
	phone?: string;
	relationship?: string;
	partyId?: number;
};

export const PAYER_PATIENT_LABEL = 'Le patient est le payeur';
export const PAYER_LEGACY_LABEL = 'Payeur non renseigné (historique)';

export function createPayerFormState(): PayerFormState {
	return {
		patientIsPayer: true,
		mode: 'INDIVIDUAL',
		displayName: '',
		phone: '',
		relationship: ''
	};
}

export function buildPayerPayload(form: PayerFormState): PayerPayload {
	if (form.patientIsPayer) {
		return { mode: 'PATIENT' };
	}
	if (form.mode === 'ORGANIZATION') {
		return {
			mode: 'ORGANIZATION',
			displayName: form.displayName.trim(),
			phone: form.phone.trim() || undefined
		};
	}
	return {
		mode: 'INDIVIDUAL',
		displayName: form.displayName.trim(),
		phone: form.phone.trim(),
		relationship: form.relationship.trim()
	};
}

export function validatePayerForm(form: PayerFormState): string | null {
	if (form.patientIsPayer) return null;
	if (!form.displayName.trim()) return 'Nom du payeur obligatoire';
	if (form.mode === 'INDIVIDUAL') {
		const phone = form.phone.trim();
		if (phone.length < 8) return 'Téléphone du payeur obligatoire';
		if (!form.relationship.trim()) return 'Lien avec le patient obligatoire';
	}
	if (form.mode === 'ORGANIZATION' && form.phone.trim() && form.phone.trim().length < 8) {
		return 'Téléphone du payeur invalide';
	}
	return null;
}

export function formatPayerDisplay(payment: {
	payerProvenance?: string | null;
	payerDisplayName?: string | null;
	payerIsPatient?: boolean;
	payerRelationship?: string | null;
	payerKind?: string | null;
}): string {
	if (!payment.payerProvenance || payment.payerProvenance === 'LEGACY_UNCONFIRMED') {
		return PAYER_LEGACY_LABEL;
	}
	const name = (payment.payerDisplayName || '').trim() || 'Payeur';
	if (payment.payerIsPatient) return `${name} (patient)`;
	if (payment.payerKind === 'ORGANIZATION') return `${name} (organisation)`;
	const rel = (payment.payerRelationship || '').trim();
	return rel ? `${name} (${rel})` : name;
}

export function canShowPayerPhone(permissions: string[]): boolean {
	return permissions.includes('*') || permissions.includes('billing.payer.read');
}
