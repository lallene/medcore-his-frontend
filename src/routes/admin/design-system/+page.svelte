<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { medcoreColors, medcoreSpacing, medcoreTypography } from '$lib/design/theme';

	let allowed = $state(false);
	let denied = $state(false);
	let demo = $state('');
	let checked = $state(true);
	let toggled = $state(false);
	let modalOpen = $state(false);
	let confirmOpen = $state(false);
	let tab = $state('palette');

	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (!raw) {
			denied = true;
			return;
		}
		try {
			const perms = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			allowed = perms.includes('*') || perms.includes('qa.read');
			denied = !allowed;
		} catch {
			denied = true;
		}
	});
</script>

<svelte:head>
	<title>Design System | MedCore HIS</title>
</svelte:head>

{#if denied}
	<div class="space-y-4 p-6">
		<Alert tone="danger" title="Accès refusé">
			Cette page documentaire est réservée aux administrateurs (permission `*` ou `qa.read`).
		</Alert>
		<Button variant="secondary" onclick={() => goto(resolve('/dashboard'))}>Retour dashboard</Button
		>
	</div>
{:else if allowed}
	<div class="space-y-8 p-6" data-testid="design-system-page">
		<PageHeader
			eyebrow="MedCore Design System"
			title="Charte graphique & composants"
			description="Catalogue interne non destructif. Aucune mutation métier, aucune commande système."
		/>

		<Tabs
			bind:value={tab}
			tabs={[
				{ id: 'palette', label: 'Palette' },
				{ id: 'components', label: 'Composants' },
				{ id: 'states', label: 'États' }
			]}
		/>

		{#if tab === 'palette'}
			<section class="space-y-4" data-testid="ds-palette">
				<h2 class={medcoreTypography.sectionTitle}>Couleurs</h2>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{#each [['Primary', medcoreColors.primary], ['Success', medcoreColors.semantic.success], ['Warning', medcoreColors.semantic.warning], ['Danger', medcoreColors.semantic.danger], ['Info', medcoreColors.semantic.info], ['Surface', medcoreColors.neutral.surface], ['Muted', medcoreColors.neutral.surfaceMuted], ['Border', medcoreColors.neutral.border]] as [label, color] (label)}
						<div class="rounded-2xl border border-border bg-surface p-4">
							<div
								class="mb-3 h-16 rounded-xl border border-border"
								style={`background:${color}`}
							></div>
							<p class="text-sm font-semibold">{label}</p>
							<p class="font-mono text-xs text-slate-500">{color}</p>
						</div>
					{/each}
				</div>
				<h2 class={medcoreTypography.sectionTitle}>Typographie</h2>
				<div class="space-y-2 rounded-2xl border border-border bg-surface p-6">
					<p class={medcoreTypography.eyebrow}>Eyebrow</p>
					<p class={medcoreTypography.pageTitle}>Titre de page</p>
					<p class={medcoreTypography.sectionTitle}>Titre de section</p>
					<p class={medcoreTypography.body}>Corps de texte MedCore.</p>
					<p class={medcoreTypography.caption}>Légende / helper</p>
					<p class={medcoreTypography.kpi}>1 248</p>
				</div>
				<h2 class={medcoreTypography.sectionTitle}>Espacements</h2>
				<div class="flex flex-wrap items-end gap-3">
					{#each Object.entries(medcoreSpacing) as [name, value] (name)}
						<div class="text-center">
							<div class="rounded bg-primary/20" style={`width:${value};height:${value}`}></div>
							<p class="mt-1 text-xs text-slate-500">{name}</p>
						</div>
					{/each}
				</div>
			</section>
		{:else if tab === 'components'}
			<section class="space-y-6" data-testid="ds-components">
				<div class="flex flex-wrap gap-2" data-testid="ds-buttons">
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="success">Success</Button>
					<Button variant="danger">Danger</Button>
					<Button loading>Loading</Button>
					<Button disabled>Disabled</Button>
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<MetricCard title="Patients" value={1284} detail="Actifs" trend="+4%" progress={72} />
					<Card title="Carte standard" subtitle="Surface + ombre card">
						<p class="text-sm text-slate-600">Contenu de carte MedCore.</p>
					</Card>
					<div class="flex flex-wrap gap-2 self-start">
						<Badge variant="primary">Primary</Badge>
						<StatusBadge status="PASSED" />
						<StatusBadge status="FAILED" />
						<StatusBadge status="DRAFT" />
						<StatusBadge status="P1" />
					</div>
				</div>

				<FilterBar>
					<SearchInput bind:value={demo} class="min-w-[12rem] flex-1" />
					<Select
						aria-label="Statut démo"
						options={[
							{ label: 'Tous', value: '' },
							{ label: 'Actif', value: 'ACTIVE' }
						]}
						class="min-w-[10rem]"
					/>
					<Button variant="secondary">Filtrer</Button>
				</FilterBar>

				<div class="grid gap-4 md:grid-cols-2">
					<FormField id="ds-input" label="Nom" helper="Helper facultatif" required>
						<Input id="ds-input" placeholder="Exemple" />
					</FormField>
					<FormField id="ds-select" label="Service">
						<Select
							id="ds-select"
							options={[
								{ label: 'Urgences', value: 'urg' },
								{ label: 'Labo', value: 'lab' }
							]}
						/>
					</FormField>
					<FormField id="ds-area" label="Notes" class="md:col-span-2">
						<Textarea id="ds-area" placeholder="Texte…" />
					</FormField>
					<Checkbox bind:checked label="Case à cocher" />
					<Switch bind:checked={toggled} label="Interrupteur" />
				</div>

				<div class="flex gap-2">
					<Button onclick={() => (modalOpen = true)}>Ouvrir modal</Button>
					<Button variant="danger" onclick={() => (confirmOpen = true)}>Confirm danger</Button>
				</div>
			</section>
		{:else}
			<section class="space-y-4" data-testid="ds-states">
				<Alert tone="info" title="Information">Message informatif.</Alert>
				<Alert tone="success" title="Succès">Action confirmée.</Alert>
				<Alert tone="warning" title="Attention">Action sensible.</Alert>
				<Alert tone="danger" title="Erreur">Échec critique.</Alert>
				<LoadingState label="Chargement catalogue…" />
				<Skeleton lines={4} />
				<EmptyState title="État vide" description="Aucun élément à afficher dans ce catalogue." />
			</section>
		{/if}

		<p class="text-xs text-slate-400">
			Documentation : docs/DESIGN_SYSTEM.md — aucune exécution QA depuis cette page.
		</p>
	</div>

	<Modal bind:open={modalOpen} title="Modal standard" description="Exemple non destructif.">
		<p class="text-sm text-slate-600">Contenu de démonstration du design system.</p>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (modalOpen = false)}>Fermer</Button>
			<Button onclick={() => (modalOpen = false)}>Compris</Button>
		{/snippet}
	</Modal>

	<ConfirmDialog
		bind:open={confirmOpen}
		title="Confirmer la suppression ?"
		description="Démonstration uniquement — aucune donnée n’est modifiée."
		onconfirm={() => undefined}
	/>
{/if}
