<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
	}

	let { label, value }: Props = $props();
</script>

<div class="rounded-lg bg-surface-muted p-4">
	<p class="text-small text-muted-foreground">{label}</p>
	<p class="mt-1 font-semibold text-foreground">{value}</p>
</div>
