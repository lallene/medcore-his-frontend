<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { medcoreTypography } from '$lib/design/theme';

	interface Props {
		id?: string;
		label: string;
		helper?: string;
		error?: string;
		required?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		id = '',
		label,
		helper = '',
		error = '',
		required = false,
		class: className = '',
		children
	}: Props = $props();
</script>

<div class={cn('space-y-0', className)}>
	<label for={id || undefined} class={medcoreTypography.label}>
		{label}
		{#if required}<span class="text-danger" aria-hidden="true">*</span>{/if}
	</label>
	{@render children()}
	{#if error}
		<p class="mt-1.5 text-xs font-medium text-danger" role="alert">{error}</p>
	{:else if helper}
		<p class={medcoreTypography.helper}>{helper}</p>
	{/if}
</div>
