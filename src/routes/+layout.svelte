<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import { canAccessPath } from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	let { children } = $props();

	const isAuthPage = $derived(page.url.pathname === '/login');
	let permissions = $state<string[]>([]);
	let navOpen = $state(false);

	onMount(() => {
		permissions = getStoredPermissions();
	});

	// Referme le tiroir mobile à chaque changement de route.
	$effect(() => {
		void page.url.pathname;
		navOpen = false;
	});

	const routeDenied = $derived(
		!isAuthPage && permissions.length > 0 && !canAccessPath(page.url.pathname, permissions)
	);

	async function closeNav() {
		navOpen = false;
		// Attendre la levée de `inert` avant de rendre le focus au bouton menu.
		await tick();
		document.getElementById('medcore-menu-button')?.focus();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && navOpen) closeNav();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if isAuthPage}
	{@render children()}
{:else}
	<div class="min-h-screen bg-background">
		<a
			href="#medcore-main"
			class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-md"
		>
			Aller au contenu
		</a>

		<Sidebar open={navOpen} onnavigate={() => (navOpen = false)} />

		{#if navOpen}
			<button
				type="button"
				class="fixed inset-0 z-(--z-backdrop) bg-slate-950/40 lg:hidden"
				aria-label="Fermer le menu"
				onclick={closeNav}
			></button>
		{/if}

		<div class="flex min-h-screen min-w-0 flex-col lg:pl-sidebar" inert={navOpen}>
			<Header onmenu={() => (navOpen = true)} menuOpen={navOpen} />

			<main
				id="medcore-main"
				tabindex="-1"
				class="mx-auto w-full max-w-content min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
			>
				{#if routeDenied}
					<AccessDenied />
				{:else}
					{@render children()}
				{/if}
			</main>
		</div>
	</div>
{/if}
