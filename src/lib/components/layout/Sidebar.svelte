<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import {
		BarChart3,
		CalendarDays,
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
		'/admin/qa': BarChart3,
		'/admin/design-system': LayoutDashboard,
		'/support/tickets': LifeBuoy
	};

	function withIcons(items: NavItem[]): MenuItem[] {
		return items.map((item) => ({ ...item, icon: iconByHref[item.href] }));
	}

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
</script>

<aside
	class="fixed left-0 top-0 z-40 flex h-screen w-80 flex-col border-r border-slate-800 bg-[#020817] text-white"
>
	<div class="border-b border-slate-800 p-1">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-2">
			<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
				Établissement
			</p>

			<div class="mt-4 w-full rounded-3xl bg-white p-4 shadow-xl">
				<img
					src="/branding/saint-raphael-logo.jpeg"
					alt={clinicBranding.name}
					class="h-auto w-full object-contain"
				/>
			</div>
		</div>
	</div>
	<nav class="flex-1 overflow-y-auto px-5 py-7">
		{#if visibleWorkspace.length > 0}
			<div class="mb-8">
				<div class="mb-3 flex items-center gap-3 px-3">
					<div class="h-px flex-1 bg-slate-800"></div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
						Workspace
					</p>
					<div class="h-px flex-1 bg-slate-800"></div>
				</div>

				<div class="space-y-1">
					{#each withIcons(visibleWorkspace) as item (item.href)}
						{@const Icon = item.icon}
						{@const active = isActive(item.href)}

						<a
							href={resolve(item.href as '/dashboard')}
							class={`group relative flex items-center justify-between rounded-2xl px-5 py-3.5 text-sm transition-all duration-200 ${
								active
									? 'bg-[#0E4C92] text-white shadow-lg'
									: 'text-slate-300 hover:translate-x-1 hover:bg-slate-900 hover:text-white'
							}`}
						>
							{#if active}
								<span
									class="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#18B893]"
								></span>
							{/if}

							<span class="flex items-center gap-3">
								<Icon size={20} />
								<span class="font-medium">{item.title}</span>
							</span>

							{#if item.soon}
								<span
									class="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300"
								>
									v2
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		{#if visibleServices.length > 0}
			<div class="mb-8">
				<div class="mb-3 flex items-center gap-3 px-3">
					<div class="h-px flex-1 bg-slate-800"></div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
						Services
					</p>
					<div class="h-px flex-1 bg-slate-800"></div>
				</div>

				<div class="space-y-1">
					{#each withIcons(visibleServices) as item (item.href)}
						{@const Icon = item.icon}
						{@const active = isActive(item.href)}

						<a
							href={resolve(item.href as '/dashboard')}
							class={`group relative flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition-all duration-200 ${
								active
									? 'bg-[#0E4C92] text-white shadow-lg'
									: 'text-slate-300 hover:translate-x-1 hover:bg-slate-900 hover:text-white'
							}`}
						>
							{#if active}
								<span
									class="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#18B893]"
								></span>
							{/if}

							<span class="flex items-center gap-3">
								<Icon size={20} />
								<span class="font-medium">{item.title}</span>
							</span>

							{#if item.soon}
								<span
									class="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300"
								>
									v2
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		{#if visibleAdmin.length > 0}
			<div class="mb-8">
				<div class="mb-3 flex items-center gap-3 px-3">
					<div class="h-px flex-1 bg-slate-800"></div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
						Administration
					</p>
					<div class="h-px flex-1 bg-slate-800"></div>
				</div>

				<div class="space-y-1">
					{#each withIcons(visibleAdmin) as item (item.href)}
						{@const Icon = item.icon}
						{@const active = isActive(item.href)}

						<a
							href={resolve(item.href as '/dashboard')}
							class={`group relative flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition-all duration-200 ${
								active
									? 'bg-[#0E4C92] text-white shadow-lg'
									: 'text-slate-300 hover:translate-x-1 hover:bg-slate-900 hover:text-white'
							}`}
						>
							{#if active}
								<span
									class="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#18B893]"
								></span>
							{/if}

							<span class="flex items-center gap-3">
								<Icon size={20} />
								<span class="font-medium">{item.title}</span>
							</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</nav>

	<div class="border-t border-slate-800 p-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
			<div class="flex items-center gap-3">
				<div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E4C92] font-bold">
					DA
				</div>

				<div>
					<p class="font-bold text-white">{staffName}</p>
					<p class="text-sm text-slate-400">{staffRole}</p>
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between text-xs text-slate-500">
				<span>Dernière connexion</span>
				<span>Aujourd’hui</span>
			</div>
		</div>
	</div>
</aside>
