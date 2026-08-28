<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import { canAccessPath } from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	let { children } = $props();

	const isAuthPage = $derived(page.url.pathname === '/login');
	let permissions = $state<string[]>([]);

	onMount(() => {
		permissions = getStoredPermissions();
	});

	const routeDenied = $derived(
		!isAuthPage && permissions.length > 0 && !canAccessPath(page.url.pathname, permissions)
	);
</script>

{#if isAuthPage}
	{@render children()}
{:else}
	<div class="flex min-h-screen bg-background">
		<Sidebar />

		<div class="ml-[20.5rem] flex min-w-0 flex-1 flex-col">
			<Header />

			<main
				class="min-h-screen flex-1 overflow-y-auto bg-gradient-to-b from-[#F6FAFD] to-[#F9FBFE] px-8 py-6"
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
