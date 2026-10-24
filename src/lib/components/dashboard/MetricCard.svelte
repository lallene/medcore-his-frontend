<script lang="ts">
	import type { ComponentType } from 'svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';

	/** Alias historique : délègue à la primitive `ui/MetricCard`. */
	interface Props {
		icon: ComponentType;
		title: string;
		value: string | number;
		detail?: string;
		trend?: string;
		progress?: number;
		accent?: string;
	}

	let { icon, title, value, detail = '', trend = '', progress, accent }: Props = $props();
</script>

<MetricCard {icon} {title} {value} {detail} {trend} {progress} {accent} />
