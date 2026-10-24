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
				'-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
				value === tab.id
					? 'border-primary font-semibold text-primary'
					: 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground'
			)}
		>
			{tab.label}
		</button>
	{/each}
</div>
