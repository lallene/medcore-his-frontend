<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		description: string;
	}

	let { icon: Icon, title, description }: Props = $props();
</script>

<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
	<div class="flex items-start gap-3">
		<div class="rounded-xl bg-white p-2 text-amber-600">
			<Icon size={18} />
		</div>

		<div>
			<p class="font-semibold text-slate-900">{title}</p>
			<p class="mt-1 text-sm text-slate-500">{description}</p>
		</div>
	</div>
</div>
