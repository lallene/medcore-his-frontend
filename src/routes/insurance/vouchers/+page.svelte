<script lang="ts">
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import FilterChip from '$lib/components/ui/FilterChip.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { medcoreColors } from '$lib/design/theme';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { BadgeCheck, Clock3, FileText, Shield, WalletCards, XCircle } from 'lucide-svelte';

	import { getVouchers } from '$lib/api/vouchers';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import WorkflowPill from '$lib/components/insurance/WorkflowPill.svelte';
	import AlertLine from '$lib/components/insurance/AlertLine.svelte';

	import type { InsuranceVoucher } from '$lib/types/voucher';

	let vouchers = $state<InsuranceVoucher[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let statusFilter = $state('all');

	function voucherAmount(voucher: InsuranceVoucher) {
		return voucher.grossAmount ?? voucher.amount ?? 0;
	}

	function statusLabel(status: string) {
		const labels: Record<string, string> = {
			draft: 'Brouillon',
			submitted: 'Soumis',
			controlled: 'Contrôlé',
			validated: 'Validé',
			rejected: 'Rejeté',
			cancelled: 'Annulé'
		};

		return labels[status] ?? status;
	}

	function statusVariant(
		status: string
	): 'primary' | 'success' | 'warning' | 'danger' | 'secondary' {
		if (status === 'validated') return 'success';
		if (status === 'rejected' || status === 'cancelled') return 'danger';
		if (status === 'submitted' || status === 'controlled') return 'warning';
		if (status === 'draft') return 'secondary';

		return 'primary';
	}

	const filteredVouchers = $derived(
		vouchers.filter((voucher) => {
			const query = search.toLowerCase();

			const matchesSearch =
				voucher.voucherNumber.toLowerCase().includes(query) ||
				(voucher.patientName ?? '').toLowerCase().includes(query) ||
				(voucher.companyName ?? '').toLowerCase().includes(query) ||
				(voucher.reason ?? '').toLowerCase().includes(query);

			const matchesStatus =
				statusFilter === 'all' || voucher.status?.toLowerCase() === statusFilter;

			return matchesSearch && matchesStatus;
		})
	);

	const totalAmount = $derived(
		vouchers.reduce((total, voucher) => total + Number(voucherAmount(voucher)), 0)
	);

	onMount(async () => {
		try {
			vouchers = await getVouchers();
		} catch {
			error = 'Impossible de charger les bons PEC.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Insurance Operations Center | MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
					Insurance Operations Center
				</p>

				<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
					Bons de prise en charge
				</h1>

				<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
					Suivi opérationnel des demandes, compagnies, montants, statuts et délais de validation.
				</p>

				<div class="mt-4 flex flex-wrap gap-2">
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{vouchers.length} Bons PEC
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{vouchers.filter((item) => item.status === 'validated').length} Validés
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{vouchers.filter((item) => item.status === 'submitted').length} En attente
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
					>
						{totalAmount.toLocaleString('fr-FR')} FCFA
					</span>
				</div>
			</div>

			<Button variant="secondary" onclick={() => goto(resolve('/insurance'))}
				>Retour Assurance</Button
			>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			icon={FileText}
			title="Total bons"
			value={vouchers.length}
			detail="Demandes enregistrées"
			trend="+18%"
			progress={82}
			accent={medcoreColors.primary}
		/>

		<MetricCard
			icon={Clock3}
			title="En attente"
			value={vouchers.filter((item) => item.status === 'submitted').length}
			detail="À contrôler"
			trend="+4%"
			progress={60}
			accent={medcoreColors.semantic.warning}
		/>

		<MetricCard
			icon={BadgeCheck}
			title="Validés"
			value={vouchers.filter((item) => item.status === 'validated').length}
			detail="PEC acceptées"
			trend="+9%"
			progress={78}
			accent={medcoreColors.semantic.success}
		/>

		<MetricCard
			icon={WalletCards}
			title="Montant"
			value={`${Math.round(totalAmount / 1000000)}M`}
			detail="FCFA estimés"
			trend="+15%"
			progress={72}
			accent={medcoreColors.semantic.warning}
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="min-w-0 space-y-6 xl:col-span-2">
			<Card title="Workflow assurance" subtitle="Répartition opérationnelle des bons">
				<div class="grid gap-3 md:grid-cols-5">
					<WorkflowPill
						label="Brouillons"
						count={vouchers.filter((v) => v.status === 'draft').length}
						color="bg-slate-500"
					/>
					<WorkflowPill
						label="Soumis"
						count={vouchers.filter((v) => v.status === 'submitted').length}
						color="bg-blue-500"
					/>
					<WorkflowPill
						label="Contrôlés"
						count={vouchers.filter((v) => v.status === 'controlled').length}
						color="bg-amber-500"
					/>
					<WorkflowPill
						label="Validés"
						count={vouchers.filter((v) => v.status === 'validated').length}
						color="bg-green-500"
					/>
					<WorkflowPill
						label="Annulés/Rejetés"
						count={vouchers.filter((v) => v.status === 'cancelled' || v.status === 'rejected')
							.length}
						color="bg-red-500"
					/>
				</div>
			</Card>

			<Card title="Tous les bons PEC" subtitle="Recherche, filtrage et suivi détaillé">
				<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<SearchInput
						id="voucher-search"
						class="w-full max-w-md"
						bind:value={search}
						placeholder="Rechercher un bon, patient, compagnie..."
						label="Rechercher un bon PEC"
					/>

					<div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
						{#each ['all', 'draft', 'submitted', 'controlled', 'validated', 'cancelled'] as status (status)}
							<FilterChip
								selected={statusFilter === status}
								onclick={() => (statusFilter = status)}
							>
								\1
							</FilterChip>
						{/each}
					</div>
				</div>

				<Table minWidth="760px" aria-label="Bons de prise en charge">
					<thead>
						<tr>
							<th>Bon</th>
							<th>Patient / compagnie</th>
							<th>Motif</th>
							<th class="mc-num">Montant</th>
							<th>Statut</th>
							<th class="mc-actions">Action</th>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							<TableState state="loading" colspan={6} title="Chargement des bons PEC..." />
						{:else if error}
							<TableState
								state="error"
								colspan={6}
								title="Impossible de charger les bons PEC"
								description={error}
							/>
						{:else if filteredVouchers.length === 0}
							<TableState
								state="empty"
								colspan={6}
								title="Aucun bon trouvé"
								description="Essayez un autre filtre ou une autre recherche."
							/>
						{:else}
							{#each filteredVouchers as voucher (voucher.id)}
								<tr>
									<td class="mc-id">{voucher.voucherNumber}</td>
									<td>
										<p class="text-foreground">
											{voucher.patientName ?? `Patient #${voucher.patientId}`}
										</p>
										<p class="text-xs text-muted-foreground">
											{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
										</p>
									</td>
									<td>{voucher.reason || '—'}</td>
									<td class="mc-amount"
										>{Number(voucherAmount(voucher)).toLocaleString('fr-FR')} FCFA</td
									>
									<td>
										<Badge variant={statusVariant(voucher.status)}
											>{statusLabel(voucher.status)}</Badge
										>
									</td>
									<td class="mc-actions">
										<Button
											size="sm"
											variant="ghost"
											onclick={() => goto(resolve(`/insurance/vouchers/${voucher.id}`))}
											>Ouvrir</Button
										>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</Table>
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Timeline assurance" subtitle="Activité récente">
				<div class="space-y-5">
					{#each vouchers.slice(0, 5) as voucher (voucher.id)}
						<div class="relative border-l-2 border-slate-200 pl-6">
							<div
								class="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white"
							></div>
							<p class="text-sm font-semibold text-slate-800">
								{voucher.voucherNumber} · {statusLabel(voucher.status)}
							</p>
							<p class="mt-1 text-xs text-slate-500">
								{voucher.patientName} · {voucher.companyName}
							</p>
						</div>
					{/each}
				</div>
			</Card>

			<Card title="Alertes assurance" subtitle="Points de vigilance">
				<div class="space-y-4">
					<AlertLine
						icon={Clock3}
						title="Contrôle en attente"
						description="Les bons soumis doivent être traités rapidement."
					/>
					<AlertLine
						icon={XCircle}
						title="Bons annulés"
						description="Analyser les causes d’annulation ou de rejet."
					/>
					<AlertLine
						icon={Shield}
						title="Conformité"
						description="Vérifier les garanties et documents joints."
					/>
				</div>
			</Card>
		</div>
	</div>
</div>
