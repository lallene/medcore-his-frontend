import type { ClinicalTimelineEvent } from '../../../types/clinical-timeline.ts';
import type {
	InsuranceAuthorization,
	PatientCoverage,
	PatientInsuranceView
} from '../../../types/insurance.ts';
import type { Patient } from '../../../types/patient.ts';

function boundedRate(value: number): number {
	return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 100));
}

function dateOnly(value: Date): string {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, '0');
	const day = String(value.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function isCurrentlyValid(coverage: PatientCoverage, today: string): boolean {
	return (
		coverage.isActive &&
		(!coverage.validFrom || coverage.validFrom <= today) &&
		(!coverage.validTo || coverage.validTo >= today)
	);
}

export function resolvePatientInsurance(
	patient: Patient,
	coverages: PatientCoverage[],
	now = new Date()
): PatientInsuranceView {
	const today = dateOnly(now);
	const structured = coverages
		.filter((coverage) => isCurrentlyValid(coverage, today))
		.sort((first, second) => {
			if (first.isPrincipal !== second.isPrincipal) return first.isPrincipal ? -1 : 1;
			const dateOrder = (second.validFrom ?? '').localeCompare(first.validFrom ?? '');
			return dateOrder || second.id - first.id;
		})[0];

	if (structured) {
		return {
			source: 'structured',
			insured: true,
			status: structured.isPrincipal ? 'Couverture principale active' : 'Couverture active',
			organization: structured.companyName?.trim() || 'Organisme non renseigné',
			guarantor: structured.guarantorName?.trim() || '—',
			memberNumber: structured.memberNumber?.trim() || '—',
			subscriber: structured.subscriber?.trim() || '—',
			beneficiary: structured.beneficiary?.trim() || '—',
			coverageRate: boundedRate(structured.coverageRate),
			validFrom: structured.validFrom || '',
			validTo: structured.validTo || ''
		};
	}

	if (patient.isAssure) {
		return {
			source: 'legacy',
			insured: true,
			status: 'Assuré (données historiques)',
			organization: 'Organisme non renseigné',
			guarantor: '—',
			memberNumber: patient.matriculeAssure?.trim() || '—',
			subscriber: '—',
			beneficiary: '—',
			coverageRate: boundedRate(patient.tauxCouverture),
			validFrom: '',
			validTo: ''
		};
	}

	return {
		source: 'none',
		insured: false,
		status: 'Non assuré',
		organization: '—',
		guarantor: '—',
		memberNumber: '—',
		subscriber: '—',
		beneficiary: '—',
		coverageRate: 0,
		validFrom: '',
		validTo: ''
	};
}

export function patientInsuranceBadge(insurance: PatientInsuranceView): {
	label: string;
	detail: string;
} {
	return insurance.insured
		? { label: 'Assuré', detail: insurance.organization }
		: { label: 'Non assuré', detail: '' };
}

export function normalizeInsuranceAuthorizations(
	authorizations: InsuranceAuthorization[]
): InsuranceAuthorization[] {
	const unique = new Map<number, InsuranceAuthorization>();
	for (const authorization of authorizations) unique.set(authorization.id, authorization);
	return [...unique.values()];
}

export function insuranceAuthorizationDisplay(authorization: InsuranceAuthorization): {
	requestedAmount: string;
	approvedRate: string;
	insuranceAmount: string;
	patientAmount: string;
	externalReference: string;
} {
	const money = (value: number | null): string =>
		value === null ? '—' : `${value.toLocaleString('fr-FR')} FCFA`;

	return {
		requestedAmount: money(authorization.requestedAmount),
		approvedRate: authorization.approvedRate === null ? '—' : `${authorization.approvedRate} %`,
		insuranceAmount: money(authorization.insuranceAmount ?? authorization.approvedAmount),
		patientAmount: money(authorization.patientAmount),
		externalReference: authorization.externalReference || '—'
	};
}

export function normalizeMedicalTimeline(events: ClinicalTimelineEvent[]): ClinicalTimelineEvent[] {
	const unique = new Map<number, ClinicalTimelineEvent>();
	for (const event of events) unique.set(event.id, event);

	return [...unique.values()].sort((first, second) => {
		const firstDate = Date.parse(first.event_date);
		const secondDate = Date.parse(second.event_date);
		const safeFirstDate = Number.isNaN(firstDate) ? 0 : firstDate;
		const safeSecondDate = Number.isNaN(secondDate) ? 0 : secondDate;
		return safeSecondDate - safeFirstDate || second.id - first.id;
	});
}
