<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import PatientOverview from '$lib/components/patients/patient-360/PatientOverview.svelte';
	import PatientMedicalRecord from '$lib/components/patients/patient-360/PatientMedicalRecord.svelte';
	import PatientExams from '$lib/components/patients/patient-360/PatientExams.svelte';
	import PatientPrescriptions from '$lib/components/patients/patient-360/PatientPrescriptions.svelte';
	import PatientHospitalizations from '$lib/components/patients/patient-360/PatientHospitalizations.svelte';
	import PatientInsurance from '$lib/components/patients/patient-360/PatientInsurance.svelte';
	import PatientBilling from '$lib/components/patients/patient-360/PatientBilling.svelte';
	import PatientDocuments from '$lib/components/patients/patient-360/PatientDocuments.svelte';
	import PatientTimeline from '$lib/components/patients/patient-360/PatientTimeline.svelte';
	import {
		Building2,
		FileHeart,
		FileText,
		FlaskConical,
		History,
		LayoutDashboard,
		Pill,
		ReceiptText,
		Shield,
		Stethoscope
	} from 'lucide-svelte';

	import {
		getPatientConsultations,
		type PatientConsultation
	} from '$lib/api/patient-consultations';
	import { getPatientSummary } from '$lib/api/patient-summary';
	import { getPatient } from '$lib/api/patients';
	import { getPatientCoverages } from '$lib/api/insurance';
	import { getClinicalTimeline } from '$lib/api/clinical-timeline';
	import { listPatientHospitalizations } from '$lib/api/hospitalizations';
	import PatientConsultations from '$lib/components/patients/patient-360/PatientConsultations.svelte';
	import PatientHeader from '$lib/components/patients/patient-360/PatientHeader.svelte';
	import PatientTabs from '$lib/components/patients/patient-360/PatientTabs.svelte';
	import type { PatientTab, PatientTabItem } from '$lib/components/patients/patient-360/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
	import PatientActiveCareBanner from '$lib/components/patients/patient-360/PatientActiveCareBanner.svelte';

	import type { PatientSummary } from '$lib/types/patient-summary';
	import type { Patient } from '$lib/types/patient';
	import type { PatientCoverage } from '$lib/types/insurance';
	import type { ClinicalTimelineEvent } from '$lib/types/clinical-timeline';
	import type { Hospitalization } from '$lib/types/hospitalization';
	import { resolvePatientInsurance } from '$lib/components/patients/patient-360/patient-360-data';

	let activeTab = $state<PatientTab>('overview');

	let patient = $state<Patient | null>(null);
	let summary = $state<PatientSummary | null>(null);
	let consultations = $state<PatientConsultation[]>([]);
	let coverages = $state<PatientCoverage[]>([]);
	let timelineEvents = $state<ClinicalTimelineEvent[]>([]);
	let hospitalizations = $state<Hospitalization[]>([]);
	let loading = $state(true);
	let error = $state('');

	const consultationCount = $derived(consultations.length);

	const hospitalizationCount = $derived(hospitalizations.length);

	const prescriptionCount = $derived(
		consultations.reduce(
			(total, consultation) => total + (consultation.prescriptions?.length ?? 0),
			0
		)
	);

	const examCount = $derived(
		consultations.reduce((total, consultation) => total + (consultation.exams?.length ?? 0), 0)
	);

	const documentCount = $derived(summary?.statistics.documents ?? 0);

	const patientTabs = $derived<PatientTabItem[]>([
		{
			id: 'overview',
			label: 'Vue générale',
			icon: LayoutDashboard
		},
		{
			id: 'consultations',
			label: 'Consultations',
			icon: Stethoscope,
			count: consultationCount
		},
		{
			id: 'medical-record',
			label: 'Dossier médical',
			icon: FileHeart
		},
		{
			id: 'exams',
			label: 'Examens',
			icon: FlaskConical,
			count: examCount
		},
		{
			id: 'prescriptions',
			label: 'Prescriptions',
			icon: Pill,
			count: prescriptionCount
		},
		{
			id: 'hospitalizations',
			label: 'Hospitalisations',
			icon: Building2,
			count: hospitalizationCount
		},
		{
			id: 'insurance',
			label: 'Assurance',
			icon: Shield
		},
		{
			id: 'billing',
			label: 'Facturation',
			icon: ReceiptText
		},
		{
			id: 'documents',
			label: 'Documents',
			icon: FileText,
			count: documentCount
		},
		{
			id: 'timeline',
			label: 'Timeline',
			icon: History
		}
	]);

	function selectTab(tab: PatientTab): void {
		activeTab = tab;
	}

	function activeTabLabel(): string {
		return patientTabs.find((tab) => tab.id === activeTab)?.label ?? 'Module';
	}

	onMount(async () => {
		try {
			const id = Number(page.params.id);

			if (!Number.isInteger(id) || id <= 0) {
				throw new Error('Identifiant patient invalide.');
			}

			const [
				patientResponse,
				summaryResponse,
				consultationsResponse,
				coveragesResponse,
				hospitalizationsResponse
			] = await Promise.all([
				getPatient(id),
				getPatientSummary(id),
				getPatientConsultations(id),
				getPatientCoverages(id),
				listPatientHospitalizations(id)
			]);

			patient = patientResponse;
			summary = summaryResponse;
			consultations = consultationsResponse;
			coverages = coveragesResponse;
			hospitalizations = hospitalizationsResponse;
			timelineEvents = summaryResponse.medical_record.id
				? await getClinicalTimeline(summaryResponse.medical_record.id)
				: [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger la fiche patient.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Patient 360° | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du dossier patient…" class="min-h-[300px]" />
{:else if error}
	<Alert tone="danger" title="Patient 360°">{error}</Alert>
{:else if patient}
	{@const p = patient}
	{@const insurance = resolvePatientInsurance(p, coverages)}

	<div class="space-y-6">
		<Breadcrumb
			items={[
				{ label: 'Patients', href: '/patients' },
				{ label: p.codePatient || `Patient #${p.id}` }
			]}
		/>
		<PatientHeader patient={p} {insurance} />
		<PatientActiveCareBanner patientId={p.id} />

		<PatientTabs tabs={patientTabs} {activeTab} onSelect={selectTab} />

		{#if activeTab === 'overview'}
			<PatientOverview patient={p} {summary} {consultations} {insurance} {hospitalizations} />
		{:else if activeTab === 'consultations'}
			<PatientConsultations patientId={p.id} {consultations} />
		{:else if activeTab === 'medical-record'}
			<PatientMedicalRecord patient={p} {summary} {consultations} {hospitalizations} />
		{:else if activeTab === 'exams'}
			<PatientExams patientId={p.id} {consultations} />
		{:else if activeTab === 'prescriptions'}
			<PatientPrescriptions patientId={p.id} {consultations} />
		{:else if activeTab === 'hospitalizations'}
			<PatientHospitalizations patientId={p.id} {hospitalizations} />
		{:else if activeTab === 'insurance'}
			<PatientInsurance patient={p} {insurance} />
		{:else if activeTab === 'billing'}
			<PatientBilling patient={p} {consultations} {hospitalizations} />
		{:else if activeTab === 'documents'}
			<PatientDocuments {consultations} {summary} />
		{:else if activeTab === 'timeline'}
			<PatientTimeline events={timelineEvents} />
		{:else}
			<Card title={activeTabLabel()} subtitle="Module Patient 360°">
				<p>Module indisponible.</p>
			</Card>
		{/if}
	</div>
{/if}
