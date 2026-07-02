<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		detail: string;
		color: string;
	}

	let { icon: Icon, title, detail, color }: Props = $props();
</script>

<div class="rounded-2xl bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
	<div
		class="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
		style={`background:${color}`}
	>
		<Icon size={19} />
	</div>

	<p class="mt-4 font-semibold text-slate-900">{title}</p>
	<p class="mt-1 text-sm text-slate-500">{detail}</p>
</div>
