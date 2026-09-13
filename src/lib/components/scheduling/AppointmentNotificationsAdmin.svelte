<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getNotificationIntent,
		listNotificationAttempts,
		listNotificationIntents
	} from '$lib/api/appointment-notifications';
	import { formatAgendaDateTime } from '$lib/components/agenda/state';
	import {
		NOTIFICATION_CHANNEL_OPTIONS,
		NOTIFICATION_KIND_OPTIONS,
		NOTIFICATION_STATUS_OPTIONS,
		SCHEDULE_ADMIN_TIMEZONE,
		notificationChannelLabel,
		notificationKindLabel,
		notificationStatusLabel,
		truncateOperationalError
	} from '$lib/components/scheduling/state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { isAccessDeniedError, resolveUserErrorMessage } from '$lib/rbac/permissions';
	import type {
		NotificationAttemptAdmin,
		NotificationIntentAdmin
	} from '$lib/types/appointment-notifications';

	const PAGE_SIZE = 20;

	let filterStatus = $state('');
	let filterKind = $state('');
	let filterChannel = $state('');
	let filterAppointmentId = $state('');
	let page = $state(1);

	let items = $state<NotificationIntentAdmin[]>([]);
	let total = $state(0);
	let listLoading = $state(true);
	let listError = $state('');
	let hasLoadedOnce = $state(false);

	let detailOpen = $state(false);
	let detailLoading = $state(false);
	let detailError = $state('');
	let detail = $state<NotificationIntentAdmin | null>(null);

	let attempts = $state<NotificationAttemptAdmin[]>([]);
	let attemptsLoading = $state(false);
	let attemptsError = $state('');

	const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE) || 1));
	const filtersActive = $derived(
		Boolean(filterStatus || filterKind || filterChannel || filterAppointmentId.trim())
	);

	function mapErr(e: unknown, fallback: string): string {
		if (isAccessDeniedError(e)) return 'Action non autorisée (RBAC / périmètre service).';
		return resolveUserErrorMessage(e, fallback) || fallback;
	}

	function fmt(iso: string | null | undefined): string {
		if (!iso) return '—';
		try {
			return formatAgendaDateTime(iso, SCHEDULE_ADMIN_TIMEZONE);
		} catch {
			return iso;
		}
	}

	function parseAppointmentIdFilter(): number | undefined {
		const raw = filterAppointmentId.trim();
		if (!raw) return undefined;
		const n = Number(raw);
		if (!Number.isInteger(n) || n < 1) return undefined;
		return n;
	}

	async function loadList() {
		listLoading = true;
		listError = '';
		try {
			const apptId = parseAppointmentIdFilter();
			if (filterAppointmentId.trim() && apptId === undefined) {
				listError = 'Identifiant de rendez-vous invalide.';
				items = [];
				total = 0;
				return;
			}
			const res = await listNotificationIntents({
				page,
				limit: PAGE_SIZE,
				status: filterStatus || undefined,
				kind: filterKind || undefined,
				channel: filterChannel || undefined,
				appointmentId: apptId
			});
			items = res.items ?? [];
			total = res.total ?? 0;
			hasLoadedOnce = true;
		} catch (e) {
			listError = mapErr(e, 'Impossible de charger les notifications.');
			items = [];
			total = 0;
		} finally {
			listLoading = false;
		}
	}

	function onFilterChange() {
		page = 1;
		void loadList();
	}

	function goPrev() {
		if (page <= 1) return;
		page -= 1;
		void loadList();
	}

	function goNext() {
		if (page >= totalPages) return;
		page += 1;
		void loadList();
	}

	async function openDetail(row: NotificationIntentAdmin) {
		detailOpen = true;
		detail = null;
		detailError = '';
		detailLoading = true;
		attempts = [];
		attemptsError = '';
		attemptsLoading = true;
		try {
			detail = await getNotificationIntent(row.id);
		} catch (e) {
			detailError = mapErr(e, 'Impossible de charger le détail.');
			detailLoading = false;
			attemptsLoading = false;
			return;
		} finally {
			detailLoading = false;
		}
		try {
			const res = await listNotificationAttempts(row.id);
			attempts = res.items ?? [];
		} catch (e) {
			attemptsError = mapErr(e, 'Impossible de charger les tentatives.');
			attempts = [];
		} finally {
			attemptsLoading = false;
		}
	}

	function closeDetail() {
		detailOpen = false;
		detail = null;
		detailError = '';
		attempts = [];
		attemptsError = '';
	}

	onMount(() => {
		void loadList();
	});
</script>

<section class="space-y-4" data-testid="schedule-admin-notifications">
	<Alert tone="info" title="Consultation seule">
		File d’intents de notification rendez-vous (canal opérationnel LOG). Aucune action d’envoi,
		relance ou configuration EMAIL/SMS.
	</Alert>

	<FilterBar>
		<Select
			bind:value={filterStatus}
			aria-label="Filtrer statut"
			data-testid="notification-filter-status"
			onchange={() => onFilterChange()}
		>
			<option value="">Tous les statuts</option>
			{#each NOTIFICATION_STATUS_OPTIONS as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</Select>
		<Select
			bind:value={filterKind}
			aria-label="Filtrer type"
			data-testid="notification-filter-kind"
			onchange={() => onFilterChange()}
		>
			<option value="">Tous les types</option>
			{#each NOTIFICATION_KIND_OPTIONS as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</Select>
		<Select
			bind:value={filterChannel}
			aria-label="Filtrer canal"
			data-testid="notification-filter-channel"
			onchange={() => onFilterChange()}
		>
			<option value="">Tous les canaux</option>
			{#each NOTIFICATION_CHANNEL_OPTIONS as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</Select>
		<label class="block min-w-[10rem] text-sm">
			<span class="sr-only">Rendez-vous</span>
			<input
				class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
				type="text"
				inputmode="numeric"
				placeholder="ID rendez-vous"
				bind:value={filterAppointmentId}
				data-testid="notification-filter-appointment"
				onkeydown={(e) => {
					if (e.key === 'Enter') onFilterChange();
				}}
				onchange={() => onFilterChange()}
			/>
		</label>
	</FilterBar>

	{#if listError}
		<div data-testid="notification-list-error">
			<Alert tone="danger" title="Erreur">{listError}</Alert>
		</div>
	{/if}

	{#if listLoading && !hasLoadedOnce}
		<div data-testid="notification-list-loading">
			<LoadingState label="Chargement des notifications…" />
		</div>
	{:else if !listError && items.length === 0}
		<div data-testid="notification-list-empty">
			<EmptyState
				title={filtersActive ? 'Aucun résultat' : 'Aucune notification'}
				description={filtersActive
					? 'Aucun intent ne correspond aux filtres.'
					: 'Aucun intent de notification pour le moment.'}
			/>
		</div>
	{:else if items.length > 0}
		<div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
			{#if listLoading}
				<div class="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">Actualisation…</div>
			{/if}
			<table class="min-w-full text-left text-sm" data-testid="notification-admin-table">
				<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="px-4 py-3 font-semibold">Type</th>
						<th class="px-4 py-3 font-semibold">Canal</th>
						<th class="px-4 py-3 font-semibold">Statut</th>
						<th class="px-4 py-3 font-semibold">Rendez-vous</th>
						<th class="px-4 py-3 font-semibold">Envoi prévu</th>
						<th class="px-4 py-3 font-semibold">Tentatives</th>
						<th class="px-4 py-3 font-semibold">Créée</th>
						<th class="px-4 py-3 font-semibold"></th>
					</tr>
				</thead>
				<tbody>
					{#each items as row (row.id)}
						<tr
							class="border-t border-slate-100 hover:bg-slate-50/80"
							data-testid="notification-row"
							data-notification-id={row.id}
						>
							<td class="px-4 py-3">{notificationKindLabel(row.kind)}</td>
							<td class="px-4 py-3">{notificationChannelLabel(row.channel)}</td>
							<td class="px-4 py-3">
								<StatusBadge status={row.status} label={notificationStatusLabel(row.status)} />
							</td>
							<td class="px-4 py-3 font-mono text-xs">#{row.appointmentId}</td>
							<td class="px-4 py-3 whitespace-nowrap">{fmt(row.sendAfter)}</td>
							<td class="px-4 py-3">{row.attemptCount}</td>
							<td class="px-4 py-3 whitespace-nowrap text-slate-600">{fmt(row.createdAt)}</td>
							<td class="px-4 py-3 text-right">
								<Button
									variant="ghost"
									data-testid="notification-row-open"
									onclick={() => void openDetail(row)}>Détail</Button
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div
			class="flex items-center justify-between gap-3 text-sm text-slate-600"
			data-testid="notification-pagination"
		>
			<span data-testid="notification-pagination-meta"
				>Page {page} / {totalPages} · {total} intent{total > 1 ? 's' : ''}</span
			>
			<div class="flex gap-2">
				<Button
					variant="secondary"
					disabled={page <= 1 || listLoading}
					data-testid="notification-page-prev"
					onclick={goPrev}>Précédent</Button
				>
				<Button
					variant="secondary"
					disabled={page >= totalPages || listLoading}
					data-testid="notification-page-next"
					onclick={goNext}>Suivant</Button
				>
			</div>
		</div>
	{/if}
</section>

<Modal
	bind:open={detailOpen}
	title="Détail notification"
	description="Consultation seule — aucun contrôle de mutation."
	size="lg"
	onclose={closeDetail}
>
	<div class="space-y-4" data-testid="notification-detail">
		{#if detailLoading}
			<LoadingState label="Chargement du détail…" />
		{:else if detailError}
			<Alert tone="danger" title="Erreur">{detailError}</Alert>
		{:else if detail}
			<dl
				class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"
				data-testid="notification-detail-fields"
			>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</dt>
					<dd class="font-mono">{detail.id}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Rendez-vous</dt>
					<dd class="font-mono" data-testid="notification-detail-appointment">
						#{detail.appointmentId}
					</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
					<dd class="font-mono" data-testid="notification-detail-patient">#{detail.patientId}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</dt>
					<dd>{notificationKindLabel(detail.kind)}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</dt>
					<dd>{notificationChannelLabel(detail.channel)}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</dt>
					<dd>
						<StatusBadge status={detail.status} label={notificationStatusLabel(detail.status)} />
					</dd>
				</div>
				<div class="sm:col-span-2">
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Clé d’occurrence
					</dt>
					<dd class="break-all font-mono text-xs">{detail.occurrenceKey}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Envoi prévu</dt>
					<dd>{fmt(detail.sendAfter)}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tentatives</dt>
					<dd>{detail.attemptCount}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Créée</dt>
					<dd>{fmt(detail.createdAt)}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Mise à jour</dt>
					<dd>{fmt(detail.updatedAt)}</dd>
				</div>
				{#if detail.processingStartedAt}
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Traitement démarré
						</dt>
						<dd>{fmt(detail.processingStartedAt)}</dd>
					</div>
				{/if}
				{#if detail.sentAt}
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Envoyée</dt>
						<dd>{fmt(detail.sentAt)}</dd>
					</div>
				{/if}
				{#if detail.cancelledAt}
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Annulée</dt>
						<dd>{fmt(detail.cancelledAt)}</dd>
					</div>
				{/if}
			</dl>

			<div
				class="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
				data-testid="notification-detail-payload"
			>
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
					Payload (sans PHI clinique)
				</p>
				<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-xs text-slate-500">appointmentId</dt>
						<dd class="font-mono">{detail.payload.appointmentId}</dd>
					</div>
					{#if detail.payload.scheduledAt}
						<div>
							<dt class="text-xs text-slate-500">scheduledAt</dt>
							<dd>{fmt(detail.payload.scheduledAt)}</dd>
						</div>
					{/if}
					{#if detail.payload.appointmentTypeName}
						<div>
							<dt class="text-xs text-slate-500">Type de RDV</dt>
							<dd>{detail.payload.appointmentTypeName}</dd>
						</div>
					{/if}
					{#if detail.payload.serviceName}
						<div>
							<dt class="text-xs text-slate-500">Service</dt>
							<dd>{detail.payload.serviceName}</dd>
						</div>
					{/if}
					{#if detail.payload.clinicLabel}
						<div>
							<dt class="text-xs text-slate-500">Établissement</dt>
							<dd>{detail.payload.clinicLabel}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<div data-testid="notification-attempts">
				<p class="mb-2 text-sm font-semibold text-slate-800">Historique des tentatives</p>
				{#if attemptsLoading}
					<LoadingState label="Chargement des tentatives…" />
				{:else if attemptsError}
					<Alert tone="danger" title="Erreur">{attemptsError}</Alert>
				{:else if attempts.length === 0}
					<div data-testid="notification-attempts-empty">
						<EmptyState
							title="Aucune tentative"
							description="Aucune livraison n’a encore été enregistrée pour cet intent."
						/>
					</div>
				{:else}
					<ol class="space-y-2" data-testid="notification-attempts-list">
						{#each attempts as att (att.id)}
							<li
								class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
								data-testid="notification-attempt-row"
								data-attempt-no={att.attemptNo}
							>
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<span class="font-medium">Tentative #{att.attemptNo}</span>
									<span class="text-xs text-slate-500">{fmt(att.createdAt)}</span>
								</div>
								<p class="mt-1 text-xs text-slate-600">
									Fournisseur : <span class="font-mono">{att.provider}</span>
									{#if att.providerMessageId}
										· msg <span class="font-mono">{att.providerMessageId}</span>
									{/if}
								</p>
								{#if att.error}
									<p
										class="mt-1 break-words text-xs text-red-700"
										data-testid="notification-attempt-error"
									>
										{truncateOperationalError(att.error)}
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		{/if}
	</div>
</Modal>
