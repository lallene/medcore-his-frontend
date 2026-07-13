<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import ConsultationWorkspace from '$lib/components/consultations/ConsultationWorkspace.svelte';

	let consultationId = $derived(Number($page.params.id));
</script>

<svelte:head>
	<title>Consultation #{consultationId} — MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<div
		class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
				Consultation médicale
			</p>

			<h1 class="mt-1 text-2xl font-black text-slate-900">
				Consultation #{consultationId}
			</h1>

			<p class="mt-1 text-sm text-slate-500">
				Note clinique structurée et prise en charge du patient.
			</p>
		</div>

		<a
			href={resolve('/consultations')}
			class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
		>
			Retour aux consultations
		</a>
	</div>

	<ConsultationWorkspace {consultationId} userId={1} />
</div>
