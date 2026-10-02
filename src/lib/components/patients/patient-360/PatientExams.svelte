<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { FlaskConical, Search, Stethoscope } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getLaboratoryOrder, listLaboratoryOrders } from '$lib/api/laboratory';
	import { getImagingOrder, listImagingOrders } from '$lib/api/imaging';
	import { isLaboratoryCategory, laboratoryStatusLabel } from '$lib/components/laboratory/state';
	import {
		imagingModalityLabel,
		imagingStatusLabel,
		isImagingCategory
	} from '$lib/components/imaging/state';
	import type { LaboratoryListItem, LaboratoryOrder } from '$lib/types/laboratory';
	import type { ImagingListItem, ImagingOrder } from '$lib/types/imaging';
	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import { can, getStoredPermissions, isAccessDeniedError } from '$lib/rbac/permissions';
	import { errorMessageFromUnknown } from './patient-360-load';

	type BranchUi = { loading: boolean; denied: boolean; error: string };

	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
		canReadLaboratory?: boolean;
		canReadImaging?: boolean;
		canReadConsultations?: boolean;
	}
	let {
		patientId,
		consultations,
		canReadLaboratory = false,
		canReadImaging = false,
		canReadConsultations = false
	}: Props = $props();

	let orders = $state<LaboratoryListItem[]>([]);
	let details = $state<Record<number, LaboratoryOrder>>({});
	let imagingOrders = $state<ImagingListItem[]>([]);
	let imagingDetails = $state<Record<number, ImagingOrder>>({});
	let search = $state('');
	let labBranch = $state<BranchUi>({ loading: false, denied: false, error: '' });
	let imagingBranch = $state<BranchUi>({ loading: false, denied: false, error: '' });

	let loadGeneration = 0;

	const permissions = getStoredPermissions();
	const canCreateConsultation = can(permissions, 'consultations.create');

	const filtered = $derived(
		orders.filter((o) =>
			`${o.examName} ${o.examCode} ${o.requestNumber}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const filteredImaging = $derived(
		imagingOrders.filter((o) =>
			`${o.examName} ${o.examCode} ${o.orderNumber}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const nonLaboratoryExams = $derived(
		canReadConsultations
			? consultations
					.flatMap((consultation) =>
						consultation.exams
							.filter(
								(exam) => !isLaboratoryCategory(exam.category) && !isImagingCategory(exam.category)
							)
							.map((exam) => ({
								key: `${consultation.id}-${exam.id}`,
								...exam,
								consultationId: consultation.id,
								service: consultation.service,
								doctorName: consultation.doctorName,
								date: consultation.startedAt ?? consultation.createdAt
							}))
					)
					.filter((exam) =>
						`${exam.name} ${exam.code} ${exam.category}`
							.toLowerCase()
							.includes(search.toLowerCase())
					)
			: []
	);

	const anyLoading = $derived(labBranch.loading || imagingBranch.loading);
	const consultSubtitle = $derived(
		canReadConsultations
			? `Prescriptions, prélèvements et résultats issus de ${consultations.length} consultation(s).`
			: 'Laboratoire et imagerie selon vos autorisations.'
	);

	function isCurrent(token: number): boolean {
		return token === loadGeneration;
	}

	$effect(() => {
		if (!browser) return;

		const pid = patientId;
		const wantLab = canReadLaboratory;
		const wantImaging = canReadImaging;

		loadGeneration += 1;
		const token = loadGeneration;

		orders = [];
		details = {};
		imagingOrders = [];
		imagingDetails = {};
		labBranch = { loading: wantLab, denied: false, error: '' };
		imagingBranch = { loading: wantImaging, denied: false, error: '' };

		const tasks: Array<Promise<void>> = [];

		if (wantLab) {
			tasks.push(
				listLaboratoryOrders({ patientId: pid, limit: 100 })
					.then(async (laboratoryResponse) => {
						if (!isCurrent(token)) return;
						orders = laboratoryResponse.data;
						const loadedDetails = await Promise.all(
							orders.map((order) => getLaboratoryOrder(order.id))
						);
						if (!isCurrent(token)) return;
						details = Object.fromEntries(loadedDetails.map((detail) => [detail.id, detail]));
					})
					.catch((e: unknown) => {
						if (!isCurrent(token)) return;
						if (isAccessDeniedError(e)) {
							labBranch = { loading: false, denied: true, error: '' };
						} else {
							labBranch = {
								loading: false,
								denied: false,
								error: errorMessageFromUnknown(e, 'Laboratoire indisponible.')
							};
						}
					})
					.finally(() => {
						if (!isCurrent(token)) return;
						if (labBranch.loading) labBranch = { ...labBranch, loading: false };
					})
			);
		}

		if (wantImaging) {
			tasks.push(
				listImagingOrders({ patientId: pid, limit: 100 })
					.then(async (imagingResponse) => {
						if (!isCurrent(token)) return;
						imagingOrders = imagingResponse.data;
						const loadedImaging = await Promise.all(
							imagingOrders.map((order) => getImagingOrder(order.id))
						);
						if (!isCurrent(token)) return;
						imagingDetails = Object.fromEntries(loadedImaging.map((detail) => [detail.id, detail]));
					})
					.catch((e: unknown) => {
						if (!isCurrent(token)) return;
						if (isAccessDeniedError(e)) {
							imagingBranch = { loading: false, denied: true, error: '' };
						} else {
							imagingBranch = {
								loading: false,
								denied: false,
								error: errorMessageFromUnknown(e, 'Imagerie indisponible.')
							};
						}
					})
					.finally(() => {
						if (!isCurrent(token)) return;
						if (imagingBranch.loading) imagingBranch = { ...imagingBranch, loading: false };
					})
			);
		}

		void Promise.allSettled(tasks);
	});

	function date(v: string) {
		return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(v)
		);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
				Parcours diagnostique réel
			</p>
			<h2 class="mt-2 text-2xl font-black">Examens du patient</h2>
			<p class="text-sm text-slate-500">
				{consultSubtitle}
			</p>
		</div>
		{#if canCreateConsultation}
			<Button
				data-testid="patient-360-exams-new-consultation"
				onclick={() => goto(resolve(`/patients/${patientId}/consultations/create`))}
				><Stethoscope size={16} />Nouvelle consultation</Button
			>
		{/if}
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-500">Demandes</p>
			<p class="text-3xl font-black">
				{orders.length + imagingOrders.length + nonLaboratoryExams.length}
			</p>
		</div>
		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-600">En cours</p>
			<p class="text-3xl font-black text-blue-900">
				{orders.filter((o) => !['VALIDATED', 'CANCELLED', 'REJECTED'].includes(o.status)).length +
					imagingOrders.filter((o) => !['VALIDATED', 'CANCELLED'].includes(o.status)).length}
			</p>
		</div>
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
			<p class="text-xs font-black uppercase text-emerald-600">Validés</p>
			<p class="text-3xl font-black text-emerald-900">
				{orders.filter((o) => o.status === 'VALIDATED').length +
					imagingOrders.filter((o) => o.status === 'VALIDATED').length}
			</p>
		</div>
	</div>
	<label class="relative block"
		><Search class="absolute left-3 top-3 text-slate-400" size={18} /><input
			bind:value={search}
			placeholder="Rechercher un examen..."
			class="w-full rounded-xl border bg-white py-3 pl-10 pr-3"
		/></label
	>
	{#if labBranch.denied}
		<p class="rounded-xl bg-red-50 p-4 text-red-700" data-testid="patient-360-exams-lab-denied">
			Accès refusé au laboratoire.
		</p>
	{:else if labBranch.error}
		<p class="rounded-xl bg-red-50 p-4 text-red-700" data-testid="patient-360-exams-lab-error">
			{labBranch.error}
		</p>
	{/if}
	{#if imagingBranch.denied}
		<p class="rounded-xl bg-red-50 p-4 text-red-700" data-testid="patient-360-exams-imaging-denied">
			Accès refusé à l'imagerie.
		</p>
	{:else if imagingBranch.error}
		<p class="rounded-xl bg-red-50 p-4 text-red-700" data-testid="patient-360-exams-imaging-error">
			{imagingBranch.error}
		</p>
	{/if}
	{#if anyLoading}<p class="p-10 text-center">
			Chargement...
		</p>{:else if filtered.length === 0 && filteredImaging.length === 0 && nonLaboratoryExams.length === 0 && !labBranch.error && !imagingBranch.error && !labBranch.denied && !imagingBranch.denied}<div
			class="rounded-2xl border border-dashed p-12 text-center"
		>
			<FlaskConical class="mx-auto text-slate-300" size={40} />
			<h3 class="mt-4 font-black">Aucun examen</h3>
		</div>{:else if filtered.length}<section class="space-y-3">
			<h3 class="text-sm font-black uppercase tracking-wide text-slate-500">Laboratoire</h3>
			<div class="space-y-3">
				{#each filtered as order (order.id)}
					{@const detail = details[order.id]}
					<button
						onclick={() => goto(resolve(`/laboratory/${order.id}`))}
						class="flex w-full flex-col justify-between gap-3 rounded-2xl border bg-white p-5 text-left hover:border-violet-300 md:flex-row"
						><div>
							<h3 class="font-black">{order.examName}</h3>
							<p class="text-sm text-slate-500">
								{order.requestNumber} · {order.examCode} · {order.category || 'Laboratoire'}
							</p>
							<p class="mt-2 text-sm">
								{order.service || '—'} · {order.prescriber || '—'} · {date(order.prescribedAt)}
							</p>
						</div>
						<div>
							<span class="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700"
								>{laboratoryStatusLabel(order.status)}</span
							>{#if order.sampleIdentifier}<p class="mt-2 text-xs text-slate-500">
									Prélèvement {order.sampleIdentifier}
								</p>{/if}
							{#if detail?.status === 'VALIDATED' && detail.results.length}
								<p class="mt-2 text-xs font-bold text-emerald-700">
									{detail.results
										.map((result) =>
											`${result.parameter} ${result.value || result.numericValue || '—'} ${result.unit || ''}`.trim()
										)
										.join(' · ')}
								</p>
							{/if}
						</div></button
					>{/each}
			</div>
		</section>{/if}
	{#if filteredImaging.length}
		<section class="space-y-3">
			<h3 class="text-sm font-black uppercase tracking-wide text-slate-500">Imagerie</h3>
			{#each filteredImaging as imagingOrder (imagingOrder.id)}
				{@const imagingDetail = imagingDetails[imagingOrder.id]}
				<button
					onclick={() => goto(resolve(`/imaging/${imagingOrder.id}`))}
					class="flex w-full items-start justify-between rounded-2xl border border-cyan-100 bg-white p-5 text-left hover:border-cyan-300"
				>
					<span
						><b>{imagingOrder.examName}</b><small class="ml-2 text-slate-500"
							>{imagingOrder.orderNumber} · {imagingModalityLabel(imagingOrder.modality)}</small
						>
						<p class="mt-1 text-sm text-slate-500">
							{imagingOrder.service} · {imagingOrder.prescriber} · {date(imagingOrder.prescribedAt)}
						</p>
						{#if imagingDetail?.report}<p class="mt-2 text-sm">
								<b>Consultation :</b> #{imagingOrder.consultationId}
							</p>
							<p class="mt-1 text-sm">
								<b>Compte rendu :</b>
								{imagingDetail.report.findings}
							</p>
							<p class="mt-1 text-sm">
								<b>Conclusion :</b>
								{imagingDetail.report.conclusion}
							</p>
							{#if imagingDetail.report.validatedBy}<small class="text-emerald-700"
									>Validé par #{imagingDetail.report.validatedBy}</small
								>{/if}{/if}</span
					><span class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700"
						>{imagingStatusLabel(imagingOrder.status)}</span
					>
				</button>
			{/each}
		</section>
	{/if}
	{#if nonLaboratoryExams.length}
		<section class="space-y-3">
			<h3 class="text-sm font-black uppercase tracking-wide text-slate-500">
				Autres examens cliniques
			</h3>
			{#each nonLaboratoryExams as exam (exam.key)}
				<button
					onclick={() => goto(resolve(`/consultations/${exam.consultationId}`))}
					class="flex w-full items-center justify-between rounded-2xl border bg-white p-5 text-left hover:border-blue-300"
				>
					<span
						><b>{exam.name}</b><small class="ml-2 text-slate-500"
							>{exam.code} · {exam.category}</small
						>
						<p class="mt-1 text-sm text-slate-500">
							{exam.service} · {exam.doctorName} · {date(exam.date)}
						</p></span
					>
					<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
						>Prescription clinique</span
					>
				</button>
			{/each}
		</section>
	{/if}
</div>
