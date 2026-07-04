<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
	}

	let { label, value }: Props = $props();
</script>

<div class="rounded-2xl bg-slate-50 p-4">
	<p class="text-sm text-slate-500">{label}</p>
	<p class="mt-1 font-semibold text-slate-900">{value}</p>
</div>
