<script lang="ts">
	import { cn } from '$lib/utils';

	interface Tab {
		id: string;
		label: string;
	}

	interface Props {
		tabs: Tab[];
		value?: string;
		onchange?: (id: string) => void;
		class?: string;
	}

	let { tabs, value = $bindable(''), onchange, class: className = '' }: Props = $props();

	$effect(() => {
		if (!value && tabs[0]) value = tabs[0].id;
	});
</script>

<div
	class={cn('flex flex-wrap gap-1 border-b border-border', className)}
	role="tablist"
	aria-label="Sections"
>
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={value === tab.id}
			id={`tab-${tab.id}`}
			onclick={() => {
				value = tab.id;
				onchange?.(tab.id);
			}}
			class={cn(
				'-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition',
				value === tab.id
					? 'border-primary text-primary'
					: 'border-transparent text-slate-500 hover:text-slate-800'
			)}
		>
			{tab.label}
		</button>
	{/each}
</div>
