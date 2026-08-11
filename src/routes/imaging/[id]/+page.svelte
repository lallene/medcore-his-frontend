<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		cancelImagingOrder,
		getImagingOrder,
		saveImagingReport,
		scheduleImagingOrder,
		startImagingOrder,
		validateImagingOrder
	} from '$lib/api/imaging';
	import {
		hasImagingPermission,
		imagingActions,
		imagingModalityLabel,
		imagingStatusLabel
	} from '$lib/components/imaging/state';
	import type { ImagingOrder, ImagingReportInput } from '$lib/types/imaging';
	import AuthorizationStatus from '$lib/components/insurance/AuthorizationStatus.svelte';
	let order = $state<ImagingOrder | null>(null),
		error = $state(''),
		busy = $state(false),
		scheduledAt = $state(''),
		scheduleComment = $state(''),
		technicalNotes = $state(''),
		contrastUsed = $state(false),
		contrastProduct = $state('');
	let report = $state<ImagingReportInput>({
		clinicalIndication: '',
		technique: '',
		findings: '',
		conclusion: '',
		recommendation: '',
		documentUrl: ''
	});
	let claims = $state<{ role?: string; permissions?: string[] } | null>(null);
	const id = $derived(Number(page.params.id));
	const actions = $derived(order ? imagingActions(order.status) : imagingActions('CANCELLED'));
	const canSchedule = $derived(hasImagingPermission(claims, 'imaging.schedule')),
		canPerform = $derived(hasImagingPermission(claims, 'imaging.perform')),
		canReport = $derived(hasImagingPermission(claims, 'imaging.report.write')),
		canValidate = $derived(hasImagingPermission(claims, 'imaging.validate')),
		canCancel = $derived(hasImagingPermission(claims, 'imaging.cancel'));
	function hydrate(o: ImagingOrder) {
		order = o;
		if (o.scheduledAt) scheduledAt = new Date(o.scheduledAt).toISOString().slice(0, 16);
		scheduleComment = o.scheduleComment;
		technicalNotes = o.technicalNotes;
		contrastUsed = o.contrastUsed;
		contrastProduct = o.contrastProduct;
		if (o.report)
			report = {
				clinicalIndication: o.report.clinicalIndication,
				technique: o.report.technique,
				findings: o.report.findings,
				conclusion: o.report.conclusion,
				recommendation: o.report.recommendation,
				documentUrl: o.report.documentUrl
			};
	}
	async function load() {
		try {
			hydrate(await getImagingOrder(id));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		}
	}
	async function act(fn: () => Promise<ImagingOrder>) {
		busy = true;
		error = '';
		try {
			hydrate(await fn());
		} catch (e) {
			error = e instanceof Error ? e.message : 'Opération impossible';
		} finally {
			busy = false;
		}
	}
	function date(v: string | null | undefined) {
		return v
			? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(v)
				)
			: '—';
	}
	onMount(() => {
		const token = localStorage.getItem('medcore_token');
		if (token)
			try {
				claims = jwtDecode(token);
			} catch {
				claims = null;
			}
		void load();
	});
</script>

{#if !order}<p class="p-10 text-center">Chargement...</p>{:else}<div class="space-y-6">
		<a href={resolve('/imaging')} class="text-sm font-bold text-cyan-700">← Retour à la file</a>
		<AuthorizationStatus
			patientId={order.patientId}
			referenceType="IMAGING"
			referenceId={order.id}
			service={order.service}
		/>
		<header class="rounded-2xl border bg-white p-6">
			<div class="flex flex-wrap justify-between gap-3">
				<div>
					<p class="text-sm font-bold text-cyan-700">
						{order.orderNumber} · Accession {order.accessionNumber}
					</p>
					<h1 class="text-2xl font-black">{order.examName}</h1>
					<p class="text-slate-500">
						{order.patientName} ({order.patientCode}) · {order.service || '—'} · {order.prescriber ||
							'—'} · Consultation #{order.consultationId}
					</p>
					<p class="mt-1 text-sm font-bold">
						{imagingModalityLabel(order.modality)} · Priorité {order.priority}
					</p>
				</div>
				<span class="h-fit rounded-full bg-cyan-50 px-4 py-2 font-bold text-cyan-700"
					>{imagingStatusLabel(order.status)}</span
				>
			</div>
		</header>
		{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>{/if}
		<section class="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-4">
			<p><b>Prescription</b><br />{date(order.createdAt)}</p>
			<p><b>Planification</b><br />{date(order.scheduledAt)}</p>
			<p><b>Réalisation</b><br />{date(order.performedAt)}</p>
			<p><b>Contraste</b><br />{order.contrastUsed ? order.contrastProduct || 'Oui' : 'Non'}</p>
			{#if order.technicalNotes}<p class="md:col-span-4">
					<b>Notes techniques</b><br />{order.technicalNotes}
				</p>{/if}
		</section>
		{#if canSchedule && actions.schedule}<section class="rounded-2xl border bg-white p-6">
				<h2 class="font-black">Planifier l’examen</h2>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<input
						type="datetime-local"
						bind:value={scheduledAt}
						class="rounded-xl border p-3"
					/><input
						bind:value={scheduleComment}
						placeholder="Commentaire (facultatif)"
						class="rounded-xl border p-3"
					/>
				</div>
				<button
					disabled={busy || !scheduledAt}
					onclick={() =>
						act(() =>
							scheduleImagingOrder(id, {
								scheduledAt: new Date(scheduledAt).toISOString(),
								comment: scheduleComment
							})
						)}
					class="mt-3 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white">Planifier</button
				>
			</section>{/if}
		{#if canPerform && actions.start}<section class="rounded-2xl border bg-white p-6">
				<h2 class="font-black">Réalisation</h2>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<textarea
						bind:value={technicalNotes}
						placeholder="Notes techniques"
						class="rounded-xl border p-3"></textarea>
					<div class="space-y-3">
						<label class="flex gap-2"
							><input type="checkbox" bind:checked={contrastUsed} />Produit de contraste</label
						>{#if contrastUsed}<input
								bind:value={contrastProduct}
								placeholder="Produit utilisé"
								class="w-full rounded-xl border p-3"
							/>{/if}
					</div>
				</div>
				<button
					disabled={busy}
					onclick={() =>
						act(() => startImagingOrder(id, { technicalNotes, contrastUsed, contrastProduct }))}
					class="mt-3 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
					>Démarrer l’examen</button
				>
			</section>{/if}
		{#if canReport && actions.report}<section class="rounded-2xl border bg-white p-6">
				<h2 class="font-black">Compte rendu radiologique</h2>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					<textarea
						bind:value={report.clinicalIndication}
						placeholder="Indication clinique"
						class="rounded-xl border p-3"></textarea><textarea
						bind:value={report.technique}
						placeholder="Technique"
						class="rounded-xl border p-3"></textarea><textarea
						bind:value={report.findings}
						placeholder="Constatations *"
						class="rounded-xl border p-3 md:col-span-2"></textarea><textarea
						bind:value={report.conclusion}
						placeholder="Conclusion *"
						class="rounded-xl border p-3 md:col-span-2"></textarea><textarea
						bind:value={report.recommendation}
						placeholder="Recommandations"
						class="rounded-xl border p-3"></textarea><input
						bind:value={report.documentUrl}
						placeholder="URL du compte rendu ou document"
						class="rounded-xl border p-3"
					/>
				</div>
				<div class="mt-4 flex gap-3">
					<button
						disabled={busy || !report.findings || !report.conclusion}
						onclick={() => act(() => saveImagingReport(id, report))}
						class="rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white"
						>Enregistrer le brouillon</button
					>
				</div>
			</section>{/if}
		{#if canValidate && actions.validate}<button
				disabled={busy}
				onclick={() => act(() => validateImagingOrder(id))}
				class="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
				>Valider définitivement</button
			>{/if}
		{#if order.report && (order.status === 'VALIDATED' || !canReport)}<section
				class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
			>
				<h2 class="font-black text-emerald-900">
					Compte rendu {order.status === 'VALIDATED' ? 'validé' : 'en lecture'}
				</h2>
				<div class="mt-3 space-y-3">
					<p><b>Indication :</b> {order.report.clinicalIndication || '—'}</p>
					<p><b>Technique :</b> {order.report.technique || '—'}</p>
					<p><b>Constatations :</b> {order.report.findings}</p>
					<p><b>Conclusion :</b> {order.report.conclusion}</p>
					<p><b>Recommandations :</b> {order.report.recommendation || '—'}</p>
					<p class="text-sm">
						Rédigé par #{order.report.draftedBy} le {date(order.report.draftedAt)} · Validé par #{order
							.report.validatedBy ?? '—'} le {date(order.report.validatedAt)}
					</p>
					{#if order.report.documentUrl}<button
							class="font-bold text-cyan-700"
							onclick={() =>
								window.open(order?.report?.documentUrl, '_blank', 'noopener,noreferrer')}
							>Ouvrir le document associé</button
						>{/if}
				</div>
			</section>{/if}
		{#if canCancel && actions.cancel}<button
				onclick={() => {
					const reason = prompt('Motif d’annulation');
					if (reason) act(() => cancelImagingOrder(id, reason));
				}}
				class="text-sm font-bold text-red-600">Annuler la demande</button
			>{/if}
	</div>{/if}
