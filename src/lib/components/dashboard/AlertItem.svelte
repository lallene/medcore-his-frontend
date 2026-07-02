<script lang="ts">
	interface Props {
		title: string;
		description: string;
	}

	let { title, description }: Props = $props();
</script>

<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
	<p class="font-semibold text-slate-900">{title}</p>
	<p class="mt-1 text-sm text-slate-500">{description}</p>
</div>
