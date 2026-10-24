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
		<p class="text-xs font-semibold uppercase tracking-eyebrow text-violet-700">Laboratoire</p>
		<h1 class="mt-1 text-3xl font-bold text-slate-900">File des examens</h1>
		<p class="mt-2 text-sm text-slate-500">
			{total} demande(s) issue(s) des prescriptions cliniques.
		</p>
	</header>
	<section
		class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4"
	>
		<label class="relative"
			><Search class="absolute left-3 top-3 text-slate-500" size={18} /><input
				aria-label="Rechercher"
				bind:value={search}
				oninput={filter}
				placeholder="Patient, examen, N°..."
				class="w-full rounded-lg border border-input py-2 pl-10 pr-3 text-sm"
			/></label
		>
		<select
			aria-label="Statut"
			bind:value={status}
			onchange={filter}
			class="rounded-lg border border-input px-3 text-sm"
			><option value="">Tous les statuts</option>{#each laboratoryStatuses as s (s)}<option
					value={s}>{laboratoryStatusLabel(s)}</option
				>{/each}</select
		>
		<select
			aria-label="Priorité"
			bind:value={priority}
			onchange={filter}
			class="rounded-lg border border-input px-3 text-sm"
			><option value="">Toutes les priorités</option><option>ROUTINE</option><option>URGENT</option
			><option>STAT</option></select
		>
		<input
			aria-label="Catégorie"
			bind:value={category}
			oninput={filter}
			placeholder="Catégorie"
			class="rounded-lg border border-input px-3 text-sm"
		/>
	</section>
	{#if error}<Alert tone="danger">{error}</Alert>{/if}
	<section>
		<Table>
			<thead
				><tr
					><th>Demande / patient</th><th>Examen</th><th>Consultation</th><th>Priorité</th><th
						>Statut</th
					><th>Prélèvement</th></tr
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
						title="Aucune demande"
						description="Aucune prescription ne correspond aux filtres."
					/>{:else}{#each items as item (item.id)}<tr
							class="cursor-pointer"
							onclick={() => goto(resolve(`/laboratory/${item.id}`))}
							><td
								><a
									class="mc-id"
									href={resolve(`/laboratory/${item.id}`)}
									onclick={(e) => e.stopPropagation()}>{item.requestNumber}</a
								>
								<p>{item.patientName}</p>
								<small class="text-slate-500">{item.patientCode}</small></td
							><td
								><b>{item.examName}</b>
								<p class="text-slate-500">{item.examCode} · {item.category || '—'}</p></td
							><td
								>{item.service || '—'}
								<p class="text-slate-500">
									{item.prescriber || '—'} · {date(item.prescribedAt)}
								</p></td
							><td>{item.priority}</td><td
								><StatusBadge status={item.status} label={laboratoryStatusLabel(item.status)} /></td
							><td>{item.sampleIdentifier || '—'}</td></tr
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
