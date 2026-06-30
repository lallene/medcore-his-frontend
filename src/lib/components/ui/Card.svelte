<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		padding?: boolean;
		children?: Snippet;
	}

	let { title = '', subtitle = '', padding = true, children }: Props = $props();
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	{#if title}
		<div class="border-b border-slate-100 px-6 py-4">
			<h2 class="text-lg font-semibold text-slate-900">{title}</h2>

			{#if subtitle}
				<p class="mt-1 text-sm text-slate-500">{subtitle}</p>
			{/if}
		</div>
	{/if}

	<div class={padding ? 'p-6' : ''}>
		{@render children?.()}
	</div>
</div>
