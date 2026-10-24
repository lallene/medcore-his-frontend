<script lang="ts">
	import { resolve } from '$app/paths';
	import { ShieldOff } from 'lucide-svelte';
	import { buttonVariantClasses } from '$lib/design/status';
	import { defaultLandingRoute } from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	let {
		title = 'Accès non autorisé',
		description = 'Vous ne disposez pas des autorisations nécessaires pour accéder à cette fonctionnalité.',
		homeHref
	}: {
		title?: string;
		description?: string;
		homeHref?: string;
	} = $props();

	// Avoid evaluating localStorage during SSR (default prop init); fall back safely.
	const resolvedHome = $derived(homeHref ?? defaultLandingRoute(getStoredPermissions()));
</script>

<section
	class="mx-auto mt-6 flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center shadow-xs"
	data-testid="access-denied"
>
	<div
		class="flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger-strong"
	>
		<ShieldOff size={24} aria-hidden="true" />
	</div>
	<h2 class="text-lg font-semibold text-foreground">{title}</h2>
	<p class="text-sm text-muted-foreground">{description}</p>
	<a
		href={resolve(resolvedHome as '/dashboard')}
		class={`mt-2 inline-flex min-h-control items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors ${buttonVariantClasses.primary}`}
	>
		Retour à mon espace
	</a>
</section>
