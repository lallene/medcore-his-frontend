<script lang="ts">
	import HelpHint from '$lib/components/help/HelpHint.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { createTicket, listTicketCategories } from '$lib/api/ticketing';
	import type { TicketCategory } from '$lib/types/ticketing';
	let categories = $state<TicketCategory[]>([]),
		type = $state('INCIDENT'),
		categoryCode = $state('APPLICATION'),
		subcategory = $state(''),
		title = $state(''),
		description = $state(''),
		impact = $state('INDIVIDUAL'),
		urgency = $state('MEDIUM'),
		saving = $state(false),
		error = $state('');
	let moduleName = $derived(page.url.searchParams.get('module') || 'MedCore'),
		pageUrl = $derived(page.url.searchParams.get('page') || page.url.pathname);
	onMount(async () => {
		try {
			categories = await listTicketCategories();
		} catch {
			categories = [];
		}
	});
	async function submit(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		error = '';
		try {
			const ticket = await createTicket({
				type,
				categoryCode,
				subcategory,
				title,
				description,
				impact,
				urgency,
				applicationModule: moduleName,
				pageUrl,
				frontendVersion: 'web'
			});
			await goto(resolve(`/tickets/${ticket.id}`));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Création impossible';
		} finally {
			saving = false;
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<header>
		<p class="text-xs font-semibold uppercase text-blue-700">Service Desk</p>
		<h1 class="text-3xl font-bold">Signaler un problème</h1>
		<p class="text-sm text-slate-500">
			Le contexte technique utile est joint sans copier de données médicales.
		</p>
	</header>
	{#if error}<p role="alert" class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<form onsubmit={submit} class="grid gap-5 rounded-2xl border bg-white p-6 md:grid-cols-2">
		<label class="font-bold"
			>Type<select bind:value={type} class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
				>{#each ['INCIDENT', 'REQUEST', 'ACCESS_REQUEST', 'HARDWARE', 'NETWORK', 'APPLICATION', 'OTHER'] as v (v)}<option
						value={v}>{v}</option
					>{/each}</select
			></label
		><label class="font-bold"
			>Catégorie<select
				bind:value={categoryCode}
				class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
				>{#each categories as c (c.id)}<option value={c.code}>{c.name}</option>{:else}<option
						value="APPLICATION">Application MedCore</option
					><option value="HARDWARE">Matériel</option><option value="NETWORK">Réseau</option
					>{/each}</select
			></label
		><label class="font-bold md:col-span-2"
			>Sujet<input
				required
				maxlength="180"
				bind:value={title}
				class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
			/></label
		><label class="font-bold md:col-span-2"
			>Description<textarea
				required
				maxlength="10000"
				rows="7"
				bind:value={description}
				class="mt-2 w-full rounded-lg border p-3"></textarea></label
		><label class="font-bold"
			>Sous-catégorie<input
				bind:value={subcategory}
				maxlength="80"
				class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
				placeholder="Ex. Consultation, imprimante"
			/></label
		>
		<div class="font-bold">
			<span class="flex items-center gap-1"
				><label for="ticket-urgency">Urgence perçue</label><HelpHint
					helpKey="ticket.create.urgency"
				/></span
			><select
				id="ticket-urgency"
				bind:value={urgency}
				class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
				><option value="LOW">Faible</option><option value="MEDIUM">Moyenne</option><option
					value="HIGH">Haute</option
				><option value="CRITICAL">Critique</option></select
			>
		</div>
		<div class="rounded-xl bg-slate-50 p-4 text-sm md:col-span-2">
			<b>Contexte automatique</b>
			<p>Module : {moduleName}</p>
			<p>Page : {pageUrl}</p>
			<p class="mt-2 text-xs text-slate-500">
				Aucun mot de passe, jeton JWT ou contenu clinique n’est envoyé.
			</p>
		</div>
		<div class="flex justify-end gap-3 md:col-span-2">
			<a href={resolve('/tickets')} class="rounded-xl border px-5 py-3">Annuler</a><button
				disabled={saving}
				class="rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50 hover:bg-primary-hover transition-colors"
				>{saving ? 'Enregistrement…' : 'Créer le ticket'}</button
			>
		</div>
	</form>
</div>
