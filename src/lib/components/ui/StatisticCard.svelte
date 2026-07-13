<script lang="ts">
	type Props = {
		label: string;
		value: number | string;
		children?: import('svelte').Snippet;
	};

	let { label, value, children }: Props = $props();
</script>

<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
	<div class="flex items-center gap-2 text-[#0E4C92]">
		{@render children?.()}

		<p class="text-xs font-black uppercase tracking-wide">
			{label}
		</p>
	</div>

	<p class="mt-3 text-2xl font-black text-slate-900">
		{value}
	</p>
</div>
