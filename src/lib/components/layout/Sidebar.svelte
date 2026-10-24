<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import {
		BanknoteArrowDown,
		BarChart3,
		BookOpen,
		CalendarDays,
		CircleHelp,
		CreditCard,
		FileCheck2,
		FileText,
		FlaskConical,
		HeartPulse,
		Hospital,
		Image,
		LayoutDashboard,
		LifeBuoy,
		ListOrdered,
		Pill,
		ReceiptText,
		Settings,
		Shield,
		Stethoscope,
		Users,
		UsersRound
	} from 'lucide-svelte';
	import {
		adminMenu,
		filterVisibleNav,
		type NavHref,
		type NavItem,
		workspaceMenu,
		servicesMenu
	} from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	type MenuHref = NavHref;

	type MenuItem = NavItem & { icon: typeof LayoutDashboard };

	const iconByHref: Record<MenuHref, typeof LayoutDashboard> = {
		'/dashboard': LayoutDashboard,
		'/patients': Users,
		'/consultations': HeartPulse,
		'/queue': ListOrdered,
		'/queue/reception': UsersRound,
		'/queue/triage': ListOrdered,
		'/queue/doctor': Stethoscope,
		'/hospitalizations': Hospital,
		'/beds': Hospital,
		'/insurance': Shield,
		'/insurance/vouchers': FileText,
		'/insurance/authorizations': FileCheck2,
		'/billing': CreditCard,
		'/billing/refunds': BanknoteArrowDown,
		'/billing/refunds/report': BanknoteArrowDown,
		'/cash': CreditCard,
		'/receivables': ReceiptText,
		'/insurance-receivables': Shield,
		'/tickets': LifeBuoy,
		'/pharmacy': Pill,
		'/laboratory': FlaskConical,
		'/imaging': Image,
		'/agenda': CalendarDays,
		'/reports': BarChart3,
		'/administration': Settings,
		'/admin/staff': Users,
		'/admin/access': Shield,
		'/admin/organization': Settings,
		'/admin/act-catalog': BookOpen,
		'/admin/scheduling': CalendarDays,
		'/admin/qa': BarChart3,
		'/admin/design-system': LayoutDashboard,
		'/support/tickets': LifeBuoy,
		'/help': CircleHelp
	};

	function withIcons(items: NavItem[]): MenuItem[] {
		return items.map((item) => ({ ...item, icon: iconByHref[item.href] }));
	}

	interface Props {
		/** Ouverture du tiroir sous le breakpoint `lg` (toujours visible au-delà). */
		open?: boolean;
		onnavigate?: () => void;
	}

	let { open = false, onnavigate }: Props = $props();

	let navElement = $state<HTMLElement | null>(null);

	// Tiroir mobile : place le focus sur le premier lien à l'ouverture.
	$effect(() => {
		if (open) navElement?.querySelector<HTMLElement>('a[href]')?.focus();
	});

	let permissions = $state<string[]>([]);
	let staffName = $state('Utilisateur');
	let staffRole = $state('MedCore HIS');

	const visibleWorkspace = $derived(filterVisibleNav(workspaceMenu, permissions));
	const visibleServices = $derived(filterVisibleNav(servicesMenu, permissions));
	const visibleAdmin = $derived(filterVisibleNav(adminMenu, permissions));

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

	function isActive(href: string) {
		const pathname = page.url.pathname;

		if (href === '/insurance') {
			return pathname === '/insurance' || pathname.startsWith('/insurance/companies');
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	}

	const initials = $derived(
		staffName
			.split(/\s+/)
			.filter(Boolean)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'MC'
	);

	const sections = $derived(
		[
			{ id: 'workspace', label: 'Workspace', items: withIcons(visibleWorkspace) },
			{ id: 'services', label: 'Services', items: withIcons(visibleServices) },
			{ id: 'admin', label: 'Administration', items: withIcons(visibleAdmin) }
		].filter((section) => section.items.length > 0)
	);
</script>

<aside
	id="medcore-sidebar"
	aria-label="Navigation principale"
	class={`fixed inset-y-0 left-0 z-(--z-sidebar) flex w-sidebar flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${
		open ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'
	}`}
>
	<div class="border-b border-sidebar-border p-4">
		<div class="rounded-lg bg-white px-3 py-2.5">
			<img
				src="/branding/saint-raphael-logo.jpeg"
				alt={clinicBranding.name}
				class="mx-auto h-auto max-h-20 w-full object-contain"
			/>
		</div>
	</div>

	<nav
		bind:this={navElement}
		class="flex-1 space-y-6 overflow-y-auto px-3 py-5"
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
					{#each section.items as item (item.href)}
						{@const Icon = item.icon}
						{@const active = isActive(item.href)}

						<li>
							<a
								href={resolve(item.href as '/dashboard')}
								aria-current={active ? 'page' : undefined}
								onclick={() => onnavigate?.()}
								class={`relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-small font-medium transition-colors focus-visible:outline-sidebar-ring ${
									active
										? 'bg-sidebar-primary text-sidebar-primary-foreground'
										: 'text-slate-300 hover:bg-sidebar-accent hover:text-white'
								}`}
							>
								{#if active}
									<span
										class="absolute inset-y-1.5 left-0 w-0.5 rounded-r-sm bg-brand-accent"
										aria-hidden="true"
									></span>
								{/if}

								<Icon size={18} aria-hidden="true" class="shrink-0 opacity-90" />
								<span class="min-w-0 flex-1 truncate">{item.title}</span>

								{#if item.soon}
									<span
										class="rounded-sm border border-white/15 px-1.5 text-2xs font-medium text-slate-300"
									>
										v2
									</span>
								{/if}
							</a>
						</li>
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
