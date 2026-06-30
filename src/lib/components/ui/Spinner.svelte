<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 24 }: Props = $props();
</script>

<div
	class="animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"
	style={`width:${size}px;height:${size}px`}
></div>
