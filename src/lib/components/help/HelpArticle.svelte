<script lang="ts">
	import type { HelpEntry } from '$lib/types/help';
	import { helpModuleLabel } from '$lib/help/catalog';

	interface Props {
		entry: HelpEntry;
		titleId?: string;
		headingLevel?: 2 | 3;
	}

	let { entry, titleId, headingLevel = 3 }: Props = $props();
</script>

<div class="space-y-2 text-sm text-slate-700" data-testid={`help-article-${entry.helpKey}`}>
	<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
		{helpModuleLabel(entry.module)}
	</p>
	<svelte:element this={`h${headingLevel}`} id={titleId} class="text-base font-bold text-slate-900"
		>{entry.elementLabel}</svelte:element
	>
	<p>{entry.shortHelp}</p>
	{#if entry.detailedHelp}
		<p class="whitespace-pre-line text-slate-600">{entry.detailedHelp}</p>
	{/if}
	{#if entry.actionHelp}
		<p class="rounded-lg bg-slate-50 p-2 text-slate-700">
			<span class="font-semibold">Comment faire :</span>
			{entry.actionHelp}
		</p>
	{/if}
</div>
