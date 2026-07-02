<script lang="ts">
	interface Props {
		title: string;
		description: string;
		level?: 'success' | 'warning' | 'danger';
	}

	let { title, description, level = 'warning' }: Props = $props();

	const styles = {
		success: 'border-green-100 bg-green-50 text-green-700',
		warning: 'border-amber-100 bg-amber-50 text-amber-700',
		danger: 'border-red-100 bg-red-50 text-red-700'
	};
</script>

<div class={`rounded-2xl border p-4 ${styles[level]}`}>
	<p class="font-semibold">{title}</p>
	<p class="mt-1 text-sm opacity-80">{description}</p>
</div>
