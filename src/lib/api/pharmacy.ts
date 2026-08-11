import { api } from '$lib/api/client';
import type {
	Dispensation,
	Medication,
	MedicationFamily,
	MedicationPresentation,
	PharmacyBatch,
	PharmacyVoucher,
	PharmacyVoucherLine,
	PharmacyVoucherList,
	PharmacyStock,
	PresentationAvailability,
	PrescriptionQueueItem,
	StockMovement
} from '$lib/types/pharmacy';

export async function getMedicationPresentations(): Promise<MedicationPresentation[]> {
	const response = await api.get<MedicationPresentation[]>('/api/pharmacy/presentations');
	return response.data;
}

export async function getPresentationAvailability(): Promise<PresentationAvailability[]> {
	return (await api.get<PresentationAvailability[]>('/api/pharmacy/presentations/availability'))
		.data;
}
export async function getPharmacyFamilies(): Promise<MedicationFamily[]> {
	return (await api.get<MedicationFamily[]>('/api/pharmacy/families')).data;
}
export async function getPharmacyMedications(): Promise<Medication[]> {
	return (await api.get<Medication[]>('/api/pharmacy/medications')).data;
}
export async function getPharmacyStocks(): Promise<PharmacyStock[]> {
	return (await api.get<PharmacyStock[]>('/api/pharmacy/stocks')).data;
}
export async function getPharmacyBatches(): Promise<PharmacyBatch[]> {
	return (await api.get<PharmacyBatch[]>('/api/pharmacy/batches')).data;
}
export async function getStockMovements(): Promise<StockMovement[]> {
	return (await api.get<StockMovement[]>('/api/pharmacy/stock-movements')).data;
}
export async function getPendingPrescriptions(status = ''): Promise<PrescriptionQueueItem[]> {
	return (
		await api.get<PrescriptionQueueItem[]>(
			`/api/pharmacy/prescriptions/pending${status ? `?status=${status}` : ''}`
		)
	).data;
}
export async function getDispensations(): Promise<Dispensation[]> {
	return (await api.get<Dispensation[]>('/api/pharmacy/dispensations')).data;
}
export type PrescriptionDispensationStatus = {
	prescriptionId: number;
	presentationId: number | null;
	prescribedQuantity: number;
	dispensedQuantity: number;
	remainingQuantity: number;
	isFullyDispensed: boolean;
};
export async function getPrescriptionDispensationStatus(
	id: number
): Promise<PrescriptionDispensationStatus> {
	return (
		await api.get<PrescriptionDispensationStatus>(
			`/api/pharmacy/prescriptions/${id}/dispensation-status`
		)
	).data;
}
export async function dispensePrescription(
	item: PrescriptionQueueItem,
	quantity: number,
	notes = ''
): Promise<Dispensation> {
	return (
		await api.post<Dispensation>('/api/pharmacy/dispensations', {
			presentationId: item.presentationId,
			prescriptionId: item.prescriptionId,
			quantity,
			notes,
			idempotencyKey: crypto.randomUUID()
		})
	).data;
}

export async function getPharmacyVouchers(): Promise<PharmacyVoucherList> {
	return (await api.get<PharmacyVoucherList>('/api/pharmacy/vouchers?pageSize=100')).data;
}

export async function getPharmacyVoucher(id: number): Promise<PharmacyVoucher> {
	return (await api.get<PharmacyVoucher>(`/api/pharmacy/vouchers/${id}`)).data;
}

export async function dispenseVoucherLine(
	line: PharmacyVoucherLine,
	quantity: number
): Promise<Dispensation> {
	return (
		await api.post<Dispensation>('/api/pharmacy/dispensations', {
			presentationId: line.presentationId,
			prescriptionId: line.prescriptionId,
			quantity,
			idempotencyKey: crypto.randomUUID()
		})
	).data;
}
