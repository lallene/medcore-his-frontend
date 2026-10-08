<script lang="ts">
	import { page } from '$app/state';
	import PatientOverview from '$lib/components/patients/patient-360/PatientOverview.svelte';
	import PatientMedicalRecord from '$lib/components/patients/patient-360/PatientMedicalRecord.svelte';
	import PatientExams from '$lib/components/patients/patient-360/PatientExams.svelte';
	import PatientPrescriptions from '$lib/components/patients/patient-360/PatientPrescriptions.svelte';
	import PatientHospitalizations from '$lib/components/patients/patient-360/PatientHospitalizations.svelte';
	import PatientPerformedActs from '$lib/components/patients/patient-360/PatientPerformedActs.svelte';
	import PatientInsurance from '$lib/components/patients/patient-360/PatientInsurance.svelte';
	import PatientBilling from '$lib/components/patients/patient-360/PatientBilling.svelte';
	import PatientDocuments from '$lib/components/patients/patient-360/PatientDocuments.svelte';
	import PatientTimeline from '$lib/components/patients/patient-360/PatientTimeline.svelte';
	import PatientAppointments from '$lib/components/patients/patient-360/PatientAppointments.svelte';
	import {
		Building2,
		CalendarDays,
		ClipboardList,
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
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		derivePatient360Capabilities,
		type Patient360Capabilities
	} from '$lib/components/patients/patient-360/capabilities';
	import {
		errorMessageFromUnknown,
		tabExamCount
	} from '$lib/components/patients/patient-360/patient-360-load';
	import { getStoredPermissions, isAccessDeniedError } from '$lib/rbac/permissions';
	import { browser } from '$app/environment';
	import { resolvePatientInsurance } from '$lib/components/patients/patient-360/patient-360-data';

	import type { PatientSummary } from '$lib/types/patient-summary';
	import type { Patient } from '$lib/types/patient';
	import type { PatientCoverage } from '$lib/types/insurance';
	import type { ClinicalTimelineEvent } from '$lib/types/clinical-timeline';
	import type { Hospitalization } from '$lib/types/hospitalization';

	let activeTab = $state<PatientTab>('overview');

	let patient = $state<Patient | null>(null);
	let summary = $state<PatientSummary | null>(null);
	let consultations = $state<PatientConsultation[]>([]);
	let coverages = $state<PatientCoverage[]>([]);
	let timelineEvents = $state<ClinicalTimelineEvent[]>([]);
	let hospitalizations = $state<Hospitalization[]>([]);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let appointmentCount = $state(0);
	let sectionDenied = $state<Partial<Record<string, boolean>>>({});
	let sectionErrors = $state<Partial<Record<string, string>>>({});

	let caps = $state<Patient360Capabilities>(derivePatient360Capabilities([]));

	let patientLoadGeneration = 0;

	const consultationCount = $derived(caps.canReadConsultations ? consultations.length : undefined);

	const hospitalizationCount = $derived(
		caps.canReadHospitalizations ? hospitalizations.length : undefined
	);

	const prescriptionCount = $derived(
		caps.canReadPrescriptions
			? consultations.reduce(
					(total, consultation) => total + (consultation.prescriptions?.length ?? 0),
					0
				)
			: undefined
	);

	const examCount = $derived(tabExamCount(caps, consultations));

	const documentCount = $derived(
		!caps.canReadDocuments
			? undefined
			: caps.canReadMedicalRecord
				? sectionDenied.summary || sectionErrors.summary
					? undefined
					: (summary?.statistics.documents ?? 0)
				: sectionDenied.consultations || sectionErrors.consultations
					? undefined
					: consultations.reduce((total, c) => {
							let n = 0;
							if ((c.prescriptions?.length ?? 0) > 0) n++;
							if ((c.exams?.length ?? 0) > 0) n++;
							if (c.sickLeaveRequired) n++;
							return total + n;
						}, 0)
	);

	const patientTabs = $derived<PatientTabItem[]>([
		{
			id: 'overview',
			label: 'Vue générale',
			icon: LayoutDashboard
		},
		...(caps.canReadAppointments
			? [
					{
						id: 'appointments' as const,
						label: 'Rendez-vous',
						icon: CalendarDays,
						count: appointmentCount
					}
				]
			: []),
		...(caps.canReadConsultations
			? [
					{
						id: 'consultations' as const,
						label: 'Consultations',
						icon: Stethoscope,
						count: consultationCount
					}
				]
			: []),
		...(caps.canReadMedicalRecord
			? [
					{
						id: 'medical-record' as const,
						label: 'Dossier médical',
						icon: FileHeart
					}
				]
			: []),
		...(caps.canReadExams
			? [
					{
						id: 'exams' as const,
						label: 'Examens',
						icon: FlaskConical,
						count: examCount
					}
				]
			: []),
		...(caps.canReadPrescriptions
			? [
					{
						id: 'prescriptions' as const,
						label: 'Prescriptions',
						icon: Pill,
						count: prescriptionCount
					}
				]
			: []),
		...(caps.canReadHospitalizations
			? [
					{
						id: 'hospitalizations' as const,
						label: 'Hospitalisations',
						icon: Building2,
						count: hospitalizationCount
					}
				]
			: []),
		...(caps.canReadPerformedActs
			? [
					{
						id: 'performed-acts' as const,
						label: 'Actes réalisés',
						icon: ClipboardList
					}
				]
			: []),
		...(caps.canReadInsurance
			? [
					{
						id: 'insurance' as const,
						label: 'Assurance',
						icon: Shield
					}
				]
			: []),
		...(caps.canReadBilling
			? [
					{
						id: 'billing' as const,
						label: 'Facturation',
						icon: ReceiptText
					}
				]
			: []),
		...(caps.canReadDocuments
			? [
					{
						id: 'documents' as const,
						label: 'Documents',
						icon: FileText,
						count: documentCount
					}
				]
			: []),
		...(caps.canReadTimeline
			? [
					{
						id: 'timeline' as const,
						label: 'Timeline',
						icon: History
					}
				]
			: [])
	]);

	function selectTab(tab: PatientTab): void {
		activeTab = tab;
	}

	function activeTabLabel(): string {
		return patientTabs.find((tab) => tab.id === activeTab)?.label ?? 'Module';
	}

	function markDenied(key: string): void {
		sectionDenied = { ...sectionDenied, [key]: true };
	}

	function markSectionError(key: string, message: string): void {
		sectionErrors = { ...sectionErrors, [key]: message };
	}

	function resetPatientScopedState(): void {
		patient = null;
		summary = null;
		consultations = [];
		coverages = [];
		timelineEvents = [];
		hospitalizations = [];
		sectionDenied = {};
		sectionErrors = {};
		error = '';
		accessDenied = false;
		appointmentCount = 0;
		activeTab = 'overview';
		loading = true;
	}

	function isLoadCurrent(token: number): boolean {
		return token === patientLoadGeneration;
	}

	async function loadPatient360(id: number, token: number, permissions: string[]): Promise<void> {
		const nextCaps = derivePatient360Capabilities(permissions);
		if (!isLoadCurrent(token)) return;

		caps = nextCaps;

		if (!nextCaps.canEnterPatient360) {
			accessDenied = true;
			loading = false;
			return;
		}

		if (!Number.isInteger(id) || id <= 0) {
			error = 'Identifiant patient invalide.';
			loading = false;
			return;
		}

		if (!nextCaps.canReadDemographics) {
			accessDenied = true;
			loading = false;
			return;
		}

		try {
			const loadedPatient = await getPatient(id);
			if (!isLoadCurrent(token)) return;
			patient = loadedPatient;
		} catch (err: unknown) {
			if (!isLoadCurrent(token)) return;
			if (isAccessDeniedError(err)) {
				accessDenied = true;
				loading = false;
				return;
			}
			error = err instanceof Error ? err.message : 'Impossible de charger la fiche patient.';
			loading = false;
			return;
		}

		const moduleTasks: Array<Promise<void>> = [];

		if (nextCaps.canReadMedicalRecord) {
			moduleTasks.push(
				getPatientSummary(id)
					.then((value) => {
						if (!isLoadCurrent(token)) return;
						summary = value;
					})
					.catch((err: unknown) => {
						if (!isLoadCurrent(token)) return;
						if (isAccessDeniedError(err)) markDenied('summary');
						else markSectionError('summary', errorMessageFromUnknown(err, 'Dossier indisponible.'));
					})
			);
		}

		if (nextCaps.canReadConsultations) {
			moduleTasks.push(
				getPatientConsultations(id)
					.then((value) => {
						if (!isLoadCurrent(token)) return;
						consultations = value;
					})
					.catch((err: unknown) => {
						if (!isLoadCurrent(token)) return;
						if (isAccessDeniedError(err)) markDenied('consultations');
						else
							markSectionError(
								'consultations',
								errorMessageFromUnknown(err, 'Consultations indisponibles.')
							);
					})
			);
		}

		if (nextCaps.canReadInsuranceCoverage) {
			moduleTasks.push(
				getPatientCoverages(id)
					.then((value) => {
						if (!isLoadCurrent(token)) return;
						coverages = value;
					})
					.catch((err: unknown) => {
						if (!isLoadCurrent(token)) return;
						if (isAccessDeniedError(err)) markDenied('coverages');
						else
							markSectionError(
								'coverages',
								errorMessageFromUnknown(err, 'Couvertures indisponibles.')
							);
					})
			);
		}

		if (nextCaps.canReadHospitalizations) {
			moduleTasks.push(
				listPatientHospitalizations(id)
					.then((value) => {
						if (!isLoadCurrent(token)) return;
						hospitalizations = value;
					})
					.catch((err: unknown) => {
						if (!isLoadCurrent(token)) return;
						if (isAccessDeniedError(err)) markDenied('hospitalizations');
						else
							markSectionError(
								'hospitalizations',
								errorMessageFromUnknown(err, 'Hospitalisations indisponibles.')
							);
					})
			);
		}

		await Promise.allSettled(moduleTasks);

		if (!isLoadCurrent(token)) return;

		if (nextCaps.canReadTimeline && summary?.medical_record?.id) {
			try {
				const events = await getClinicalTimeline(summary.medical_record.id);
				if (!isLoadCurrent(token)) return;
				timelineEvents = events;
			} catch (err: unknown) {
				if (!isLoadCurrent(token)) return;
				if (isAccessDeniedError(err)) markDenied('timeline');
				else markSectionError('timeline', errorMessageFromUnknown(err, 'Timeline indisponible.'));
			}
		}

		if (isLoadCurrent(token)) {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;

		const idRaw = page.params.id;
		const permissions = getStoredPermissions();
		const id = Number(idRaw);

		patientLoadGeneration += 1;
		const token = patientLoadGeneration;

		resetPatientScopedState();

		void loadPatient360(id, token, permissions);
	});
</script>

<svelte:head>
	<title>Patient 360° | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du dossier patient…" class="min-h-[300px]" />
{:else if accessDenied}
	<AccessDenied
		title="Accès Patient 360° refusé"
		description="La permission patients.360.read est requise pour ouvrir le dossier Patient 360°."
	/>
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
			<PatientOverview
				patient={p}
				{summary}
				{consultations}
				{insurance}
				{hospitalizations}
				capabilities={caps}
				consultationsDenied={!!sectionDenied.consultations}
				consultationsError={sectionErrors.consultations ?? ''}
			/>
		{:else if activeTab === 'appointments' && caps.canReadAppointments}
			<PatientAppointments
				patient={p}
				onCountChange={(n) => {
					appointmentCount = n;
				}}
			/>
		{:else if activeTab === 'consultations' && caps.canReadConsultations}
			{#if sectionDenied.consultations}
				<Alert tone="danger" title="Accès refusé">Consultations non autorisées.</Alert>
			{:else if sectionErrors.consultations}
				<Alert tone="danger" title="Consultations">{sectionErrors.consultations}</Alert>
			{:else}
				<PatientConsultations patientId={p.id} {consultations} />
			{/if}
		{:else if activeTab === 'medical-record' && caps.canReadMedicalRecord}
			{#if sectionDenied.summary}
				<Alert tone="danger" title="Accès refusé">Dossier médical non autorisé.</Alert>
			{:else if sectionErrors.summary}
				<Alert tone="danger" title="Dossier médical">{sectionErrors.summary}</Alert>
			{:else}
				<PatientMedicalRecord patient={p} {summary} {consultations} {hospitalizations} />
			{/if}
		{:else if activeTab === 'exams' && caps.canReadExams}
			<PatientExams
				patientId={p.id}
				{consultations}
				canReadLaboratory={caps.canReadLaboratory}
				canReadImaging={caps.canReadImaging}
				canReadConsultations={caps.canReadConsultations}
			/>
		{:else if activeTab === 'prescriptions' && caps.canReadPrescriptions}
			<PatientPrescriptions patientId={p.id} {consultations} />
		{:else if activeTab === 'hospitalizations' && caps.canReadHospitalizations}
			{#if sectionDenied.hospitalizations}
				<Alert tone="danger" title="Accès refusé">Hospitalisations non autorisées.</Alert>
			{:else if sectionErrors.hospitalizations}
				<Alert tone="danger" title="Hospitalisations">{sectionErrors.hospitalizations}</Alert>
			{:else}
				<PatientHospitalizations patientId={p.id} {hospitalizations} />
			{/if}
		{:else if activeTab === 'performed-acts' && caps.canReadPerformedActs}
			<PatientPerformedActs patientId={p.id} />
		{:else if activeTab === 'insurance' && caps.canReadInsurance}
			<PatientInsurance
				patient={p}
				{insurance}
				canReadCoverage={caps.canReadInsuranceCoverage}
				canReadAuthorizations={caps.canReadInsuranceAuthorizations}
			/>
		{:else if activeTab === 'billing' && caps.canReadBilling}
			<PatientBilling
				patient={p}
				{consultations}
				{hospitalizations}
				canReadInvoices={caps.canReadBillingInvoices}
				canReadFinancialStatement={caps.canReadFinancialStatement}
				canReadReceivables={caps.canReadReceivables}
				canReadInsuranceReceivables={caps.canReadInsuranceReceivables}
			/>
		{:else if activeTab === 'documents' && caps.canReadDocuments}
			<PatientDocuments
				{consultations}
				{summary}
				consultationsDenied={!!sectionDenied.consultations}
				consultationsError={sectionErrors.consultations ?? ''}
			/>
		{:else if activeTab === 'timeline' && caps.canReadTimeline}
			{#if sectionDenied.timeline}
				<Alert tone="danger" title="Accès refusé">Timeline non autorisée.</Alert>
			{:else if sectionErrors.timeline}
				<Alert tone="danger" title="Timeline">{sectionErrors.timeline}</Alert>
			{:else}
				<PatientTimeline events={timelineEvents} />
			{/if}
		{:else}
			<Card title={activeTabLabel()} subtitle="Module Patient 360°">
				<p>Module indisponible.</p>
			</Card>
		{/if}
	</div>
{/if}
