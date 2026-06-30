<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/api/auth';
	import { setSession } from '$lib/stores/auth';
	import { resolve } from '$app/paths';

	let email = $state('admin@medcore.local');
	let password = $state('admin123');

	let loading = $state(false);
	let error = $state('');

	async function submit() {
		loading = true;
		error = '';

		try {
			const session = await login({
				email,
				password
			});

			setSession(session.token, session.user);

			await goto(resolve('/dashboard'));
		} catch (err) {
			console.error(err);
			error = 'Email ou mot de passe incorrect.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Connexion | MedCore HIS</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-100">
	<div class="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-slate-800">🏥 MedCore HIS</h1>

			<p class="mt-2 text-slate-500">Hospital Information System</p>
		</div>

		<form
			class="space-y-5"
			onsubmit={async (e) => {
				e.preventDefault();
				await submit();
			}}
		>
			<div>
				<label for="email" class="mb-2 block text-sm font-medium"> Email </label>

				<input
					id="email"
					type="email"
					bind:value={email}
					class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium"> Mot de passe </label>

				<input
					id="password"
					type="password"
					bind:value={password}
					class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
				/>
			</div>

			{#if error}
				<div class="rounded-lg bg-red-100 p-3 text-sm text-red-700">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				class="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
				disabled={loading}
			>
				{#if loading}
					Connexion...
				{:else}
					Se connecter
				{/if}
			</button>
		</form>

		<div class="mt-8 text-center text-xs text-slate-400">MedCore HIS v0.1.0</div>
	</div>
</div>
