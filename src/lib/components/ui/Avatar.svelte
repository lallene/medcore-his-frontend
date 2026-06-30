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
	class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white"
>
	{initials}
</div>
