<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		BadgeCheck,
		Clock3,
		FileText,
		Search,
		Shield,
		WalletCards,
		XCircle
	} from 'lucide-svelte';

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
	<section
		class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-700 via-[#0E4C92] to-[#18B893] p-8 text-white shadow-xl"
	>
		<div
			class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute bottom-4 right-10 text-[150px] font-black leading-none text-white/5"
		>
			PEC
		</div>

		<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
					Insurance Operations Center
				</p>

				<h1 class="mt-3 text-4xl font-bold leading-tight">Bons de prise en charge</h1>

				<p class="mt-3 max-w-2xl text-lg text-blue-50">
					Suivi opérationnel des demandes, compagnies, montants, statuts et délais de validation.
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						📄 {vouchers.length} Bons PEC
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						✅ {vouchers.filter((item) => item.status === 'validated').length} Validés
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🟡 {vouchers.filter((item) => item.status === 'submitted').length} En attente
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						💰 {totalAmount.toLocaleString('fr-FR')} FCFA
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
			accent="#7C3AED"
		/>

		<MetricCard
			icon={Clock3}
			title="En attente"
			value={vouchers.filter((item) => item.status === 'submitted').length}
			detail="À contrôler"
			trend="+4%"
			progress={60}
			accent="#F59E0B"
		/>

		<MetricCard
			icon={BadgeCheck}
			title="Validés"
			value={vouchers.filter((item) => item.status === 'validated').length}
			detail="PEC acceptées"
			trend="+9%"
			progress={78}
			accent="#22C55E"
		/>

		<MetricCard
			icon={WalletCards}
			title="Montant"
			value={`${Math.round(totalAmount / 1000000)}M`}
			detail="FCFA estimés"
			trend="+15%"
			progress={72}
			accent="#EA580C"
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
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
				<div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div class="relative w-full max-w-md">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

						<input
							bind:value={search}
							placeholder="Rechercher un bon, patient, compagnie..."
							class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-[#0E4C92] focus:bg-white"
						/>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each ['all', 'draft', 'submitted', 'controlled', 'validated', 'cancelled'] as status (status)}
							<button
								onclick={() => (statusFilter = status)}
								class={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
									statusFilter === status
										? 'bg-[#0E4C92] text-white'
										: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
								}`}
							>
								{status === 'all' ? 'Tous' : statusLabel(status)}
							</button>
						{/each}
					</div>
				</div>

				{#if loading}
					<p class="text-sm text-slate-500">Chargement des bons PEC...</p>
				{:else if error}
					<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
				{:else if filteredVouchers.length === 0}
					<div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
						<p class="text-4xl">📄</p>
						<h3 class="mt-4 text-lg font-bold text-slate-900">Aucun bon trouvé</h3>
						<p class="mt-2 text-sm text-slate-500">
							Essayez un autre filtre ou une autre recherche.
						</p>
					</div>
				{:else}
					<div class="overflow-hidden rounded-2xl border border-slate-200">
						{#each filteredVouchers as voucher (voucher.id)}
							<div
								class="flex flex-col gap-4 border-b border-slate-100 bg-white p-5 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
							>
								<div class="flex items-center gap-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"
									>
										<FileText size={22} />
									</div>

									<div>
										<p class="font-bold text-slate-900">{voucher.voucherNumber}</p>
										<p class="text-sm text-slate-500">
											{voucher.patientName ?? `Patient #${voucher.patientId}`} ·
											{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
										</p>
									</div>
								</div>

								<div class="grid gap-4 text-sm md:grid-cols-3 lg:w-[560px]">
									<div>
										<p class="text-xs text-slate-400">Motif</p>
										<p class="font-semibold text-slate-700">{voucher.reason || '—'}</p>
									</div>

									<div>
										<p class="text-xs text-slate-400">Montant</p>
										<p class="font-semibold text-slate-700">
											{Number(voucherAmount(voucher)).toLocaleString('fr-FR')} FCFA
										</p>
									</div>

									<div>
										<p class="text-xs text-slate-400">Statut</p>
										<Badge variant={statusVariant(voucher.status)}>
											{statusLabel(voucher.status)}
										</Badge>
									</div>
								</div>

								<Button onclick={() => goto(resolve(`/insurance/vouchers/${voucher.id}`))}>
									Ouvrir
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Timeline assurance" subtitle="Activité récente">
				<div class="space-y-5">
					{#each vouchers.slice(0, 5) as voucher (voucher.id)}
						<div class="relative border-l-2 border-slate-200 pl-6">
							<div
								class="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[#0E4C92] ring-4 ring-white"
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
