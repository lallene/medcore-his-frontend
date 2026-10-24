<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import HelpHint from '$lib/components/help/HelpHint.svelte';
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

	<section class="rounded-2xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">Rendez-vous du jour</h2>
		</div>

		<Table>
			<thead>
				<tr>
					<th>Patient</th>
					<th>Service</th>
					<th>Heure</th>
					<th>Statut</th>
					<th class="mc-actions">Actions</th>
				</tr>
			</thead>
			<tbody
				>{#if loading}<TableState
						state="loading"
						colspan={5}
					/>{:else if appointments.length === 0}<TableState
						state="empty"
						colspan={5}
						title="Aucun rendez-vous aujourd’hui"
					/>{:else}
					{#each appointments as appt (appt.id)}
						<tr>
							<td>{appt.patientName || appt.patientCode || '—'}</td>
							<td>{appt.serviceName || '—'}</td>
							<td>{formatAppointmentTime(appt.scheduledAt)}</td>
							<td><StatusBadge status={appt.status} /></td>
							<td class="mc-actions">
								{#if !appt.hasActiveTicket && appt.status !== 'CHECKED_IN' && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW'}
									<Button
										size="sm"
										data-testid="queue-appt-checkin"
										onclick={() => checkIn(appt.id)}>Enregistrer</Button
									>
								{:else}
									<span class="text-slate-500">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}</tbody
			>
		</Table>
	</section>

	<section
		class="rounded-2xl border border-border bg-surface p-4 shadow-xs"
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
				<p class="flex items-center gap-1 text-sm text-slate-600">
					Statut financier : {walkInFinanceStatus}
					<HelpHint helpKey="queue.ticket.finance_status" />
				</p>
			{/if}
		</div>
		<div class="mt-4">
			<Button loading={submittingWalkIn} onclick={submitWalkIn}>Enregistrer le passage</Button>
		</div>
	</section>

	<section class="rounded-2xl border border-border bg-surface shadow-xs">
		<div class="border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">Patients en attente</h2>
		</div>

		<Table>
			<thead>
				<tr>
					{#each receptionQueueColumns as column (column)}
						<th>{column}</th>
					{/each}
				</tr>
			</thead>
			<tbody
				>{#if loading}<TableState
						state="loading"
						colspan={receptionQueueColumns.length}
					/>{:else if waitingTickets.length === 0}<TableState
						state="empty"
						colspan={receptionQueueColumns.length}
						title="Aucun patient en attente"
					/>{:else}
					{#each waitingTickets as ticket (ticket.id)}
						<tr>
							<td>
								<a href={resolve(`/queue/${ticket.id}`)}>{queuePatientLabel(ticket)}</a>
							</td>
							<td>{queueServiceLabel(ticket)}</td>
							<td>{formatAppointmentTime(ticket.appointmentTime)}</td>
							<td>{sourceLabels[ticket.source]}</td>
							<td>
								<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
							</td>
							<td>{formatWaitMinutes(ticket.waitMinutes)}</td>
							<td>
								<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
							</td>
						</tr>
					{/each}
				{/if}</tbody
			>
		</Table>
	</section>
</div>
