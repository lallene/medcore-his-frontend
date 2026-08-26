<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		checkInAppointment,
		checkInWalkIn,
		evaluateFinance,
		listQueueTickets,
		listTodayAppointments
	} from '$lib/api/queue';
	import {
		financeLabels,
		formatAppointmentTime,
		formatWaitMinutes,
		priorityLabels,
		queuePatientLabel,
		queueServiceLabel,
		receptionQueueColumns,
		sourceLabels,
		stageLabels
	} from '$lib/components/queue/state';
	import type { QueueAppointmentRow, QueuePriority, QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let appointments = $state<QueueAppointmentRow[]>([]);
	let waitingTickets = $state<QueueTicketRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	let walkInPatientId = $state('');
	let walkInServiceId = $state('');
	let walkInDoctorId = $state('');
	let walkInReason = $state('');
	let walkInPriority = $state<QueuePriority>('NORMAL');
	let walkInIdentity = $state(true);
	let walkInFinanceOverride = $state(false);
	let walkInFinanceNote = $state('');
	let walkInFinanceStatus = $state('');
	let submittingWalkIn = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			const [appts, tickets] = await Promise.all([
				listTodayAppointments({ limit: 100 }),
				listQueueTickets({ limit: 50 })
			]);
			appointments = appts.items;
			waitingTickets = tickets.items.filter((t) =>
				['RECEPTION', 'WAITING_TRIAGE'].includes(t.stage)
			);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger l’accueil';
		} finally {
			loading = false;
		}
	}

	async function checkFinance() {
		walkInFinanceStatus = '';
		const patientId = Number(walkInPatientId);
		if (!patientId) return;
		try {
			const r = await evaluateFinance(patientId);
			walkInFinanceStatus = financeLabels[r.financeStatus] ?? r.financeStatus;
		} catch {
			walkInFinanceStatus = 'Indisponible';
		}
	}

	async function submitWalkIn() {
		submittingWalkIn = true;
		error = '';
		success = '';
		try {
			await checkInWalkIn({
				patientId: Number(walkInPatientId),
				serviceId: Number(walkInServiceId),
				expectedDoctorId: walkInDoctorId ? Number(walkInDoctorId) : undefined,
				identityConfirmed: walkInIdentity,
				financeOverride: walkInFinanceOverride,
				financeOverrideNote: walkInFinanceNote || undefined,
				priority: walkInPriority,
				reason: walkInReason || undefined
			});
			success = 'Patient enregistré sans rendez-vous.';
			walkInPatientId = '';
			walkInServiceId = '';
			walkInDoctorId = '';
			walkInReason = '';
			walkInFinanceNote = '';
			walkInFinanceStatus = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Check-in impossible';
		} finally {
			submittingWalkIn = false;
		}
	}

	async function checkIn(id: number) {
		error = '';
		success = '';
		try {
			await checkInAppointment(id, { identityConfirmed: true, priority: 'NORMAL' });
			success = 'Patient enregistré.';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Check-in impossible';
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6" data-testid="queue-reception">
	<PageHeader
		eyebrow="File patients"
		title="Accueil"
		description="Rendez-vous du jour, enregistrement sans RDV et patients en attente."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}
	{#if success}
		<Alert tone="success">{success}</Alert>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<div class="border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">Rendez-vous du jour</h2>
		</div>

		{#if loading}
			<LoadingState />
		{:else if appointments.length === 0}
			<div class="p-4"><EmptyState title="Aucun rendez-vous aujourd’hui" /></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							<th class="p-3">Patient</th>
							<th class="p-3">Service</th>
							<th class="p-3">Heure</th>
							<th class="p-3">Statut</th>
							<th class="p-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each appointments as appt (appt.id)}
							<tr class="border-t border-border hover:bg-surface-muted/50">
								<td class="p-3">{appt.patientName || appt.patientCode || '—'}</td>
								<td class="p-3">{appt.serviceName || '—'}</td>
								<td class="p-3">{formatAppointmentTime(appt.scheduledAt)}</td>
								<td class="p-3"><StatusBadge status={appt.status} /></td>
								<td class="p-3">
									{#if !appt.hasActiveTicket && appt.status !== 'CHECKED_IN' && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW'}
										<Button
											size="sm"
											data-testid="queue-appt-checkin"
											onclick={() => checkIn(appt.id)}>Enregistrer</Button
										>
									{:else}
										<span class="text-slate-400">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section
		class="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
		data-testid="queue-checkin-walkin"
	>
		<h2 class="text-sm font-bold text-slate-700">Enregistrement sans rendez-vous</h2>
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<FormField label="ID patient" required>
				<Input type="number" bind:value={walkInPatientId} oninput={checkFinance} />
			</FormField>
			<FormField label="ID service" required>
				<Input type="number" bind:value={walkInServiceId} />
			</FormField>
			<FormField label="ID médecin (optionnel)">
				<Input type="number" bind:value={walkInDoctorId} />
			</FormField>
			<FormField label="Priorité">
				<Select bind:value={walkInPriority}>
					{#each Object.entries(priorityLabels) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</Select>
			</FormField>
			<FormField label="Motif">
				<Input bind:value={walkInReason} placeholder="Motif de visite" />
			</FormField>
			<div class="flex flex-col justify-end gap-3">
				<Checkbox bind:checked={walkInIdentity} label="Identité confirmée" />
				<Checkbox bind:checked={walkInFinanceOverride} label="Dérogation financière" />
			</div>
			{#if walkInFinanceOverride}
				<FormField label="Note dérogation">
					<Input bind:value={walkInFinanceNote} />
				</FormField>
			{/if}
			{#if walkInFinanceStatus}
				<p class="text-sm text-slate-600">Statut financier : {walkInFinanceStatus}</p>
			{/if}
		</div>
		<div class="mt-4">
			<Button loading={submittingWalkIn} onclick={submitWalkIn}>Enregistrer le passage</Button>
		</div>
	</section>

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<div class="border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">Patients en attente</h2>
		</div>

		{#if loading}
			<LoadingState />
		{:else if waitingTickets.length === 0}
			<div class="p-4"><EmptyState title="Aucun patient en attente" /></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							{#each receptionQueueColumns as column (column)}
								<th class="p-3">{column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each waitingTickets as ticket (ticket.id)}
							<tr class="border-t border-border hover:bg-surface-muted/50">
								<td class="p-3">
									<a
										class="font-bold text-primary hover:underline"
										href={resolve(`/queue/${ticket.id}`)}>{queuePatientLabel(ticket)}</a
									>
								</td>
								<td class="p-3">{queueServiceLabel(ticket)}</td>
								<td class="p-3">{formatAppointmentTime(ticket.appointmentTime)}</td>
								<td class="p-3">{sourceLabels[ticket.source]}</td>
								<td class="p-3">
									<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
								</td>
								<td class="p-3">{formatWaitMinutes(ticket.waitMinutes)}</td>
								<td class="p-3">
									<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
