<script lang="ts">
	type Props = {
		label: string;
		value: number | string;
		children?: import('svelte').Snippet;
	};

	let { label, value, children }: Props = $props();
</script>

<div class="rounded-lg border border-border bg-surface-muted p-4">
	<div class="flex items-center gap-2 text-primary">
		{@render children?.()}

		<p class="text-xs font-semibold uppercase tracking-eyebrow">
			{label}
		</p>
	</div>

	<p class="mt-2 text-2xl font-bold tabular-nums text-foreground">
		{value}
	</p>
</div>
