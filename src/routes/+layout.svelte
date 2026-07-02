<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';

	let { children } = $props();

	const isAuthPage = $derived(page.url.pathname === '/login');
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
				{@render children()}
			</main>
		</div>
	</div>
{/if}
