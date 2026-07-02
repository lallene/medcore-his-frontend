<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		icon: ComponentType;
		title: string;
		detail: string;
		color: string;
		active?: boolean;
	}

	let { icon: Icon, title, detail, color, active = false }: Props = $props();
</script>

<div
	class={`rounded-2xl p-5 transition-all ${
		active ? 'bg-white shadow-lg ring-2' : 'bg-slate-50 hover:bg-slate-100'
	}`}
	style={active ? `--tw-ring-color:${color}` : ''}
>
	<div class="flex items-center gap-3">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl text-white"
			style={`background:${color}`}
		>
			<Icon size={18} />
		</div>

		<div>
			<p class="font-semibold text-slate-900">
				{title}
			</p>

			<p class="text-xs text-slate-500">
				{detail}
			</p>
		</div>
	</div>
</div>
