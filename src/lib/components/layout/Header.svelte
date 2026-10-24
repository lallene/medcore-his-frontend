<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Bell, LifeBuoy, LogOut, Menu, Search } from 'lucide-svelte';
	import { page } from '$app/state';
	import { clearSession, user } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { listTicketNotifications } from '$lib/api/ticketing';
	import { can, getStoredPermissions } from '$lib/rbac/permissions';

	interface Props {
		/** Ouvre le tiroir de navigation (sous le breakpoint `lg`). */
		onmenu?: () => void;
		menuOpen?: boolean;
	}

	let { onmenu, menuOpen = false }: Props = $props();

	let now = $state(new Date());
	let ticketNotifications = $state(0);
	onMount(() => {
		const clock = setInterval(() => {
			now = new Date();
		}, 60_000);

		const perms = getStoredPermissions();
		if (can(perms, 'ticket.read.own') && localStorage.getItem('medcore_token'))
			void listTicketNotifications()
				.then((items) => (ticketNotifications = items.filter((item) => !item.readAt).length))
				.catch(() => (ticketNotifications = 0));

		return () => clearInterval(clock);
	});

	async function logout() {
		clearSession();
		await goto(resolve('/login'));
	}

	const iconButton =
		'relative inline-flex size-control shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground';
</script>

<header
	class="sticky top-0 z-(--z-topbar) flex h-topbar items-center gap-3 border-b border-border bg-surface px-4 sm:px-6"
>
	<button
		id="medcore-menu-button"
		type="button"
		class={`${iconButton} lg:hidden`}
		onclick={() => onmenu?.()}
		aria-label="Ouvrir le menu"
		aria-controls="medcore-sidebar"
		aria-expanded={menuOpen}
	>
		<Menu size={20} aria-hidden="true" />
	</button>

	<div class="relative hidden w-full max-w-md sm:block">
		<label for="medcore-global-search" class="sr-only">Recherche globale</label>
		<Search
			class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle-foreground"
			size={16}
			aria-hidden="true"
		/>
		<input
			id="medcore-global-search"
			placeholder="Rechercher un patient, un bon, une compagnie..."
			class="h-9 w-full rounded-lg border border-border bg-surface-muted pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:bg-surface focus:ring-3 focus:ring-primary/15"
		/>
	</div>

	<div class="ml-auto flex items-center gap-1 sm:gap-2">
		<div class="mr-2 hidden text-right leading-tight xl:block">
			<p class="text-small font-medium text-foreground tabular-nums">
				{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
			</p>
			<p class="text-xs text-muted-foreground first-letter:uppercase">
				{now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
			</p>
		</div>

		<a
			href={resolve(
				`/tickets/create?module=${encodeURIComponent(page.url.pathname.split('/')[1] || 'MedCore')}&page=${encodeURIComponent(page.url.pathname)}`
			)}
			class="hidden h-9 items-center gap-2 rounded-lg px-3 text-small font-medium text-foreground-secondary transition-colors hover:bg-surface-muted hover:text-foreground 2xl:inline-flex"
			title="Signaler un problème sur cette page"
		>
			<LifeBuoy size={16} aria-hidden="true" /> Signaler un problème
		</a>

		<a href={resolve('/tickets')} class={iconButton} aria-label="Notifications Service Desk">
			<Bell size={18} aria-hidden="true" />
			{#if ticketNotifications > 0}<span
					class="absolute top-1 right-1 min-w-4 rounded-full bg-danger-strong px-1 text-center text-2xs font-semibold text-white ring-2 ring-surface"
					>{ticketNotifications}</span
				>{/if}
		</a>

		<div class="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true"></div>

		<div class="hidden text-right leading-tight sm:block">
			<p class="max-w-48 truncate text-small font-semibold text-foreground">
				{$user?.name ?? 'Administrateur'}
			</p>
			<p class="text-xs text-muted-foreground">MedCore HIS</p>
		</div>

		<button
			type="button"
			onclick={logout}
			class={iconButton}
			title="Déconnexion"
			aria-label="Déconnexion"
		>
			<LogOut size={18} aria-hidden="true" />
		</button>
	</div>
</header>
