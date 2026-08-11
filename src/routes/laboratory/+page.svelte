<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FlaskConical, Search, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { listLaboratoryOrders } from '$lib/api/laboratory';
	import { laboratoryStatuses, laboratoryStatusLabel } from '$lib/components/laboratory/state';
	import type { LaboratoryListItem } from '$lib/types/laboratory';
	let items = $state<LaboratoryListItem[]>([]),
		loading = $state(true),
		error = $state(''),
		search = $state(''),
		status = $state(''),
		priority = $state(''),
		category = $state(''),
		page = $state(1),
		totalPages = $state(1),
		total = $state(0);
	let timer: ReturnType<typeof setTimeout>;
	async function load() {
		loading = true;
		error = '';
		try {
			const r = await listLaboratoryOrders({ page, limit: 20, search, status, priority, category });
			items = r.data;
			totalPages = r.meta.totalPages;
			total = r.meta.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la file du laboratoire.';
		} finally {
			loading = false;
		}
	}
	function filter() {
		page = 1;
		clearTimeout(timer);
		timer = setTimeout(load, 250);
	}
	function date(v: string) {
		return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
			new Date(v)
		);
	}
	onMount(load);
</script>

<div class="space-y-6">
	<header>
		<p class="text-xs font-black uppercase tracking-[.18em] text-violet-700">Laboratoire</p>
		<h1 class="mt-1 text-3xl font-black text-slate-900">File des examens</h1>
		<p class="mt-2 text-sm text-slate-500">
			{total} demande(s) issue(s) des prescriptions cliniques.
		</p>
	</header>
	<section
		class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4"
	>
		<label class="relative"
			><Search class="absolute left-3 top-3 text-slate-400" size={18} /><input
				aria-label="Rechercher"
				bind:value={search}
				oninput={filter}
				placeholder="Patient, examen, N°..."
				class="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm"
			/></label
		>
		<select
			aria-label="Statut"
			bind:value={status}
			onchange={filter}
			class="rounded-xl border border-slate-200 px-3 text-sm"
			><option value="">Tous les statuts</option>{#each laboratoryStatuses as s (s)}<option
					value={s}>{laboratoryStatusLabel(s)}</option
				>{/each}</select
		>
		<select
			aria-label="Priorité"
			bind:value={priority}
			onchange={filter}
			class="rounded-xl border border-slate-200 px-3 text-sm"
			><option value="">Toutes les priorités</option><option>ROUTINE</option><option>URGENT</option
			><option>STAT</option></select
		>
		<input
			aria-label="Catégorie"
			bind:value={category}
			oninput={filter}
			placeholder="Catégorie"
			class="rounded-xl border border-slate-200 px-3 text-sm"
		/>
	</section>
	{#if error}<p class="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>{/if}
	<section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		{#if loading}<p class="p-10 text-center text-slate-500">
				Chargement...
			</p>{:else if items.length === 0}<div class="p-14 text-center">
				<FlaskConical class="mx-auto text-slate-300" size={40} />
				<h2 class="mt-4 font-black">Aucune demande</h2>
				<p class="text-sm text-slate-500">Aucune prescription ne correspond aux filtres.</p>
			</div>{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"
						><tr
							><th class="p-4">Demande / patient</th><th class="p-4">Examen</th><th class="p-4"
								>Consultation</th
							><th class="p-4">Priorité</th><th class="p-4">Statut</th><th class="p-4"
								>Prélèvement</th
							></tr
						></thead
					><tbody
						>{#each items as item (item.id)}<tr
								class="cursor-pointer border-t border-slate-100 hover:bg-violet-50/40"
								onclick={() => goto(resolve(`/laboratory/${item.id}`))}
								><td class="p-4"
									><b>{item.requestNumber}</b>
									<p>{item.patientName}</p>
									<small class="text-slate-500">{item.patientCode}</small></td
								><td class="p-4"
									><b>{item.examName}</b>
									<p class="text-slate-500">{item.examCode} · {item.category || '—'}</p></td
								><td class="p-4"
									>{item.service || '—'}
									<p class="text-slate-500">
										{item.prescriber || '—'} · {date(item.prescribedAt)}
									</p></td
								><td class="p-4 font-bold">{item.priority}</td><td class="p-4"
									><span class="rounded-full bg-violet-50 px-3 py-1 font-bold text-violet-700"
										>{laboratoryStatusLabel(item.status)}</span
									></td
								><td class="p-4">{item.sampleIdentifier || '—'}</td></tr
							>{/each}</tbody
					>
				</table>
			</div>{/if}
		<footer class="flex items-center justify-between border-t p-4">
			<button
				disabled={page <= 1}
				onclick={() => {
					page--;
					load();
				}}
				class="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={18} /></button
			><span class="text-sm font-bold">Page {page} / {Math.max(totalPages, 1)}</span><button
				disabled={page >= totalPages}
				onclick={() => {
					page++;
					load();
				}}
				class="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={18} /></button
			>
		</footer>
	</section>
</div>
