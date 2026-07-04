<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		padding?: boolean;
		size?: 'default' | 'compact';
		children?: Snippet;
	}

	let {
		title = '',
		subtitle = '',
		padding = true,
		size = 'default',
		children
	}: Props = $props();
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	{#if title}
		<div class={size === 'compact' ? 'border-b border-slate-100 px-4 py-3' : 'border-b border-slate-100 px-6 py-4'}>
			<h2 class={size === 'compact' ? 'text-sm font-semibold text-slate-900' : 'text-lg font-semibold text-slate-900'}>
				{title}
			</h2>

			{#if subtitle}
				<p class={size === 'compact' ? 'mt-0.5 text-xs text-slate-500' : 'mt-1 text-sm text-slate-500'}>
					{subtitle}
				</p>
			{/if}
		</div>
	{/if}

	<div class={padding ? (size === 'compact' ? 'p-4' : 'p-6') : ''}>
		{@render children?.()}
	</div>
</div>