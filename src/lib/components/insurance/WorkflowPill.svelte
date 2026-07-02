<script lang="ts">
	interface Props {
		label: string;
		count: number;
		color: string;
	}

	let { label, count, color }: Props = $props();
</script>

<div class="rounded-2xl bg-slate-50 p-4">
	<div class="flex items-center justify-between">
		<span class={`h-3 w-3 rounded-full ${color}`}></span>
		<span class="text-2xl font-bold text-slate-900">{count}</span>
	</div>

	<p class="mt-3 text-sm font-semibold text-slate-700">{label}</p>
</div>
