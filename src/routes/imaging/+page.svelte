<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ScanLine, Search, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { listImagingOrders } from '$lib/api/imaging';
	import {
		imagingModalities,
		imagingModalityLabel,
		imagingStatuses,
		imagingStatusLabel
	} from '$lib/components/imaging/state';
	import type { ImagingListItem, ImagingStatus } from '$lib/types/imaging';
	let items = $state<ImagingListItem[]>([]),
		loading = $state(true),
		error = $state(''),
		search = $state(''),
		status = $state(''),
		priority = $state(''),
		modality = $state(''),
		service = $state(''),
		dateFilter = $state(''),
		page = $state(1),
		totalPages = $state(1),
		total = $state(0),
		stats = $state<Record<string, number>>({});
	let timer: ReturnType<typeof setTimeout>;
	async function load() {
		loading = true;
		error = '';
		try {
			const r = await listImagingOrders({
				page,
				limit: 20,
				search,
				status,
				priority,
				modality,
				service,
				date: dateFilter
			});
			items = r.data;
			totalPages = r.meta.totalPages;
			total = r.meta.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}
	async function loadStats() {
		const states: ImagingStatus[] = [
			'ORDERED',
			'SCHEDULED',
			'IN_PROGRESS',
			'REPORT_DRAFTED',
			'VALIDATED'
		];
		const counts = await Promise.all(
			states.map(
				async (s) => [s, (await listImagingOrders({ status: s, limit: 1 })).meta.total] as const
			)
		);
		const today = new Date().toISOString().slice(0, 10);
		const [urgent, stat, validatedToday] = await Promise.all([
			listImagingOrders({ priority: 'URGENT', limit: 1 }),
			listImagingOrders({ priority: 'STAT', limit: 1 }),
			listImagingOrders({ status: 'VALIDATED', date: today, limit: 1 })
		]);
		stats = {
			...Object.fromEntries(counts),
			URGENT: urgent.meta.total + stat.meta.total,
			VALIDATED_TODAY: validatedToday.meta.total
		};
	}
	function filter() {
		page = 1;
		clearTimeout(timer);
		timer = setTimeout(load, 250);
	}
	function formatDate(v: string | null) {
		return v
			? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
					new Date(v)
				)
			: '—';
	}
	onMount(() => {
		void load();
		void loadStats();
	});
</script>

<div class="space-y-6">
	<header>
		<p class="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Imagerie médicale</p>
		<h1 class="mt-1 text-3xl font-black">File d’imagerie</h1>
		<p class="mt-2 text-sm text-slate-500">{total} demande(s) opérationnelle(s).</p>
	</header>
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
		{#each [['ORDERED', 'Prescrits'], ['SCHEDULED', 'Planifiés'], ['IN_PROGRESS', 'En cours'], ['REPORT_DRAFTED', 'À valider'], ['VALIDATED_TODAY', 'Validés aujourd’hui'], ['URGENT', 'Urgents']] as metric (metric[0])}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-black uppercase text-slate-500">{metric[1]}</p>
				<p class="mt-2 text-2xl font-black text-cyan-800">
					{stats[metric[0]] ?? 0}
				</p>
			</div>{/each}
	</section>
	<section class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-3 xl:grid-cols-6">
		<label class="relative"
			><Search class="absolute left-3 top-3 text-slate-400" size={18} /><input
				aria-label="Rechercher"
				bind:value={search}
				oninput={filter}
				placeholder="Patient, examen, N°..."
				class="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"
			/></label
		><select
			aria-label="Statut"
			bind:value={status}
			onchange={filter}
			class="rounded-xl border px-3"
			><option value="">Tous les statuts</option>{#each imagingStatuses as s (s)}<option value={s}
					>{imagingStatusLabel(s)}</option
				>{/each}</select
		><select
			aria-label="Modalité"
			bind:value={modality}
			onchange={filter}
			class="rounded-xl border px-3"
			><option value="">Toutes les modalités</option>{#each imagingModalities as m (m)}<option
					value={m}>{imagingModalityLabel(m)}</option
				>{/each}</select
		><select
			aria-label="Priorité"
			bind:value={priority}
			onchange={filter}
			class="rounded-xl border px-3"
			><option value="">Toutes priorités</option><option>ROUTINE</option><option>URGENT</option
			><option>STAT</option></select
		><input
			aria-label="Service"
			bind:value={service}
			oninput={filter}
			placeholder="Service"
			class="rounded-xl border px-3"
		/><input
			aria-label="Date"
			type="date"
			bind:value={dateFilter}
			onchange={filter}
			class="rounded-xl border px-3"
		/>
	</section>
	{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
	<section class="overflow-hidden rounded-2xl border bg-white">
		{#if loading}<p class="p-12 text-center">Chargement...</p>{:else if !items.length}<div
				class="p-14 text-center"
			>
				<ScanLine class="mx-auto text-slate-300" size={42} />
				<h2 class="mt-4 font-black">Aucune demande d’imagerie</h2>
			</div>{:else}<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"
						><tr
							><th class="p-4">Demande / patient</th><th class="p-4">Examen</th><th class="p-4"
								>Consultation</th
							><th class="p-4">Priorité</th><th class="p-4">Statut</th><th class="p-4"
								>Planifié / réalisé</th
							></tr
						></thead
					><tbody
						>{#each items as item (item.id)}<tr
								class="cursor-pointer border-t hover:bg-cyan-50/40"
								onclick={() => goto(resolve(`/imaging/${item.id}`))}
								><td class="p-4"
									><b>{item.orderNumber}</b>
									<p>{item.patientName}</p>
									<small>{item.patientCode}</small></td
								><td class="p-4"
									><b>{item.examName}</b>
									<p class="text-slate-500">
										{imagingModalityLabel(item.modality)} · {item.category}
									</p></td
								><td class="p-4"
									>{item.service || '—'}
									<p class="text-slate-500">
										{item.prescriber || '—'} · {formatDate(item.prescribedAt)}
									</p></td
								><td class="p-4 font-bold">{item.priority}</td><td class="p-4"
									><span class="rounded-full bg-cyan-50 px-3 py-1 font-bold text-cyan-700"
										>{imagingStatusLabel(item.status)}</span
									></td
								><td class="p-4"
									><p>{formatDate(item.scheduledAt)}</p>
									<small class="text-slate-500">{formatDate(item.performedAt)}</small></td
								></tr
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
