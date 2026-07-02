<script lang="ts">
	interface Props {
		title: string;
		subtitle: string;
		active?: boolean;
		color: string;
	}

	let { title, subtitle, active = false, color }: Props = $props();
</script>

<div
	class={`rounded-2xl p-4 transition ${active ? 'bg-white shadow-lg ring-2' : 'bg-slate-50'}`}
	style={active ? `--tw-ring-color:${color}` : ''}
>
	<div class="flex items-center gap-3">
		<div class="h-3 w-3 rounded-full" style={`background:${color}`}></div>
		<p class="font-semibold text-slate-900">{title}</p>
	</div>

	<p class="mt-2 text-xs text-slate-500">{subtitle}</p>
</div>
