<script lang="ts">
	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		id?: string;
		options: Option[];
		value?: string;
	}

	let { id = '', options, value = $bindable('') }: Props = $props();
</script>

<select
	{id}
	bind:value
	class="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition focus:border-blue-600"
>
	{#each options as option (option.value)}
		<option value={option.value}>
			{option.label}
		</option>
	{/each}
</select>
