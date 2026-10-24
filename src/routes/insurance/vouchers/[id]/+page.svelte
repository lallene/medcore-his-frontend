<script lang="ts">
	import { medcoreColors } from '$lib/design/theme';
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
		<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
						Bon de prise en charge
					</p>

					<div class="mt-1.5 flex flex-wrap items-center gap-3">
						<h1 class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
							{voucher.voucherNumber ?? `Bon #${voucher.id}`}
						</h1>

						<Badge variant={statusVariant(voucher.status)}>
							{statusLabel(voucher.status)}
						</Badge>
					</div>

					<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
						{voucher.patientName ?? `Patient #${voucher.patientId}`} ·
						{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
					</p>

					<div class="mt-4 flex flex-wrap gap-2">
						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							{voucher.patientName ?? `Patient #${voucher.patientId}`}
						</span>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
						</span>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							{Number(voucherAmount(voucher)).toLocaleString('fr-FR')} FCFA
						</span>

						<span
							class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary"
						>
							{statusLabel(voucher.status)}
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
				accent={medcoreColors.semantic.warning}
			/>

			<MetricCard
				icon={Shield}
				title="Couvert"
				value={Number(voucher.coveredAmount ?? 0).toLocaleString('fr-FR')}
				detail="Part assurance"
				trend="+0%"
				progress={80}
				accent={medcoreColors.semantic.success}
			/>

			<MetricCard
				icon={User}
				title="Part patient"
				value={Number(voucher.patientAmount ?? 0).toLocaleString('fr-FR')}
				detail="Reste à charge"
				trend="+0%"
				progress={35}
				accent={medcoreColors.primary}
			/>

			<MetricCard
				icon={Clock3}
				title="Statut"
				value={statusLabel(voucher.status)}
				detail="Workflow assurance"
				trend="+0%"
				progress={60}
				accent={medcoreColors.primary}
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="min-w-0 space-y-6 xl:col-span-2">
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
							color={medcoreColors.neutral.textMuted}
						/>
						<WorkflowStep
							title="Submitted"
							subtitle="Soumission"
							active={voucher.status === 'submitted'}
							color={medcoreColors.semantic.info}
						/>
						<WorkflowStep
							title="Controlled"
							subtitle="Contrôle"
							active={voucher.status === 'controlled'}
							color={medcoreColors.semantic.warning}
						/>
						<WorkflowStep
							title="Validated"
							subtitle="Validation"
							active={voucher.status === 'validated'}
							color={medcoreColors.semantic.success}
						/>
						<WorkflowStep
							title="Rejected"
							subtitle="Rejet / Annulation"
							active={voucher.status === 'rejected' || voucher.status === 'cancelled'}
							color={medcoreColors.semantic.danger}
						/>
					</div>
				</Card>

				<Card title="Historique" subtitle="Timeline du bon">
					<div class="space-y-5">
						<TimelineItem
							icon={FileText}
							title="Bon créé"
							detail="Création du bon dans MedCore"
							color={medcoreColors.primary}
						/>

						{#if voucher.status !== 'draft'}
							<TimelineItem
								icon={Clock3}
								title="Bon soumis"
								detail="Transmission au service assurance"
								color={medcoreColors.semantic.info}
							/>
						{/if}

						{#if voucher.status === 'controlled' || voucher.status === 'validated'}
							<TimelineItem
								icon={Shield}
								title="Contrôle effectué"
								detail="Vérification des informations et garanties"
								color={medcoreColors.semantic.warning}
							/>
						{/if}

						{#if voucher.status === 'validated'}
							<TimelineItem
								icon={BadgeCheck}
								title="Bon validé"
								detail="Prise en charge acceptée"
								color={medcoreColors.semantic.success}
							/>
						{/if}

						{#if voucher.status === 'cancelled' || voucher.status === 'rejected'}
							<TimelineItem
								icon={XCircle}
								title="Bon annulé ou rejeté"
								detail="Le workflow est terminé pour ce bon"
								color={medcoreColors.semantic.danger}
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
						<Upload class="mx-auto text-slate-500" size={28} />
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
