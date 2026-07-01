<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Activity,
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
		soon: boolean;
	};

	const menu: MenuItem[] = [
		{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, soon: false },
		{ title: 'Patients', href: '/patients', icon: Users, soon: false },
		{ title: 'Consultations', href: '/consultations', icon: HeartPulse, soon: true },
		{ title: 'Assurances', href: '/insurance', icon: Shield, soon: false },
		{ title: 'Bons PEC', href: '/insurance/vouchers', icon: FileText, soon: false },
		{ title: 'Facturation', href: '/billing', icon: CreditCard, soon: true },
		{ title: 'Pharmacie', href: '/pharmacy', icon: Pill, soon: true },
		{ title: 'Laboratoire', href: '/laboratory', icon: FlaskConical, soon: true },
		{ title: 'Imagerie', href: '/imaging', icon: Image, soon: true },
		{ title: 'Agenda', href: '/agenda', icon: CalendarDays, soon: true },
		{ title: 'Rapports', href: '/reports', icon: BarChart3, soon: true },
		{ title: 'Administration', href: '/administration', icon: Settings, soon: false }
	];
</script>

<aside class="flex h-screen w-72 flex-col border-r border-slate-200 bg-slate-950 text-white">
	<div class="border-b border-slate-800 p-6">
		<div class="flex items-center gap-3">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
				<Activity size={24} />
			</div>

			<div>
				<h1 class="text-xl font-bold tracking-wide">MEDCORE HIS</h1>
				<p class="text-xs text-slate-400">Hospital Information System</p>
			</div>
		</div>
	</div>

	<nav class="flex-1 space-y-1 overflow-y-auto px-4 py-5">
		{#each menu as item (item.href)}
			{@const Icon = item.icon}

			<a
				href={resolve(item.href)}
				class="group flex items-center justify-between rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
			>
				<span class="flex items-center gap-3">
					<Icon size={19} />
					<span>{item.title}</span>
				</span>

				{#if item.soon}
					<span class="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
						Bientôt
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-slate-800 p-4">
		<div class="rounded-xl bg-slate-900 p-4">
			<p class="text-sm font-semibold">Dr Admin</p>
			<p class="text-xs text-slate-400">Administrateur</p>
		</div>
	</div>
</aside>
