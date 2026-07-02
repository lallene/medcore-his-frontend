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

<div class="relative border-l-2 border-slate-200 pl-8">
	<div
		class="absolute -left-[14px] top-0 flex h-7 w-7 items-center justify-center rounded-full text-white ring-4 ring-white"
		style={`background:${color}`}
	>
		<Icon size={15} />
	</div>

	<p class="text-sm font-semibold text-slate-800">{title}</p>
	<p class="mt-1 text-xs text-slate-500">{detail}</p>
</div>
