<script lang="ts">
	interface Props {
		id?: string;
		type?: string;
		placeholder?: string;
		value?: string;
		disabled?: boolean;
	}

	let {
		id = '',
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		disabled = false
	}: Props = $props();
</script>

<input
	{id}
	{type}
	bind:value
	{placeholder}
	{disabled}
	class="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition focus:border-blue-600"
/>
