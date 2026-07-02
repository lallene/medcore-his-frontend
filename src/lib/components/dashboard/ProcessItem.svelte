<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		value: string;
	}

	let { icon: Icon, title, value }: Props = $props();
</script>

<div class="rounded-2xl bg-slate-50 p-4 transition hover:bg-blue-50">
	<div
		class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0E4C92] shadow-sm"
	>
		<Icon size={20} />
	</div>

	<p class="mt-4 font-semibold text-slate-900">{title}</p>
	<p class="mt-1 text-sm text-slate-500">{value}</p>
</div>
