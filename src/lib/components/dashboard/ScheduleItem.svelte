<script lang="ts">
	interface Props {
		time: string;
		title: string;
		badge: string;
	}

	let { time, title, badge }: Props = $props();
</script>

<div class="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
	<div class="flex items-center gap-4">
		<div class="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#0E4C92] shadow-sm">
			{time}
		</div>

		<p class="font-semibold text-slate-900">{title}</p>
	</div>

	<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0E4C92]">
		{badge}
	</span>
</div>
