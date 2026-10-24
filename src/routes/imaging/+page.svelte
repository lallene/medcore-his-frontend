<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Search } from 'lucide-svelte';
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
		<p class="text-xs font-semibold uppercase tracking-eyebrow text-cyan-700">Imagerie médicale</p>
		<h1 class="mt-1 text-3xl font-bold">File d’imagerie</h1>
		<p class="mt-2 text-sm text-slate-500">{total} demande(s) opérationnelle(s).</p>
	</header>
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
		{#each [['ORDERED', 'Prescrits'], ['SCHEDULED', 'Planifiés'], ['IN_PROGRESS', 'En cours'], ['REPORT_DRAFTED', 'À valider'], ['VALIDATED_TODAY', 'Validés aujourd’hui'], ['URGENT', 'Urgents']] as metric (metric[0])}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-semibold uppercase text-slate-500">{metric[1]}</p>
				<p class="mt-2 text-2xl font-bold text-cyan-800">
					{stats[metric[0]] ?? 0}
				</p>
			</div>{/each}
	</section>
	<section class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-3 xl:grid-cols-6">
		<label class="relative"
			><Search class="absolute left-3 top-3 text-slate-500" size={18} /><input
				aria-label="Rechercher"
				bind:value={search}
				oninput={filter}
				placeholder="Patient, examen, N°..."
				class="w-full rounded-lg border py-2 pl-10 pr-3 text-sm"
			/></label
		><select
			aria-label="Statut"
			bind:value={status}
			onchange={filter}
			class="rounded-lg border px-3"
			><option value="">Tous les statuts</option>{#each imagingStatuses as s (s)}<option value={s}
					>{imagingStatusLabel(s)}</option
				>{/each}</select
		><select
			aria-label="Modalité"
			bind:value={modality}
			onchange={filter}
			class="rounded-lg border px-3"
			><option value="">Toutes les modalités</option>{#each imagingModalities as m (m)}<option
					value={m}>{imagingModalityLabel(m)}</option
				>{/each}</select
		><select
			aria-label="Priorité"
			bind:value={priority}
			onchange={filter}
			class="rounded-lg border px-3"
			><option value="">Toutes priorités</option><option>ROUTINE</option><option>URGENT</option
			><option>STAT</option></select
		><input
			aria-label="Service"
			bind:value={service}
			oninput={filter}
			placeholder="Service"
			class="rounded-lg border px-3"
		/><input
			aria-label="Date"
			type="date"
			bind:value={dateFilter}
			onchange={filter}
			class="rounded-lg border px-3"
		/>
	</section>
	{#if error}<Alert tone="danger">{error}</Alert>{/if}
	<section>
		<Table>
			<thead
				><tr
					><th>Demande / patient</th><th>Examen</th><th>Consultation</th><th>Priorité</th><th
						>Statut</th
					><th>Planifié / réalisé</th></tr
				></thead
			><tbody
				>{#if loading}<TableState
						state="loading"
						colspan={6}
						title="Chargement…"
					/>{:else if error && items.length === 0}<TableState
						state="error"
						colspan={6}
					/>{:else if items.length === 0}<TableState
						state="empty"
						colspan={6}
						title="Aucune demande d’imagerie"
					/>{:else}{#each items as item (item.id)}<tr
							class="cursor-pointer"
							onclick={() => goto(resolve(`/imaging/${item.id}`))}
							><td
								><a
									class="mc-id"
									href={resolve(`/imaging/${item.id}`)}
									onclick={(e) => e.stopPropagation()}>{item.orderNumber}</a
								>
								<p>{item.patientName}</p>
								<small>{item.patientCode}</small></td
							><td
								><b>{item.examName}</b>
								<p class="text-slate-500">
									{imagingModalityLabel(item.modality)} · {item.category}
								</p></td
							><td
								>{item.service || '—'}
								<p class="text-slate-500">
									{item.prescriber || '—'} · {formatDate(item.prescribedAt)}
								</p></td
							><td>{item.priority}</td><td
								><StatusBadge status={item.status} label={imagingStatusLabel(item.status)} /></td
							><td
								><p>{formatDate(item.scheduledAt)}</p>
								<small class="text-slate-500">{formatDate(item.performedAt)}</small></td
							></tr
						>{/each}{/if}</tbody
			>
		</Table>
		<Pagination
			class="mt-3"
			{page}
			totalPages={Math.max(totalPages, 1)}
			disabled={loading}
			onpage={(next) => {
				page = next;
				load();
			}}
		/>
	</section>
</div>
