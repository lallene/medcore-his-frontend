<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		BadgeCheck,
		Clock3,
		Download,
		FileText,
		Mail,
		Printer,
		Shield,
		Upload,
		User,
		WalletCards,
		XCircle
	} from 'lucide-svelte';

	import { getVoucher } from '$lib/api/vouchers';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import type { InsuranceVoucher } from '$lib/types/voucher';

	import InfoBlock from '$lib/components/insurance/voucher/InfoBlock.svelte';
	import WorkflowStep from '$lib/components/insurance/voucher/WorkflowStep.svelte';
	import TimelineItem from '$lib/components/insurance/voucher/TimelineItem.svelte';

	let voucher = $state<InsuranceVoucher | null>(null);
	let loading = $state(true);
	let error = $state('');

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

	function canSubmit(status: string) {
		return status === 'draft';
	}

	function canControl(status: string) {
		return status === 'submitted';
	}

	function canValidate(status: string) {
		return status === 'controlled';
	}

	onMount(async () => {
		try {
			const id = Number(page.params.id);
			voucher = await getVoucher(id);
		} catch {
			error = 'Impossible de charger le bon.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Détail bon PEC | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du bon...</p>
{:else if error}
	<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
{:else if voucher}
	<div class="space-y-6">
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-700 via-[#0E4C92] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-4 right-10 text-[130px] font-black leading-none text-white/5"
			>
				PEC
			</div>

			<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
						Bon de prise en charge
					</p>

					<div class="mt-3 flex flex-wrap items-center gap-3">
						<h1 class="text-4xl font-bold leading-tight">
							{voucher.voucherNumber ?? `Bon #${voucher.id}`}
						</h1>

						<Badge variant={statusVariant(voucher.status)}>
							{statusLabel(voucher.status)}
						</Badge>
					</div>

					<p class="mt-3 max-w-2xl text-lg text-blue-50">
						{voucher.patientName ?? `Patient #${voucher.patientId}`} ·
						{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
					</p>

					<div class="mt-6 flex flex-wrap gap-3">
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							👤 {voucher.patientName ?? `Patient #${voucher.patientId}`}
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							🛡 {voucher.companyName ?? `Compagnie #${voucher.companyId}`}
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							💰 {Number(voucherAmount(voucher)).toLocaleString('fr-FR')} FCFA
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							📌 {statusLabel(voucher.status)}
						</span>
					</div>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/insurance/vouchers'))}>
					Retour
				</Button>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={WalletCards}
				title="Montant total"
				value={Number(voucherAmount(voucher)).toLocaleString('fr-FR')}
				detail="FCFA"
				trend="+0%"
				progress={70}
				accent="#EA580C"
			/>

			<MetricCard
				icon={Shield}
				title="Couvert"
				value={Number(voucher.coveredAmount ?? 0).toLocaleString('fr-FR')}
				detail="Part assurance"
				trend="+0%"
				progress={80}
				accent="#22C55E"
			/>

			<MetricCard
				icon={User}
				title="Part patient"
				value={Number(voucher.patientAmount ?? 0).toLocaleString('fr-FR')}
				detail="Reste à charge"
				trend="+0%"
				progress={35}
				accent="#0E4C92"
			/>

			<MetricCard
				icon={Clock3}
				title="Statut"
				value={statusLabel(voucher.status)}
				detail="Workflow assurance"
				trend="+0%"
				progress={60}
				accent="#7C3AED"
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<Card title="Informations du bon" subtitle="Détails de la demande de prise en charge">
					<div class="grid gap-4 md:grid-cols-2">
						<InfoBlock
							label="Patient"
							value={voucher.patientName ?? `Patient #${voucher.patientId}`}
						/>
						<InfoBlock
							label="Compagnie"
							value={voucher.companyName ?? `Compagnie #${voucher.companyId}`}
						/>
						<InfoBlock label="Motif" value={voucher.reason || '—'} />
						<InfoBlock
							label="Montant"
							value={`${Number(voucherAmount(voucher)).toLocaleString('fr-FR')} FCFA`}
						/>
						<InfoBlock
							label="Montant couvert"
							value={`${Number(voucher.coveredAmount ?? 0).toLocaleString('fr-FR')} FCFA`}
						/>
						<InfoBlock
							label="Part patient"
							value={`${Number(voucher.patientAmount ?? 0).toLocaleString('fr-FR')} FCFA`}
						/>
					</div>
				</Card>

				<Card title="Workflow assurance" subtitle="Suivi du traitement du bon">
					<div class="grid gap-3 md:grid-cols-5">
						<WorkflowStep
							title="Draft"
							subtitle="Création"
							active={voucher.status === 'draft'}
							color="#64748B"
						/>
						<WorkflowStep
							title="Submitted"
							subtitle="Soumission"
							active={voucher.status === 'submitted'}
							color="#0EA5E9"
						/>
						<WorkflowStep
							title="Controlled"
							subtitle="Contrôle"
							active={voucher.status === 'controlled'}
							color="#F59E0B"
						/>
						<WorkflowStep
							title="Validated"
							subtitle="Validation"
							active={voucher.status === 'validated'}
							color="#22C55E"
						/>
						<WorkflowStep
							title="Rejected"
							subtitle="Rejet / Annulation"
							active={voucher.status === 'rejected' || voucher.status === 'cancelled'}
							color="#EF4444"
						/>
					</div>
				</Card>

				<Card title="Historique" subtitle="Timeline du bon">
					<div class="space-y-5">
						<TimelineItem
							icon={FileText}
							title="Bon créé"
							detail="Création du bon dans MedCore"
							color="#0E4C92"
						/>

						{#if voucher.status !== 'draft'}
							<TimelineItem
								icon={Clock3}
								title="Bon soumis"
								detail="Transmission au service assurance"
								color="#0EA5E9"
							/>
						{/if}

						{#if voucher.status === 'controlled' || voucher.status === 'validated'}
							<TimelineItem
								icon={Shield}
								title="Contrôle effectué"
								detail="Vérification des informations et garanties"
								color="#F59E0B"
							/>
						{/if}

						{#if voucher.status === 'validated'}
							<TimelineItem
								icon={BadgeCheck}
								title="Bon validé"
								detail="Prise en charge acceptée"
								color="#22C55E"
							/>
						{/if}

						{#if voucher.status === 'cancelled' || voucher.status === 'rejected'}
							<TimelineItem
								icon={XCircle}
								title="Bon annulé ou rejeté"
								detail="Le workflow est terminé pour ce bon"
								color="#EF4444"
							/>
						{/if}
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Traitement contextualisé du bon">
					<div class="space-y-3">
						<Button fullWidth disabled={!canSubmit(voucher.status)}>Soumettre</Button>
						<Button fullWidth variant="secondary" disabled={!canControl(voucher.status)}>
							Contrôler
						</Button>
						<Button fullWidth variant="success" disabled={!canValidate(voucher.status)}>
							Valider
						</Button>
						<Button fullWidth variant="danger" disabled={!canValidate(voucher.status)}>
							Rejeter
						</Button>
					</div>
				</Card>

				<Card title="Documents" subtitle="Pièces justificatives">
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
					>
						<Upload class="mx-auto text-slate-400" size={28} />
						<p class="mt-3 font-semibold text-slate-800">Déposer des fichiers</p>
						<p class="mt-1 text-sm text-slate-500">PDF, ordonnance, compte rendu, scanner...</p>
					</div>
				</Card>

				<Card title="Exports" subtitle="Documents générés">
					<div class="space-y-3">
						<Button fullWidth variant="secondary">
							<Download size={16} />
							Générer le bon PDF
						</Button>

						<Button fullWidth variant="secondary">
							<Mail size={16} />
							Envoyer à la compagnie
						</Button>

						<Button fullWidth variant="secondary">
							<Printer size={16} />
							Imprimer
						</Button>
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
