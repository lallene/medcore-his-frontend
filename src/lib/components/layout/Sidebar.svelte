<script lang="ts">
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import {
		BarChart3,
		BookOpen,
		Building2,
		CalendarClock,
		CalendarDays,
		ChevronDown,
		CircleHelp,
		FileCheck2,
		FileText,
		FlaskConical,
		HandCoins,
		Headset,
		HeartPulse,
		Hospital,
		Image,
		LayoutDashboard,
		LifeBuoy,
		ListOrdered,
		Pill,
		ReceiptText,
		Shield,
		ShieldCheck,
		UserCog,
		Users,
		Wallet,
		Wrench
	} from 'lucide-svelte';
	import {
		buildVisibleNavigation,
		navGroupIdForHref,
		resolveActiveNavHref,
		type NavGroupId,
		type NavHref
	} from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	type Icon = typeof LayoutDashboard;

	// Presentation only: sub-menu children are rendered without icons to stay discreet.
	const iconByHref: Partial<Record<NavHref, Icon>> = {
		'/dashboard': LayoutDashboard,
		'/reports': BarChart3,
		'/patients': Users,
		'/agenda': CalendarDays,
		'/queue': ListOrdered,
		'/consultations': HeartPulse,
		'/pharmacy': Pill,
		'/laboratory': FlaskConical,
		'/imaging': Image,
		'/insurance': Shield,
		'/insurance/vouchers': FileText,
		'/insurance/authorizations': FileCheck2,
		'/cash': Wallet,
		'/tickets': LifeBuoy,
		'/help': CircleHelp,
		'/admin/staff': UserCog,
		'/admin/access': ShieldCheck,
		'/admin/organization': Building2,
		'/admin/act-catalog': BookOpen,
		'/admin/scheduling': CalendarClock,
		'/support/tickets': Headset
	};

	const iconByGroup: Record<NavGroupId, Icon> = {
		queue: ListOrdered,
		hospitalization: Hospital,
		billing: ReceiptText,
		recovery: HandCoins,
		'tech-tools': Wrench
	};

	interface Props {
		/** Ouverture du tiroir sous le breakpoint `lg` (toujours visible au-delà). */
		open?: boolean;
		onnavigate?: () => void;
	}

	let { open = false, onnavigate }: Props = $props();

	let navElement = $state<HTMLElement | null>(null);

	// Tiroir mobile : place le focus sur le premier élément de navigation à l'ouverture.
	$effect(() => {
		if (open) navElement?.querySelector<HTMLElement>('a[href], button')?.focus();
	});

	let permissions = $state<string[]>([]);
	let staffName = $state('Utilisateur');
	let staffRole = $state('MedCore HIS');

	const sections = $derived(buildVisibleNavigation(permissions));
	const activeHref = $derived(resolveActiveNavHref(page.url.pathname));
	const activeGroup = $derived(navGroupIdForHref(activeHref));

	// Manual open/close choices; groups without a choice follow the current route.
	let expandedOverrides = $state<Partial<Record<NavGroupId, boolean>>>({});

	// Entering a destination of a group re-opens it, so the active link is never hidden by navigation.
	$effect(() => {
		const href = activeHref;
		const group = activeGroup;
		if (!href || !group) return;
		untrack(() => {
			if (expandedOverrides[group] === false) {
				const next = { ...expandedOverrides };
				delete next[group];
				expandedOverrides = next;
			}
		});
	});

	function isExpanded(id: NavGroupId) {
		return expandedOverrides[id] ?? id === activeGroup;
	}

	function toggleGroup(id: NavGroupId) {
		expandedOverrides = { ...expandedOverrides, [id]: !isExpanded(id) };
	}

	onMount(() => {
		permissions = getStoredPermissions();
		const stored = localStorage.getItem('medcore_user');
		if (stored)
			try {
				const u = JSON.parse(stored) as {
					name?: string;
					functions?: string[];
					specialties?: string[];
					role?: string;
				};
				staffName = u.name ?? staffName;
				staffRole = u.functions?.[0] ?? u.specialties?.[0] ?? u.role ?? staffRole;
			} catch {
				// Compatible avec les anciennes sessions sans profil Staff.
			}
	});

	const initials = $derived(
		staffName
			.split(/\s+/)
			.filter(Boolean)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'MC'
	);

	const rowClass =
		'relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-small font-medium transition-colors focus-visible:outline-sidebar-ring';

	/** `emphasized`: inactive group label whose child is the current page. */
	function linkClass(active: boolean, emphasized = false) {
		return `${rowClass} ${
			active
				? 'bg-sidebar-primary text-sidebar-primary-foreground'
				: `${emphasized ? 'text-white' : 'text-slate-300'} hover:bg-sidebar-accent hover:text-white`
		}`;
	}
</script>

{#snippet activeMarker()}
	<span class="absolute inset-y-1.5 left-0 w-0.5 rounded-r-sm bg-brand-accent" aria-hidden="true"
	></span>
{/snippet}

{#snippet soonBadge()}
	<span class="rounded-sm border border-white/15 px-1.5 text-2xs font-medium text-slate-300">
		v2
	</span>
{/snippet}

<aside
	id="medcore-sidebar"
	aria-label="Navigation principale"
	class={`fixed inset-y-0 left-0 z-(--z-sidebar) flex w-sidebar flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${
		open ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'
	}`}
>
	<div class="shrink-0 border-b border-sidebar-border bg-white px-3 py-2">
		<img
			src="/branding/saint-raphael-logo.jpeg"
			alt={clinicBranding.name}
			class="mx-auto block h-auto max-h-36 w-full object-contain [@media(min-height:860px)]:max-h-44"
		/>
	</div>

	<nav
		bind:this={navElement}
		class="flex-1 space-y-5 overflow-y-auto px-3 py-4"
		aria-label="Modules"
	>
		{#each sections as section (section.id)}
			<div>
				<p
					class="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-muted"
					id={`nav-${section.id}`}
				>
					{section.label}
				</p>

				<ul class="space-y-0.5" aria-labelledby={`nav-${section.id}`}>
					{#each section.entries as entry (entry.kind === 'link' ? entry.item.href : entry.id)}
						{#if entry.kind === 'link'}
							{@const Icon = iconByHref[entry.item.href] ?? LayoutDashboard}
							{@const active = activeHref === entry.item.href}
							<li>
								<a
									href={resolve(entry.item.href as '/dashboard')}
									aria-current={active ? 'page' : undefined}
									onclick={() => onnavigate?.()}
									class={linkClass(active)}
								>
									{#if active}{@render activeMarker()}{/if}
									<Icon size={18} aria-hidden="true" class="shrink-0 opacity-90" />
									<span class="min-w-0 flex-1 truncate">{entry.item.title}</span>
									{#if entry.item.soon}{@render soonBadge()}{/if}
								</a>
							</li>
						{:else}
							{@const Icon = iconByGroup[entry.id]}
							{@const expanded = isExpanded(entry.id)}
							{@const ownActive = !!entry.item && activeHref === entry.item.href}
							{@const childActive = entry.children.some((child) => child.href === activeHref)}
							{@const listId = `nav-group-${entry.id}`}
							<li>
								{#if entry.item}
									<!-- Group label is a real page: the label navigates, the chevron toggles. -->
									<div class="flex items-center gap-0.5">
										<a
											href={resolve(entry.item.href as '/dashboard')}
											aria-current={ownActive ? 'page' : undefined}
											onclick={() => onnavigate?.()}
											class={`${linkClass(ownActive, childActive)} min-w-0 flex-1`}
										>
											{#if ownActive}{@render activeMarker()}{/if}
											<Icon size={18} aria-hidden="true" class="shrink-0 opacity-90" />
											<span class="min-w-0 flex-1 truncate">{entry.title}</span>
										</a>
										<button
											type="button"
											aria-expanded={expanded}
											aria-controls={listId}
											aria-label={`Sous-menu ${entry.title}`}
											onclick={() => toggleGroup(entry.id)}
											class="flex size-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:outline-sidebar-ring"
										>
											<ChevronDown
												size={16}
												aria-hidden="true"
												class={`transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`}
											/>
										</button>
									</div>
								{:else}
									<!-- Structural group: the whole row is a disclosure button. -->
									<button
										type="button"
										aria-expanded={expanded}
										aria-controls={listId}
										onclick={() => toggleGroup(entry.id)}
										class={`${rowClass} w-full text-left ${
											childActive ? 'text-white' : 'text-slate-300'
										} hover:bg-sidebar-accent hover:text-white`}
									>
										<Icon size={18} aria-hidden="true" class="shrink-0 opacity-90" />
										<span class="min-w-0 flex-1 truncate">{entry.title}</span>
										<ChevronDown
											size={16}
											aria-hidden="true"
											class={`shrink-0 text-slate-400 transition-transform duration-150 ${
												expanded ? '' : '-rotate-90'
											}`}
										/>
									</button>
								{/if}

								<ul
									id={listId}
									hidden={!expanded}
									class="mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border pl-2"
								>
									{#each entry.children as child (child.href)}
										{@const active = activeHref === child.href}
										<li>
											<a
												href={resolve(child.href as '/dashboard')}
												aria-current={active ? 'page' : undefined}
												onclick={() => onnavigate?.()}
												class={`relative flex min-h-8 items-center rounded-md px-3 py-1.5 text-small transition-colors focus-visible:outline-sidebar-ring ${
													active
														? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
														: 'text-slate-400 hover:bg-sidebar-accent hover:text-white'
												}`}
											>
												{#if active}{@render activeMarker()}{/if}
												<span class="min-w-0 flex-1 truncate">{child.title}</span>
												{#if child.soon}{@render soonBadge()}{/if}
											</a>
										</li>
									{/each}
								</ul>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<div class="border-t border-sidebar-border p-3">
		<div class="flex items-center gap-3 rounded-md px-2 py-2">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-white"
				aria-hidden="true"
			>
				{initials}
			</div>

			<div class="min-w-0">
				<p class="truncate text-small font-semibold text-white">{staffName}</p>
				<p class="truncate text-xs text-sidebar-muted">{staffRole}</p>
			</div>
		</div>

		<div class="mt-1 flex items-center justify-between px-2 text-2xs text-sidebar-muted">
			<span>Dernière connexion</span>
			<span>Aujourd’hui</span>
		</div>
	</div>
</aside>
