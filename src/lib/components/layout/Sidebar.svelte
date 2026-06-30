<script lang="ts">
	import { resolve } from '$app/paths';
	import type { NavigationItem } from '$lib/types/navigation';
	import { LayoutDashboard, Settings, Shield, Users } from 'lucide-svelte';

	const menu: NavigationItem[] = [
		{
			title: 'Dashboard',
			href: '/dashboard',
			icon: 'dashboard'
		},
		{
			title: 'Patients',
			href: '/patients',
			icon: 'patients'
		},
		{
			title: "Compagnies d'assurance",
			href: '/insurance/companies',
			icon: 'insurance'
		},
		{
			title: 'Administration',
			href: '/administration',
			icon: 'administration'
		}
	];
</script>

<aside class="w-72 bg-slate-900 text-white">
	<div class="border-b border-slate-800 p-6">
		<h1 class="text-2xl font-bold">🏥 MedCore HIS</h1>
		<p class="text-sm text-slate-400">Hospital Information System</p>
	</div>

	<nav class="mt-6 space-y-2 px-4">
		{#each menu as item (item.href)}
			<a
				href={resolve(item.href)}
				class="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-800"
			>
				{#if item.icon === 'dashboard'}
					<LayoutDashboard size={20} />
				{:else if item.icon === 'patients'}
					<Users size={20} />
				{:else if item.icon === 'insurance'}
					<Shield size={20} />
				{:else}
					<Settings size={20} />
				{/if}

				<span>{item.title}</span>
			</a>
		{/each}
	</nav>
</aside>
