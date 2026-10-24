<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { clinicBranding } from '$lib/config/clinic';
	import { login } from '$lib/api/auth';
	import { setSession } from '$lib/stores/auth';
	import { defaultLandingRoute } from '$lib/rbac/navigation';
	import { jwtDecode } from 'jwt-decode';

	import {
		Activity,
		Eye,
		EyeOff,
		FileText,
		HeartPulse,
		Lock,
		Mail,
		ShieldCheck,
		Sparkles,
		Stethoscope
	} from 'lucide-svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let showPassword = $state(false);
	let email = $state('admin@medcore.local');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function submit() {
		loading = true;
		error = '';

		try {
			const session = await login({ email, password });
			setSession(session.token, session.user);
			const perms = jwtDecode<{ permissions?: string[] }>(session.token).permissions ?? [];
			await goto(resolve(defaultLandingRoute(perms) as '/dashboard'));
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

<div class="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
	<section
		class="hidden min-h-screen flex-col justify-between bg-primary-active p-10 text-white lg:flex xl:p-14"
	>
		<div>
			<div class="mt-10 max-w-2xl">
				<div
					class="mb-6 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-small font-medium text-blue-50"
				>
					<Sparkles size={15} aria-hidden="true" />
					Plateforme hospitalière intelligente
				</div>

				<h1 class="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
					{clinicBranding.slogan}
				</h1>

				<p class="mt-5 max-w-xl text-base leading-relaxed text-blue-100">
					Une solution moderne pour piloter les patients, consultations, pharmacie, assurances et
					workflows médicaux avec sécurité et traçabilité.
				</p>
			</div>

			<ul class="mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
				<li class="bg-primary-active p-5">
					<Stethoscope size={20} class="mb-3 text-brand-accent" aria-hidden="true" />
					<p class="font-semibold">Consultations</p>
					<p class="mt-1 text-sm text-blue-100">Dossier clinique structuré</p>
				</li>

				<li class="bg-primary-active p-5">
					<FileText size={20} class="mb-3 text-brand-accent" aria-hidden="true" />
					<p class="font-semibold">Dossiers patients</p>
					<p class="mt-1 text-sm text-blue-100">Historique et suivi médical</p>
				</li>

				<li class="bg-primary-active p-5">
					<HeartPulse size={20} class="mb-3 text-brand-accent" aria-hidden="true" />
					<p class="font-semibold">Pharmacie</p>
					<p class="mt-1 text-sm text-blue-100">Ordonnances et délivrances</p>
				</li>

				<li class="bg-primary-active p-5">
					<Activity size={20} class="mb-3 text-brand-accent" aria-hidden="true" />
					<p class="font-semibold">Traçabilité</p>
					<p class="mt-1 text-sm text-blue-100">Sécurité des actions</p>
				</li>
			</ul>
		</div>

		<div class="flex items-center justify-between text-small text-blue-100">
			<span>{clinicBranding.poweredBy}</span>
			<span>Confidentialité · Sécurité · Performance</span>
		</div>
	</section>

	<section class="flex min-h-screen items-center justify-center p-4 sm:p-6">
		<div class="w-full max-w-md">
			<div class="mb-6 text-center lg:hidden">
				<h1 class="text-xl font-semibold text-foreground">{clinicBranding.shortName}</h1>
				<p class="mt-1 text-sm text-muted-foreground">{clinicBranding.slogan}</p>
			</div>

			<div class="rounded-xl border border-border bg-surface p-6 shadow-md sm:p-8">
				<div class="flex justify-center">
					<img
						src="/branding/saint-raphael-logo.jpeg"
						alt={clinicBranding.name}
						class="h-36 w-auto max-w-full object-contain"
					/>
				</div>

				<div class="mt-6 mb-6 border-t border-border pt-6">
					<div
						class="inline-flex items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft px-2 py-1"
					>
						<ShieldCheck size={14} class="text-primary" aria-hidden="true" />
						<p class="text-2xs font-semibold uppercase tracking-eyebrow text-primary">
							Connexion sécurisée
						</p>
					</div>
					<p class="mt-3 text-sm text-muted-foreground">
						Accédez à votre espace professionnel MedCore HIS.
					</p>
				</div>

				<form
					class="space-y-4"
					onsubmit={async (e) => {
						e.preventDefault();
						await submit();
					}}
				>
					<div>
						<label
							for="email"
							class="mb-1.5 block text-small font-semibold text-foreground-secondary"
						>
							Email professionnel
						</label>

						<div class="relative">
							<Mail
								class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground"
								size={17}
								aria-hidden="true"
							/>

							<input
								data-testid="qa-login-email"
								id="email"
								type="email"
								autocomplete="username"
								placeholder="prenom.nom@clinique.com"
								bind:value={email}
								class="min-h-control-lg w-full rounded-lg border border-input bg-surface py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:ring-3 focus:ring-primary/15 pr-3 pl-10"
							/>
						</div>
					</div>

					<div>
						<div class="mb-1.5 flex items-center justify-between">
							<label
								for="password"
								class="block text-small font-semibold text-foreground-secondary"
							>
								Mot de passe
							</label>

							<button
								type="button"
								class="text-xs font-semibold text-primary underline-offset-4 hover:underline"
							>
								Mot de passe oublié ?
							</button>
						</div>

						<div class="relative">
							<Lock
								class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground"
								size={17}
								aria-hidden="true"
							/>

							<input
								data-testid="qa-login-password"
								id="password"
								type={showPassword ? 'text' : 'password'}
								autocomplete="current-password"
								placeholder="••••••••"
								bind:value={password}
								class="min-h-control-lg w-full rounded-lg border border-input bg-surface py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:ring-3 focus:ring-primary/15 pr-11 pl-10"
							/>

							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
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
						<Alert tone="danger">{error}</Alert>
					{/if}

					<Button data-testid="qa-login-submit" type="submit" fullWidth size="lg" {loading}>
						{loading ? 'Connexion en cours...' : 'Se connecter'}
					</Button>
				</form>

				<div
					class="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"
				>
					<Lock size={12} aria-hidden="true" />
					<span>Connexion chiffrée · {clinicBranding.poweredBy}</span>
				</div>
			</div>
		</div>
	</section>
</div>
