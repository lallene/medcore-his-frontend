export type MedicationFamily = {
	id: number;
	code: string;
	name: string;
	description: string;
	isActive: boolean;
};

export type Medication = {
	id: number;
	familyId: number;
	family: MedicationFamily;
	code: string;
	name: string;
	description: string;
	isActive: boolean;
};

export type MedicationPresentation = {
	id: number;
	medicationId: number;
	medication: Medication;
	code: string;
	dosage: string;
	form: string;
	route: string;
	unit: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};
