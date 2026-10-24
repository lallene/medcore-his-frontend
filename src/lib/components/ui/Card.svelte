<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type CardAccent = 'default' | 'medical' | 'success' | 'info' | 'purple' | 'danger';

	interface Props {
		title?: string;
		subtitle?: string;
		padding?: boolean;
		size?: 'default' | 'compact';
		accent?: CardAccent;
		icon?: typeof import('lucide-svelte').UserRound;
		class?: string;
		children?: Snippet;
	}

	let {
		title = '',
		subtitle = '',
		padding = true,
		size = 'default',
		accent = 'default',
		icon,
		class: className = '',
		children
	}: Props = $props();

	const accentClasses: Record<CardAccent, string> = {
		default: 'bg-surface-muted text-muted-foreground',
		medical: 'bg-primary-soft text-primary',
		success: 'bg-success-soft text-success-strong',
		info: 'bg-info-soft text-info-strong',
		purple: 'bg-violet-50 text-violet-700',
		danger: 'bg-danger-soft text-danger-strong'
	};
</script>

<div class={cn('overflow-visible rounded-xl border border-border bg-surface shadow-xs', className)}>
	{#if title}
		<div
			class={size === 'compact'
				? 'border-b border-border px-4 py-3'
				: 'border-b border-border px-5 py-4'}
		>
			<div class="flex items-center gap-3">
				{#if icon}
					{@const Icon = icon}
					<div
						class={`flex size-8 shrink-0 items-center justify-center rounded-lg ${accentClasses[accent]}`}
					>
						<Icon size={16} />
					</div>
				{/if}
				<div>
					<h2
						class={size === 'compact'
							? 'text-sm font-semibold text-foreground'
							: 'text-base font-semibold text-foreground'}
					>
						{title}
					</h2>
					{#if subtitle}
						<p
							class={size === 'compact'
								? 'mt-0.5 text-xs text-muted-foreground'
								: 'mt-0.5 text-small text-muted-foreground'}
						>
							{subtitle}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	<div class={padding ? (size === 'compact' ? 'p-4' : 'p-5') : ''}>
		{@render children?.()}
	</div>
</div>
