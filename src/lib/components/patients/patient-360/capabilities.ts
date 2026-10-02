import { can, canAny } from '../../../rbac/permissions.ts';
import { SCHEDULE_READ_PERMISSIONS } from '../../agenda/state.ts';
import { canReadPerformedActs as canReadPerformedActsBase } from '../../performed-acts/state.ts';

/** LOT28E-A Model B — Patient360 composition capabilities (permission-derived). */
export type Patient360Capabilities = {
	canEnterPatient360: boolean;
	canReadDemographics: boolean;
	canReadAppointments: boolean;
	canReadConsultations: boolean;
	canReadMedicalRecord: boolean;
	canReadLaboratory: boolean;
	canReadImaging: boolean;
	canReadExams: boolean;
	canReadPrescriptions: boolean;
	canReadHospitalizations: boolean;
	canReadPerformedActs: boolean;
	canReadInsuranceCoverage: boolean;
	canReadInsuranceAuthorizations: boolean;
	canReadInsurance: boolean;
	canReadBillingInvoices: boolean;
	canReadReceivables: boolean;
	canReadInsuranceReceivables: boolean;
	canReadBilling: boolean;
	canReadDocuments: boolean;
	canReadTimeline: boolean;
	canReadActiveCareQueue: boolean;
	canReadActiveCareMinimal: boolean;
};

export function derivePatient360Capabilities(permissions: string[]): Patient360Capabilities {
	const canReadConsultations = can(permissions, 'consultations.read');
	const canReadLaboratory = can(permissions, 'laboratory.read');
	const canReadImaging = can(permissions, 'imaging.read');
	const canReadMedicalRecord = can(permissions, 'medical_records.read');
	const canReadInsuranceCoverage = can(permissions, 'insurance.coverage.read');
	const canReadInsuranceAuthorizations = can(permissions, 'insurance.authorization.read');
	const canReadBillingInvoices = can(permissions, 'billing.read');
	const canReadReceivables = can(permissions, 'receivables.read');
	const canReadInsuranceReceivables = can(permissions, 'insurance_receivables.read');

	return {
		canEnterPatient360: can(permissions, 'patients.360.read'),
		canReadDemographics: can(permissions, 'patients:read'),
		canReadAppointments: canAny(permissions, [...SCHEDULE_READ_PERMISSIONS]),
		canReadConsultations,
		canReadMedicalRecord,
		canReadLaboratory,
		canReadImaging,
		canReadExams: canReadLaboratory || canReadImaging || canReadConsultations,
		canReadPrescriptions: canReadConsultations,
		canReadHospitalizations: can(permissions, 'hospitalizations.read'),
		canReadPerformedActs: canReadPerformedActsBase(permissions),
		canReadInsuranceCoverage,
		canReadInsuranceAuthorizations,
		canReadInsurance: canReadInsuranceCoverage || canReadInsuranceAuthorizations,
		canReadBillingInvoices,
		canReadReceivables,
		canReadInsuranceReceivables,
		canReadBilling: canReadBillingInvoices || canReadReceivables || canReadInsuranceReceivables,
		canReadDocuments: canReadConsultations,
		canReadTimeline: canReadMedicalRecord,
		canReadActiveCareQueue: canAny(permissions, [
			'queue.doctor.read',
			'queue.read.service',
			'queue.read.all'
		]),
		canReadActiveCareMinimal: can(permissions, 'patients.360.read')
	};
}

export function canEnterPatient360(permissions: string[]): boolean {
	return derivePatient360Capabilities(permissions).canEnterPatient360;
}
