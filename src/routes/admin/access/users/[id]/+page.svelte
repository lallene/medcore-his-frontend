<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		clearAccessOverride,
		getAccessSimulation,
		getAccessUser,
		getAccessUserAudit,
		setAccessOverride,
		setAccessUserActive,
		setAccessUserFunctions,
		setAccessUserServices
	} from '$lib/api/access';
	import { getStaffCatalog } from '$lib/api/staff';
	import { listOrganizationServices } from '$lib/api/organization';
	import { canManageAccess, canManageOverrides, sourceLabel } from '$lib/components/access/state';
	import type { AccessAuditEvent, AccessSimulation, AccessUserDetail } from '$lib/types/access';
	import type { OrganizationService } from '$lib/types/organization';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

	let detail = $state<AccessUserDetail | null>(null);
	let sim = $state<AccessSimulation | null>(null);
	let audit = $state<AccessAuditEvent[]>([]);
	let catalogFunctions = $state<Record<string, string>>({});
	let orgServices = $state<OrganizationService[]>([]);
	let tab = $state('profil');
	let permissions = $state<string[]>([]);
	let error = $state('');
	let loading = $state(true);
	let reason = $state('');
	let overridePerm = $state('');
	let overrideEffect = $state<'GRANT' | 'DENY'>('GRANT');
	let confirmDeactivate = $state(false);
	let draftFunctions = $state<string[]>([]);
	let primaryServiceId = $state<number | null>(null);
	let secondaryIds = $state<number[]>([]);

	const profileId = $derived(Number(page.params.id));

	async function reload() {
		loading = true;
		error = '';
		try {
			detail = await getAccessUser(profileId);
			draftFunctions = [...detail.functions];
			primaryServiceId = detail.primaryServiceId;
			secondaryIds = detail.services.filter((s) => !s.isPrimary).map((s) => s.id);
			if (tab === 'simulation') sim = await getAccessSimulation(profileId);
			if (tab === 'historique') audit = await getAccessUserAudit(profileId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			const raw = localStorage.getItem('medcore_token');
			if (raw) permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
		} catch {
			permissions = [];
		}
		const [catalog, services] = await Promise.all([getStaffCatalog(), listOrganizationServices()]);
		catalogFunctions = catalog.functions;
		orgServices = services;
		await reload();
	});

	async function onTab(id: string) {
		tab = id;
		if (id === 'simulation') sim = await getAccessSimulation(profileId);
		if (id === 'historique') audit = await getAccessUserAudit(profileId);
	}

	function toggleFn(code: string) {
		draftFunctions = draftFunctions.includes(code)
			? draftFunctions.filter((c) => c !== code)
			: [...draftFunctions, code].sort();
	}
</script>

<div class="space-y-6" data-testid="access-user-detail">
	<a class="text-sm text-primary hover:underline" href={resolve('/admin/access')}
		>← Centre d'accès</a
	>
	{#if loading && !detail}
		<LoadingState label="Chargement…" />
	{:else if detail}
		<PageHeader
			eyebrow="Accès utilisateur"
			title={detail.name}
			description={`${detail.email} · ${detail.employeeCode}`}
		/>
		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<Tabs
			tabs={[
				{ id: 'profil', label: 'Profil' },
				{ id: 'fonctions', label: 'Fonctions' },
				{ id: 'services', label: 'Services' },
				{ id: 'permissions', label: 'Permissions' },
				{ id: 'effectifs', label: 'Accès effectifs' },
				{ id: 'simulation', label: 'Simulation' },
				{ id: 'historique', label: 'Historique' }
			]}
			bind:value={tab}
			onchange={(v) => void onTab(v)}
		/>
		{#if tab === 'profil'}
			<section
				class="space-y-3 rounded-xl border border-border p-4"
				data-testid="access-tab-profil"
			>
				<p><strong>Poste :</strong> {detail.jobTitle || '—'}</p>
				<p><strong>Département :</strong> {detail.primaryDepartment || '—'}</p>
				<p>
					<strong>Statut :</strong>
					<StatusBadge
						status={detail.active ? 'ACTIVE' : 'INACTIVE'}
						label={detail.active ? 'Actif' : 'Inactif'}
					/>
				</p>
				<p><strong>Niveau :</strong> {detail.accessLevel}</p>
				<p><strong>Fonctions :</strong> {detail.functions.join(', ') || '—'}</p>
				{#if canManageAccess(permissions)}
					<div class="flex flex-wrap gap-2 pt-2">
						<input
							class="min-w-[220px] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
							placeholder="Motif (optionnel)"
							bind:value={reason}
						/>
						{#if detail.active}
							<Button variant="danger" onclick={() => (confirmDeactivate = true)}>Désactiver</Button
							>
						{:else}
							<Button
								onclick={async () => {
									detail = await setAccessUserActive(profileId, true, reason);
								}}>Activer</Button
							>
						{/if}
					</div>
				{/if}
			</section>
		{:else if tab === 'fonctions'}
			<section class="space-y-3" data-testid="access-tab-fonctions">
				{#each Object.entries(catalogFunctions) as [code, label] (code)}
					<label class="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
						<input
							type="checkbox"
							checked={draftFunctions.includes(code)}
							onchange={() => toggleFn(code)}
							disabled={!canManageAccess(permissions)}
						/>
						<span>
							<span class="font-medium">{label}</span>
							<span class="block text-xs text-muted-foreground">{code}</span>
						</span>
					</label>
				{/each}
				{#if canManageAccess(permissions)}
					<Button
						onclick={async () => {
							detail = await setAccessUserFunctions(profileId, draftFunctions, reason);
						}}>Enregistrer les fonctions</Button
					>
				{/if}
			</section>
		{:else if tab === 'services'}
			<section class="space-y-3" data-testid="access-tab-services">
				<label class="block text-sm"
					>Service principal
					<select
						class="mt-1 w-full rounded-lg border border-border px-3 py-2"
						bind:value={primaryServiceId}
						disabled={!canManageAccess(permissions)}
					>
						<option value={null}>—</option>
						{#each orgServices as s (s.id)}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</label>
				<p class="text-sm font-medium">Services secondaires</p>
				{#each orgServices as s (s.id)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={secondaryIds.includes(s.id)}
							disabled={!canManageAccess(permissions) || primaryServiceId === s.id}
							onchange={() => {
								secondaryIds = secondaryIds.includes(s.id)
									? secondaryIds.filter((id) => id !== s.id)
									: [...secondaryIds, s.id];
							}}
						/>
						{s.name}
					</label>
				{/each}
				<p class="text-xs text-muted-foreground">
					Impact informatif : retirer un service retire le scope file / patients de ce service
					(backend source de vérité).
				</p>
				{#if canManageAccess(permissions)}
					<Button
						onclick={async () => {
							detail = await setAccessUserServices(
								profileId,
								primaryServiceId,
								secondaryIds.filter((id) => id !== primaryServiceId),
								reason
							);
						}}>Enregistrer les services</Button
					>
				{/if}
			</section>
		{:else if tab === 'permissions' || tab === 'effectifs'}
			<section class="space-y-2" data-testid="access-tab-permissions">
				{#if canManageOverrides(permissions)}
					<div class="flex flex-wrap gap-2 rounded-xl border border-border p-3">
						<input
							class="rounded-lg border border-border px-3 py-2 text-sm"
							placeholder="permission.key"
							bind:value={overridePerm}
						/>
						<select
							class="rounded-lg border border-border px-3 py-2 text-sm"
							bind:value={overrideEffect}
						>
							<option value="GRANT">GRANT</option>
							<option value="DENY">DENY</option>
						</select>
						<input
							class="rounded-lg border border-border px-3 py-2 text-sm"
							placeholder="Motif"
							bind:value={reason}
						/>
						<Button
							onclick={async () => {
								detail = await setAccessOverride(profileId, overridePerm, overrideEffect, reason);
								overridePerm = '';
							}}>Appliquer exception</Button
						>
					</div>
				{/if}
				{#each detail.effective as e (e.permission)}
					<div
						class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
					>
						<div>
							<div class="font-medium">{e.label || e.permission}</div>
							<div class="text-xs text-muted-foreground">
								{e.permission} · {e.domain} · scope {e.scopeHint}
								{#if e.sensitive}
									· <span class="font-semibold text-amber-700">Accès sensible</span>{/if}
							</div>
							<div class="text-xs">{sourceLabel(e.source, e.sourceName)}</div>
						</div>
						<div class="flex items-center gap-2">
							<StatusBadge
								status={e.allowed ? 'ACTIVE' : 'INACTIVE'}
								label={e.allowed ? 'Autorisé' : 'Non autorisé'}
							/>
							{#if canManageOverrides(permissions) && (e.source === 'DIRECT_GRANT' || e.source === 'DIRECT_DENY')}
								<Button
									size="sm"
									variant="secondary"
									onclick={async () => {
										detail = await clearAccessOverride(profileId, e.permission, reason);
									}}>Retirer</Button
								>
							{/if}
						</div>
					</div>
				{/each}
			</section>
		{:else if tab === 'simulation'}
			<section class="space-y-4" data-testid="access-tab-simulation">
				{#if sim}
					<Alert tone="info">{sim.note}</Alert>
					<div>
						<h3 class="mb-2 font-semibold">Navigation visible</h3>
						<ul class="space-y-1 text-sm">
							{#each sim.navigation as n (n.href)}
								<li>
									{n.visible ? '✓' : '✕'}
									{n.title} <span class="text-muted-foreground">{n.href}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<h3 class="mb-2 font-semibold">Actions</h3>
						<ul class="space-y-1 text-sm">
							{#each sim.actions as a (a.code)}
								<li>{a.allowed ? '✓' : '✕'} {a.label}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		{:else if tab === 'historique'}
			<section data-testid="access-tab-audit">
				{#each audit as a (a.id)}
					<div class="border-b border-border py-2 text-sm">
						<div class="font-medium">{a.action} {a.permission}</div>
						<div class="text-xs text-muted-foreground">
							{a.oldValue} → {a.newValue} · {a.createdAt}
							{#if a.reason}· {a.reason}{/if}
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Aucun événement.</p>
				{/each}
			</section>
		{/if}
	{/if}
</div>

<ConfirmDialog
	bind:open={confirmDeactivate}
	title="Désactiver le compte ?"
	description="Le compte ne pourra plus s'authentifier. Anti-lockout appliqué côté serveur."
	confirmLabel="Désactiver"
	oncancel={() => (confirmDeactivate = false)}
	onconfirm={async () => {
		detail = await setAccessUserActive(profileId, false, reason);
	}}
/>
