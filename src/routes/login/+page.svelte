<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import { login } from '$lib/api/auth';
	import { setSession } from '$lib/stores/auth';

	import {
		Activity,
		AlertCircle,
		Eye,
		EyeOff,
		FileText,
		HeartPulse,
		Loader2,
		Lock,
		Mail,
		ShieldCheck,
		Sparkles,
		Stethoscope
	} from 'lucide-svelte';

	let showPassword = $state(false);
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

<div class="min-h-screen overflow-hidden bg-[#F5F8FC] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
	<section
		class="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#083B75] via-[#0E4C92] to-[#18B893] p-10 text-white lg:flex lg:flex-col lg:justify-between"
	>
		<div
			class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute bottom-16 right-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute bottom-10 right-8 text-[150px] font-black leading-none text-white/5"
		>
			HIS
		</div>

		<div class="relative">
			<div class="mt-14 max-w-2xl">
				<div
					class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur"
				>
					<Sparkles size={16} />
					Plateforme hospitalière intelligente
				</div>

				<h1 class="text-5xl font-black leading-tight tracking-tight">
					{clinicBranding.slogan}
				</h1>

				<p class="mt-5 max-w-xl text-lg leading-relaxed text-blue-50">
					Une solution moderne pour piloter les patients, consultations, pharmacie, assurances et
					workflows médicaux avec sécurité et traçabilité.
				</p>
			</div>

			<div class="mt-10 grid max-w-2xl grid-cols-2 gap-3">
				<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
					<Stethoscope size={22} class="mb-3 text-emerald-100" />
					<p class="font-bold">Consultations</p>
					<p class="mt-1 text-sm text-blue-50">Dossier clinique structuré</p>
				</div>

				<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
					<FileText size={22} class="mb-3 text-emerald-100" />
					<p class="font-bold">Dossiers patients</p>
					<p class="mt-1 text-sm text-blue-50">Historique et suivi médical</p>
				</div>

				<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
					<HeartPulse size={22} class="mb-3 text-emerald-100" />
					<p class="font-bold">Pharmacie</p>
					<p class="mt-1 text-sm text-blue-50">Ordonnances et délivrances</p>
				</div>

				<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
					<Activity size={22} class="mb-3 text-emerald-100" />
					<p class="font-bold">Traçabilité</p>
					<p class="mt-1 text-sm text-blue-50">Sécurité des actions</p>
				</div>
			</div>
		</div>

		<div class="relative flex items-center justify-between text-sm text-blue-100">
			<span>{clinicBranding.poweredBy}</span>
			<span>Confidentialité · Sécurité · Performance</span>
		</div>
	</section>

	<section class="flex min-h-screen items-center justify-center p-6">
		<div class="w-full max-w-md">
			<div class="mb-8 text-center lg:hidden">
				<img
					src="/branding/saint-raphael-logo.jpeg"
					alt={clinicBranding.name}
					class="mx-auto h-28 w-28 rounded-3xl bg-white object-contain p-2 shadow"
				/>
				<h1 class="mt-4 text-2xl font-bold text-slate-900">{clinicBranding.shortName}</h1>
				<p class="text-sm text-slate-500">{clinicBranding.slogan}</p>
			</div>

			<div
				class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/80"
			>
				<div class="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5">
					<ShieldCheck size={14} class="text-[#0E4C92]" />
					<p class="text-xs font-bold uppercase tracking-wide text-[#0E4C92]">
						Connexion sécurisée
					</p>
				</div>
				<div class="inline-flex rounded-[2rem] bg-white/95 p-4 shadow-2xl shadow-blue-950/20">
					<img
						src="/branding/saint-raphael-logo.jpeg"
						alt={clinicBranding.name}
						class="h-56 w-86 rounded-[1.5rem] object-contain"
					/>
				</div>
				<div class="mb-8">
					<p class="mt-2 text-slate-500">Accédez à votre espace professionnel MedCore HIS.</p>
				</div>

				<form
					class="space-y-5"
					onsubmit={async (e) => {
						e.preventDefault();
						await submit();
					}}
				>
					<div>
						<label for="email" class="mb-2 block text-sm font-semibold text-slate-700">
							Email professionnel
						</label>

						<div class="relative">
							<Mail
								class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>

							<input
								id="email"
								type="email"
								autocomplete="username"
								placeholder="prenom.nom@clinique.com"
								bind:value={email}
								class="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0E4C92] focus:bg-white focus:ring-4 focus:ring-[#0E4C92]/10"
							/>
						</div>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<label for="password" class="block text-sm font-semibold text-slate-700">
								Mot de passe
							</label>

							<button type="button" class="text-xs font-bold text-[#0E4C92] hover:underline">
								Mot de passe oublié ?
							</button>
						</div>

						<div class="relative">
							<Lock
								class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
								size={18}
							/>

							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								autocomplete="current-password"
								placeholder="••••••••"
								bind:value={password}
								class="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-11 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0E4C92] focus:bg-white focus:ring-4 focus:ring-[#0E4C92]/10"
							/>

							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
							>
								{#if showPassword}
									<EyeOff size={18} />
								{:else}
									<Eye size={18} />
								{/if}
							</button>
						</div>
					</div>

					{#if error}
						<div class="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
							<AlertCircle size={16} class="mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0E4C92] py-3.5 font-bold text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5 hover:bg-[#1565C0] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if loading}
							<Loader2 size={18} class="animate-spin" />
							Connexion en cours...
						{:else}
							Se connecter
						{/if}
					</button>
				</form>

				<div class="mt-8 rounded-2xl bg-slate-50 p-4">
					<div class="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
						<Lock size={12} />
						<span>Connexion chiffrée · {clinicBranding.poweredBy}</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
