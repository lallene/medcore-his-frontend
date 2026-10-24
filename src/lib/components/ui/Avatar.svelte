<script lang="ts">
	interface Props {
		name: string;
	}

	let { name }: Props = $props();

	const initials = $derived(
		name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.substring(0, 2)
			.toUpperCase()
	);
</script>

<div
	class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
>
	{initials}
</div>
