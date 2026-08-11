<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FlaskConical, Search, Stethoscope } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getLaboratoryOrder, listLaboratoryOrders } from '$lib/api/laboratory';
	import { isLaboratoryCategory, laboratoryStatusLabel } from '$lib/components/laboratory/state';
	import type { LaboratoryListItem, LaboratoryOrder } from '$lib/types/laboratory';
	import type { PatientConsultation } from '$lib/api/patient-consultations';
	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
	}
	let { patientId, consultations }: Props = $props();
	let orders = $state<LaboratoryListItem[]>([]),
		details = $state<Record<number, LaboratoryOrder>>({}),
		search = $state(''),
		loading = $state(true),
		error = $state('');
	const filtered = $derived(
		orders.filter((o) =>
			`${o.examName} ${o.examCode} ${o.requestNumber}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const nonLaboratoryExams = $derived(
		consultations
			.flatMap((consultation) =>
				consultation.exams
					.filter((exam) => !isLaboratoryCategory(exam.category))
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
				`${exam.name} ${exam.code} ${exam.category}`.toLowerCase().includes(search.toLowerCase())
			)
	);
	onMount(async () => {
		try {
			orders = (await listLaboratoryOrders({ patientId, limit: 100 })).data;
			const loadedDetails = await Promise.all(orders.map((order) => getLaboratoryOrder(order.id)));
			details = Object.fromEntries(loadedDetails.map((detail) => [detail.id, detail]));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
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
			<p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">Laboratoire réel</p>
			<h2 class="mt-2 text-2xl font-black">Examens du patient</h2>
			<p class="text-sm text-slate-500">
				Prescriptions, prélèvements et résultats issus de {consultations.length} consultation(s).
			</p>
		</div>
		<Button onclick={() => goto(resolve(`/patients/${patientId}/consultations/create`))}
			><Stethoscope size={16} />Nouvelle consultation</Button
		>
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-500">Demandes</p>
			<p class="text-3xl font-black">{orders.length + nonLaboratoryExams.length}</p>
		</div>
		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-600">En cours</p>
			<p class="text-3xl font-black text-blue-900">
				{orders.filter((o) => !['VALIDATED', 'CANCELLED', 'REJECTED'].includes(o.status)).length}
			</p>
		</div>
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
			<p class="text-xs font-black uppercase text-emerald-600">Validés</p>
			<p class="text-3xl font-black text-emerald-900">
				{orders.filter((o) => o.status === 'VALIDATED').length}
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
	{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{:else if loading}<p
			class="p-10 text-center"
		>
			Chargement...
		</p>{:else if filtered.length === 0}<div
			class="rounded-2xl border border-dashed p-12 text-center"
		>
			<FlaskConical class="mx-auto text-slate-300" size={40} />
			<h3 class="mt-4 font-black">Aucun examen de laboratoire</h3>
		</div>{:else}<div class="space-y-3">
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
		</div>{/if}
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
