<script lang="ts">
	interface Props {
		id?: string;
		rows?: number;
		value?: string;
		placeholder?: string;
	}

	let { id = '', rows = 4, value = $bindable(''), placeholder = '' }: Props = $props();
</script>

<textarea
	{id}
	bind:value
	{rows}
	{placeholder}
	class="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition focus:border-blue-600"
></textarea>
