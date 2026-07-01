<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Bell, LogOut, Search } from 'lucide-svelte';
	import { clearSession, user } from '$lib/stores/auth';

	async function logout() {
		clearSession();
		await goto(resolve('/login'));
	}
</script>

<header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
	<div class="relative w-full max-w-md">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

		<input
			placeholder="Rechercher un patient, un bon, une compagnie..."
			class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
		/>
	</div>

	<div class="flex items-center gap-4">
		<button class="relative rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
			<Bell size={19} />
			<span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
		</button>

		<div class="text-right">
			<p class="text-sm font-semibold text-slate-900">{$user?.name ?? 'Administrateur'}</p>
			<p class="text-xs text-slate-500">MedCore HIS</p>
		</div>

		<button
			onclick={logout}
			class="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
			title="Déconnexion"
		>
			<LogOut size={18} />
		</button>
	</div>
</header>
