<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import { login } from '$lib/api/auth';
	import { setSession } from '$lib/stores/auth';

	let email = $state('admin@medcore.local');
	let password = $state('admin123');
	let loading = $state(false);
	let error = $state('');

	async function submit() {
		loading = true;
		error = '';

		try {
			const session = await login({ email, password });
			setSession(session.token, session.user);
			await goto(resolve('/dashboard'));
		} catch {
			error = 'Email ou mot de passe incorrect.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Connexion | {clinicBranding.name}</title>
</svelte:head>

<div class="grid min-h-screen bg-slate-50 lg:grid-cols-2">
	<section class="hidden bg-[#0E4C92] p-12 text-white lg:flex lg:flex-col lg:justify-between">
		<div>
			<div class="flex items-center gap-4">
				<img
					src="/branding/saint-raphael-logo.jpeg"
					alt={clinicBranding.name}
					class="h-20 w-20 rounded-2xl bg-white object-contain p-2"
				/>

				<div>
					<h1 class="text-3xl font-bold">{clinicBranding.name}</h1>
					<p class="text-blue-100">{clinicBranding.subtitle}</p>
				</div>
			</div>

			<div class="mt-20 max-w-xl">
				<p class="text-5xl font-bold leading-tight">
					{clinicBranding.slogan}
				</p>

				<p class="mt-6 text-lg text-blue-100">
					Une plateforme hospitalière moderne pour les patients, consultations, assurances et
					workflows médicaux.
				</p>
			</div>
		</div>

		<p class="text-sm text-blue-100">{clinicBranding.poweredBy}</p>
	</section>

	<section class="flex items-center justify-center p-6">
		<div class="w-full max-w-md">
			<div class="mb-8 text-center lg:hidden">
				<img
					src="/branding/saint-raphael-logo.jpeg"
					alt={clinicBranding.name}
					class="mx-auto h-24 w-24 rounded-2xl bg-white object-contain p-2 shadow"
				/>
				<h1 class="mt-4 text-2xl font-bold text-slate-900">{clinicBranding.shortName}</h1>
				<p class="text-sm text-slate-500">{clinicBranding.slogan}</p>
			</div>

			<div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
				<div class="mb-8">
					<p class="text-sm font-semibold uppercase tracking-wide text-[#0E4C92]">
						Connexion sécurisée
					</p>
					<h2 class="mt-2 text-3xl font-bold text-slate-900">Bienvenue</h2>
					<p class="mt-2 text-slate-500">Accédez à votre espace MedCore HIS.</p>
				</div>

				<form
					class="space-y-5"
					onsubmit={async (e) => {
						e.preventDefault();
						await submit();
					}}
				>
					<div>
						<label for="email" class="mb-2 block text-sm font-medium text-slate-700"> Email </label>
						<input
							id="email"
							type="email"
							bind:value={email}
							class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0E4C92]"
						/>
					</div>

					<div>
						<label for="password" class="mb-2 block text-sm font-medium text-slate-700">
							Mot de passe
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0E4C92]"
						/>
					</div>

					{#if error}
						<div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="w-full rounded-xl bg-[#0E4C92] py-3 font-semibold text-white transition hover:bg-[#1565C0] disabled:opacity-50"
					>
						{loading ? 'Connexion...' : 'Se connecter'}
					</button>
				</form>

				<p class="mt-8 text-center text-xs text-slate-400">
					{clinicBranding.poweredBy}
				</p>
			</div>
		</div>
	</section>
</div>
