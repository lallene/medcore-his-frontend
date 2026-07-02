<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import {
		BarChart3,
		CalendarDays,
		CreditCard,
		FileText,
		FlaskConical,
		HeartPulse,
		Image,
		LayoutDashboard,
		Pill,
		Settings,
		Shield,
		Users
	} from 'lucide-svelte';

	type MenuHref =
		| '/dashboard'
		| '/patients'
		| '/consultations'
		| '/insurance'
		| '/insurance/vouchers'
		| '/billing'
		| '/pharmacy'
		| '/laboratory'
		| '/imaging'
		| '/agenda'
		| '/reports'
		| '/administration';

	type MenuItem = {
		title: string;
		href: MenuHref;
		icon: typeof LayoutDashboard;
		soon?: boolean;
		badge?: string;
	};

	const workspaceMenu: MenuItem[] = [
		{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ title: 'Patients', href: '/patients', icon: Users },
		{ title: 'Consultations', href: '/consultations', icon: HeartPulse, soon: true },
		{ title: 'Assurances', href: '/insurance', icon: Shield },
		{ title: 'Bons PEC', href: '/insurance/vouchers', icon: FileText },
		{ title: 'Facturation', href: '/billing', icon: CreditCard, soon: true }
	];

	const servicesMenu: MenuItem[] = [
		{ title: 'Pharmacie', href: '/pharmacy', icon: Pill, soon: true },
		{ title: 'Laboratoire', href: '/laboratory', icon: FlaskConical, soon: true },
		{ title: 'Imagerie', href: '/imaging', icon: Image, soon: true },
		{ title: 'Agenda', href: '/agenda', icon: CalendarDays, soon: true }
	];

	const adminMenu: MenuItem[] = [
		{ title: 'Rapports', href: '/reports', icon: BarChart3 },
		{ title: 'Administration', href: '/administration', icon: Settings }
	];

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
	<div class="border-b border-slate-800 p-6">
		<div class="flex items-center gap-4">
			<div class="rounded-3xl bg-white p-3 shadow-xl">
				<img
					src="/branding/saint-raphael-logo.jpeg"
					alt={clinicBranding.name}
					class="h-16 w-16 object-contain"
				/>
			</div>

			<div class="min-w-0">
				<h1 class="truncate text-2xl font-bold leading-tight text-white">
					{clinicBranding.shortName}
				</h1>
				<p class="mt-1 text-sm text-slate-400">Clinique privée</p>
				<p class="text-xs text-slate-500">Powered by MedCore HIS v1.0</p>
			</div>
		</div>

		<div class="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
			<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
				Établissement
			</p>

			<p class="mt-3 text-base font-bold leading-6 text-white">
				{clinicBranding.name}
			</p>

			<p class="mt-2 text-sm leading-6 text-slate-400">
				{clinicBranding.slogan}
			</p>

			<div class="mt-4 flex items-center justify-between rounded-2xl bg-slate-950/60 px-3 py-2">
				<div class="flex items-center gap-2">
					<span
						class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]"
					></span>
					<span class="text-sm font-semibold text-emerald-400">LIVE</span>
				</div>

				<span class="text-xs text-slate-400">99.98%</span>
			</div>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-5 py-7">
		<div class="mb-7">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
					Workspace
				</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each workspaceMenu as item (item.href)}
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

		<div class="mb-7">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Services</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each servicesMenu as item (item.href)}
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

		<div class="mb-7">
			<div class="mb-3 flex items-center gap-3 px-3">
				<div class="h-px flex-1 bg-slate-800"></div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
					Administration
				</p>
				<div class="h-px flex-1 bg-slate-800"></div>
			</div>

			<div class="space-y-1">
				{#each adminMenu as item (item.href)}
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
					<p class="font-bold text-white">Dr Admin</p>
					<p class="text-sm text-slate-400">Administrateur</p>
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between text-xs text-slate-500">
				<span>Dernière connexion</span>
				<span>Aujourd’hui</span>
			</div>
		</div>
	</div>
</aside>
