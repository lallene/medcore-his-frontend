<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { clearSession, user } from '$lib/stores/auth';

	async function logout() {
		clearSession();
		await goto(resolve('/login'));
	}
</script>

<header class="flex h-16 items-center justify-between border-b bg-white px-6">
	<h2 class="text-xl font-semibold text-slate-900">Dashboard</h2>

	<div class="flex items-center gap-4">
		<span class="text-sm font-medium text-slate-700">{$user?.name}</span>

		<button onclick={logout} class="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
			Déconnexion
		</button>
	</div>
</header>
