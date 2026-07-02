<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		color?: string;
	}

	let { label, value, color = 'text-slate-900' }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<span class="text-sm text-slate-500">{label}</span>
	<span class={`font-semibold ${color}`}>{value}</span>
</div>
