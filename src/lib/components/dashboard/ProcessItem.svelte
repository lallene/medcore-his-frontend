<script lang="ts">
	import type { ComponentType } from 'svelte';

	type ProcessTone = 'primary' | 'success' | 'info' | 'warning' | 'danger';

	interface Props {
		icon: ComponentType;
		title: string;
		value: string;
		tone?: ProcessTone;
	}

	let { icon: Icon, title, value, tone = 'primary' }: Props = $props();

	const toneClasses = $derived(
		tone === 'success'
			? {
					surface: 'border-success-border bg-success-soft',
					icon: 'bg-white text-success-strong',
					title: 'text-success-strong'
				}
			: tone === 'info'
				? {
						surface: 'border-info-border bg-info-soft',
						icon: 'bg-white text-info-strong',
						title: 'text-info-strong'
					}
				: tone === 'warning'
					? {
							surface: 'border-warning-border bg-warning-soft',
							icon: 'bg-white text-warning-strong',
							title: 'text-warning-strong'
						}
					: tone === 'danger'
						? {
								surface: 'border-danger-border bg-danger-soft',
								icon: 'bg-white text-danger-strong',
								title: 'text-danger-strong'
							}
						: {
								surface: 'border-primary-border bg-primary-soft',
								icon: 'bg-white text-primary',
								title: 'text-primary'
							}
	);
</script>

<div class={`rounded-2xl border p-4 transition-shadow hover:shadow-sm ${toneClasses.surface}`}>
	<div
		class={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${toneClasses.icon}`}
	>
		<Icon size={20} aria-hidden="true" />
	</div>

	<p class={`mt-4 font-semibold ${toneClasses.title}`}>{title}</p>
	<p class="mt-1 text-sm text-muted-foreground">{value}</p>
</div>
