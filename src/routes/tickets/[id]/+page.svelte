<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import {
		commentTicket,
		assignTicket,
		getTicket,
		listTicketAgents,
		transitionTicket,
		uploadTicketAttachment
	} from '$lib/api/ticketing';
	import { allowedNext, statusLabels } from '$lib/components/ticketing/state';
	import type { TicketAgent, TicketDetail } from '$lib/types/ticketing';
	let ticket = $state<TicketDetail | null>(null),
		loading = $state(true),
		error = $state(''),
		comment = $state(''),
		visibility = $state<'PUBLIC' | 'INTERNAL'>('PUBLIC'),
		resolution = $state(''),
		permissions = $state<string[]>([]);
	let agents = $state<TicketAgent[]>([]),
		assignedUserId = $state(''),
		queue = $state('SUPPORT_APPLICATION');
	const has = (p: string) => permissions.includes('*') || permissions.includes(p);
	async function load() {
		loading = true;
		try {
			ticket = await getTicket(Number(page.params.id));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Ticket introuvable';
		} finally {
			loading = false;
		}
	}
	async function add() {
		if (!ticket || !comment.trim()) return;
		await commentTicket(ticket.id, comment, visibility);
		comment = '';
		await load();
	}
	async function transition(status: string) {
		if (!ticket) return;
		try {
			ticket = await transitionTicket(
				ticket.id,
				status,
				resolution,
				status === 'RESOLVED' ? 'FIXED' : ''
			);
			resolution = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Transition refusée';
		}
	}
	async function upload(event: Event) {
		if (!ticket) return;
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			await uploadTicketAttachment(ticket.id, file);
			input.value = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Envoi impossible';
		}
	}
	async function assign() {
		if (!ticket) return;
		try {
			ticket = await assignTicket(ticket.id, assignedUserId ? Number(assignedUserId) : null, queue);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Assignation refusée';
		}
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		void load();
		if (has('ticket.assign'))
			void listTicketAgents()
				.then((items) => (agents = items))
				.catch(() => (agents = []));
	});
</script>

<div class="space-y-6 p-6">
	{#if loading}<p>Chargement…</p>{:else if !ticket}<p
			role="alert"
			class="rounded-xl bg-red-50 p-4 text-red-700"
		>
			{error || 'Ticket introuvable'}
		</p>{:else}<header>
			<p class="font-black text-blue-700">{ticket.reference}</p>
			<h1 class="text-3xl font-black">{ticket.title}</h1>
			<div class="mt-2 flex flex-wrap gap-2 text-sm">
				<span class="rounded-full bg-slate-100 px-3 py-1">{statusLabels[ticket.status]}</span><span
					class="rounded-full bg-slate-100 px-3 py-1">{ticket.priority}</span
				><span class="rounded-full bg-slate-100 px-3 py-1">{ticket.type}</span>
			</div>
		</header>
		{#if error}<p role="alert" class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
		<div class="grid gap-6 xl:grid-cols-3">
			<section class="space-y-5 xl:col-span-2">
				<article class="rounded-2xl border bg-white p-6">
					<h2 class="font-black">Description</h2>
					<p class="mt-3 whitespace-pre-wrap text-slate-700">{ticket.description}</p>
				</article>
				<article class="rounded-2xl border bg-white p-6">
					<h2 class="font-black">Pièces jointes</h2>
					<ul class="mt-3 space-y-2 text-sm">
						{#each ticket.attachments as attachment (attachment.id)}
							<li>{attachment.originalName} · {Math.ceil(attachment.size / 1024)} Ko</li>
						{:else}<li class="text-slate-500">Aucune pièce jointe.</li>{/each}
					</ul>
					<label class="mt-4 block font-bold" for="ticket-attachment"
						>Ajouter PNG, JPG, PDF ou TXT (5 Mo max.)</label
					>
					<input
						id="ticket-attachment"
						type="file"
						accept="image/png,image/jpeg,application/pdf,text/plain"
						onchange={upload}
						class="mt-2 block w-full text-sm"
					/>
				</article>
				<article class="rounded-2xl border bg-white p-6">
					<h2 class="font-black">Commentaires</h2>
					<div class="mt-4 space-y-3">
						{#each ticket.comments as c (c.id)}<div
								class="rounded-xl border p-4"
								class:bg-amber-50={c.visibility === 'INTERNAL'}
							>
								<div class="flex justify-between text-xs text-slate-500">
									<span>{c.visibility === 'INTERNAL' ? 'Note interne' : 'Réponse publique'}</span
									><time>{new Date(c.createdAt).toLocaleString('fr-FR')}</time>
								</div>
								<p class="mt-2 whitespace-pre-wrap">{c.content}</p>
							</div>{:else}<p class="text-sm text-slate-500">Aucun commentaire.</p>{/each}
					</div>
					<div class="mt-5 space-y-3">
						<label class="font-bold" for="ticket-comment">Ajouter un commentaire</label><textarea
							id="ticket-comment"
							bind:value={comment}
							rows="4"
							class="w-full rounded-xl border p-3"
						></textarea>{#if has('ticket.comment.internal')}<select
								aria-label="Visibilité"
								bind:value={visibility}
								class="rounded-xl border p-3"
								><option value="PUBLIC">Public</option><option value="INTERNAL"
									>Interne support</option
								></select
							>{/if}<button
							onclick={add}
							disabled={!comment.trim()}
							class="ml-3 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50"
							>Publier</button
						>
					</div>
				</article>
				{#if ticket.history.length}<article class="rounded-2xl border bg-white p-6">
						<h2 class="font-black">Historique auditable</h2>
						<ol class="mt-4 space-y-2">
							{#each ticket.history as h (h.id)}<li class="border-l-2 pl-4 text-sm">
									<b>{h.eventType}</b> · {new Date(h.createdAt).toLocaleString('fr-FR')}
								</li>{/each}
						</ol>
					</article>{/if}
			</section>
			<aside class="space-y-5">
				<section class="rounded-2xl border bg-white p-5">
					<h2 class="font-black">Contexte</h2>
					<dl class="mt-3 grid gap-2 text-sm">
						<div>
							<dt class="text-slate-500">Demandeur</dt>
							<dd>{ticket.requesterName}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Service</dt>
							<dd>{ticket.serviceName || 'Non renseigné'}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Module/Page</dt>
							<dd>{ticket.applicationModule || 'MedCore'} · {ticket.pageUrl}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Assigné</dt>
							<dd>{ticket.assignedName || ticket.assignedQueue || 'Non assigné'}</dd>
						</div>
					</dl>
				</section>
				{#if has('ticket.assign')}<section class="rounded-2xl border bg-white p-5">
						<h2 class="font-black">Affectation</h2>
						<label class="mt-3 block text-sm font-bold"
							>Agent<select bind:value={assignedUserId} class="mt-1 w-full rounded-xl border p-2"
								><option value="">Non assigné</option>{#each agents as agent (agent.userId)}<option
										value={agent.userId}
										>{agent.name} {agent.serviceName ? `— ${agent.serviceName}` : ''}</option
									>{/each}</select
							></label
						><label class="mt-3 block text-sm font-bold"
							>File<select bind:value={queue} class="mt-1 w-full rounded-xl border p-2"
								>{#each ['SUPPORT_APPLICATION', 'SUPPORT_INFRA', 'SUPPORT_NETWORK', 'SECURITY', 'ACCESS_MANAGEMENT'] as value (value)}<option
										{value}>{value}</option
									>{/each}</select
							></label
						><button
							onclick={assign}
							class="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 font-bold text-white"
							>Affecter</button
						>
					</section>{/if}
				<section class="rounded-2xl border bg-white p-5">
					<h2 class="font-black">SLA</h2>
					<p class:text-red-700={ticket.responseSlaBreached}>
						Réponse : {new Date(ticket.responseDueAt).toLocaleString('fr-FR')}
					</p>
					<p class:text-red-700={ticket.resolutionSlaBreached}>
						Résolution : {new Date(ticket.resolutionDueAt).toLocaleString('fr-FR')}
					</p>
				</section>
				{#if has('ticket.update') || has('ticket.resolve') || has('ticket.close') || has('ticket.reopen')}<section
						class="rounded-2xl border bg-white p-5"
					>
						<h2 class="font-black">Workflow support</h2>
						{#if allowedNext(ticket.status).includes('RESOLVED')}<label
								class="mt-3 block text-sm font-bold"
								>Résumé de résolution<textarea
									bind:value={resolution}
									rows="3"
									class="mt-1 w-full rounded-xl border p-2"></textarea></label
							>{/if}
						<div class="mt-3 grid gap-2">
							{#each allowedNext(ticket.status) as next (next)}<button
									onclick={() => transition(next)}
									disabled={next === 'RESOLVED' && !resolution.trim()}
									class="rounded-xl border px-3 py-2 text-left font-bold disabled:opacity-40"
									>{statusLabels[next]}</button
								>{/each}
						</div>
					</section>{/if}
			</aside>
		</div>{/if}
</div>
