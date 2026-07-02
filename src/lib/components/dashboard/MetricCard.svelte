<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		value: string | number;
		detail?: string;
		trend?: string;
		progress?: number;
		accent?: string;
	}

	let {
		icon: Icon,
		title,
		value,
		detail = '',
		trend = '+0%',
		progress = 70,
		accent = '#0E4C92'
	}: Props = $props();
</script>

<div
	class="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
>
	<div class="flex items-center justify-between">
		<div
			class="flex h-11 w-11 items-center justify-center rounded-2xl text-white transition group-hover:scale-110"
			style={`background:${accent}`}
		>
			<Icon size={22} />
		</div>

		<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
			↑ {trend}
		</span>
	</div>

	<p class="mt-5 text-sm text-slate-500">{title}</p>
	<p class="mt-1 text-3xl font-bold text-slate-950">{value}</p>

	<div class="mt-4 h-2 rounded-full bg-slate-100">
		<div
			class="h-2 rounded-full transition-all"
			style={`width:${progress}%;background:${accent}`}
		></div>
	</div>

	{#if detail}
		<p class="mt-2 text-xs text-slate-400">{detail}</p>
	{/if}
</div>
