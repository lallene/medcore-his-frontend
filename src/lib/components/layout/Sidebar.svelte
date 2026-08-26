<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
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
		Pill,
		ReceiptText,
		Settings,
		Shield,
		Users
	} from 'lucide-svelte';

	type MenuHref =
		| '/dashboard'
		| '/patients'
		| '/consultations'
		| '/hospitalizations'
		| '/beds'
		| '/insurance'
		| '/insurance/vouchers'
		| '/insurance/authorizations'
		| '/billing'
		| '/cash'
		| '/receivables'
		| '/insurance-receivables'
		| '/pharmacy'
		| '/laboratory'
		| '/imaging'
		| '/agenda'
		| '/reports'
		| '/administration'
		| '/admin/staff'
		| '/admin/organization'
		| '/admin/qa'
		| '/tickets'
		| '/support/tickets';

	type MenuItem = {
		title: string;
		href: MenuHref;
		icon: typeof LayoutDashboard;
		soon?: boolean;
		badge?: string;
		permissions?: string[];
	};

	const workspaceMenu: MenuItem[] = [
		{
			title: 'Dashboard',
			href: '/dashboard',
			icon: LayoutDashboard,
			permissions: ['dashboard.read']
		},
		{ title: 'Patients', href: '/patients', icon: Users, permissions: ['patients:read'] },
		{
			title: 'Consultations',
			href: '/consultations',
			icon: HeartPulse,
			soon: true,
			permissions: ['consultations.read']
		},
		{
			title: 'Hospitalisations',
			href: '/hospitalizations',
			icon: Hospital,
			permissions: ['hospitalizations.read']
		},
		{ title: 'Chambres & lits', href: '/beds', icon: Hospital, permissions: ['beds.read'] },
		{
			title: 'Assurances',
			href: '/insurance',
			icon: Shield,
			permissions: ['insurance.company.read', 'insurance.coverage.read']
		},
		{
			title: 'Bons PEC',
			href: '/insurance/vouchers',
			icon: FileText,
			permissions: ['insurance.voucher.read']
		},
		{
			title: 'Autorisations PEC',
			href: '/insurance/authorizations',
			icon: FileCheck2,
			permissions: ['insurance.authorization.read']
		},
		{ title: 'Facturation', href: '/billing', icon: CreditCard, permissions: ['billing.read'] },
		{
			title: 'Caisse',
			href: '/cash',
			icon: CreditCard,
			permissions: ['cash.session.read', 'cash.payment.create']
		},
		{
			title: 'Créances patients',
			href: '/receivables',
			icon: ReceiptText,
			permissions: ['receivables.read']
		},
		{
			title: 'Créances assureurs',
			href: '/insurance-receivables',
			icon: Shield,
			permissions: ['insurance_receivables.read']
		},
		{ title: 'Mes tickets', href: '/tickets', icon: LifeBuoy, permissions: ['ticket.read.own'] }
	];

	const servicesMenu: MenuItem[] = [
		{
			title: 'Pharmacie',
			href: '/pharmacy',
			icon: Pill,
			permissions: ['pharmacy.stock.read', 'pharmacy.dispensation.read']
		},
		{
			title: 'Laboratoire',
			href: '/laboratory',
			icon: FlaskConical,
			permissions: ['laboratory.read']
		},
		{ title: 'Imagerie', href: '/imaging', icon: Image, permissions: ['imaging.read'] },
		{
			title: 'Agenda',
			href: '/agenda',
			icon: CalendarDays,
			soon: true,
			permissions: ['consultations.read']
		}
	];

	const adminMenu: MenuItem[] = [
		{ title: 'Rapports', href: '/reports', icon: BarChart3, permissions: ['dashboard.read'] },
		{ title: 'Administration', href: '/administration', icon: Settings, permissions: ['*'] },
		{ title: 'Personnel', href: '/admin/staff', icon: Users, permissions: ['staff.read'] },
		{
			title: 'Organisation',
			href: '/admin/organization',
			icon: Settings,
			permissions: ['organization.read']
		},
		{ title: 'Automated QA', href: '/admin/qa', icon: BarChart3, permissions: ['qa.read'] },
		{
			title: 'Service Desk',
			href: '/support/tickets',
			icon: LifeBuoy,
			permissions: ['ticket.read.service', 'ticket.read.all']
		}
	];
	let permissions = $state<string[]>([]);
	let staffName = $state('Utilisateur');
	let staffRole = $state('MedCore HIS');
	const visible = (item: MenuItem) =>
		!item.permissions?.length ||
		item.permissions.some((p) => permissions.includes('*') || permissions.includes(p));
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
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
		<div class="mb-8">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
					Workspace
				</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each workspaceMenu.filter(visible) as item (item.href)}
					{@const Icon = item.icon}
					{@const active = isActive(item.href)}

					<a
						href={resolve(item.href)}
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

		<div class="mb-8">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Services</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each servicesMenu.filter(visible) as item (item.href)}
					{@const Icon = item.icon}
					{@const active = isActive(item.href)}

					<a
						href={resolve(item.href)}
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

		<div class="mb-8">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
					Administration
				</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each adminMenu.filter(visible) as item (item.href)}
					{@const Icon = item.icon}
					{@const active = isActive(item.href)}

					<a
						href={resolve(item.href)}
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
