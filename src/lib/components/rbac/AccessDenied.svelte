<script lang="ts">
	import { resolve } from '$app/paths';
	import { ShieldOff } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { defaultLandingRoute } from '$lib/rbac/navigation';
	import { getStoredPermissions } from '$lib/rbac/permissions';

	let {
		title = 'Accès non autorisé',
		description = 'Vous ne disposez pas des autorisations nécessaires pour accéder à cette fonctionnalité.',
		homeHref = defaultLandingRoute(getStoredPermissions())
	}: {
		title?: string;
		description?: string;
		homeHref?: string;
	} = $props();
</script>

<section
	class="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
	data-testid="access-denied"
>
	<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
		<ShieldOff size={28} />
	</div>
	<h2 class="text-xl font-bold text-slate-900">{title}</h2>
	<p class="text-sm text-muted-foreground">{description}</p>
	<a href={resolve(homeHref as '/dashboard')}>
		<Button>Retour à mon espace</Button>
	</a>
</section>
