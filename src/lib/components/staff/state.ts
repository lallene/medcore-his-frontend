export type StaffClaims = {
	permissions?: string[];
	functions?: string[];
	specialties?: string[];
	capabilities?: string[];
};
export const can = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);
export const anyPermission = (permissions: string[], required: string[]) =>
	required.some((p) => can(permissions, p));
export const toggleCode = (values: string[], code: string) =>
	values.includes(code) ? values.filter((x) => x !== code) : [...values, code].sort();
export const permissionAreas = [
	['Patients', ['patients:read', 'patients:create', 'patients:update']],
	['Patient 360', ['patients.360.read', 'medical_records.read', 'medical_records.update']],
	['Consultations', ['consultations.read', 'consultations.create', 'consultations.update']],
	[
		'Hospitalisation',
		['hospitalizations.read', 'hospitalizations.create', 'hospitalizations.update']
	],
	['Lits', ['beds.read', 'beds.manage', 'bed_assignments.read']],
	['Laboratoire', ['laboratory.read', 'laboratory.validate']],
	['Imagerie', ['imaging.read', 'imaging.validate']],
	['Pharmacie', ['pharmacy.stock.read', 'pharmacy.dispensation.read']],
	['PEC', ['insurance.authorization.read', 'insurance.authorization.create']],
	['Facturation', ['billing.read', 'billing.create', 'billing.issue']],
	['Caisse', ['cash.session.read', 'cash.payment.create']],
	['Créances patient', ['receivables.read']],
	['Créances assurance', ['insurance_receivables.read', 'insurance_settlements.allocate']],
	['Personnel', ['staff.read', 'staff.manage']]
] as const;
