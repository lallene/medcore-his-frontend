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
		default: 'bg-slate-100 text-slate-500',
		medical: 'bg-accent text-primary',
		success: 'bg-emerald-50 text-success',
		info: 'bg-sky-50 text-info',
		purple: 'bg-violet-50 text-violet-600',
		danger: 'bg-red-50 text-danger'
	};
</script>

<div
	class={cn(
		'overflow-visible rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]',
		className
	)}
>
	{#if title}
		<div
			class={size === 'compact'
				? 'border-b border-border px-4 py-3'
				: 'border-b border-border px-6 py-4'}
		>
			<div class="flex items-center gap-3">
				{#if icon}
					{@const Icon = icon}
					<div
						class={`flex h-8 w-8 items-center justify-center rounded-xl ${accentClasses[accent]}`}
					>
						<Icon size={16} />
					</div>
				{/if}
				<div>
					<h2
						class={size === 'compact'
							? 'text-sm font-semibold text-slate-900'
							: 'text-lg font-semibold text-slate-900'}
					>
						{title}
					</h2>
					{#if subtitle}
						<p
							class={size === 'compact'
								? 'mt-0.5 text-xs text-slate-500'
								: 'mt-1 text-sm text-slate-500'}
						>
							{subtitle}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	<div class={padding ? (size === 'compact' ? 'p-4' : 'p-6') : ''}>
		{@render children?.()}
	</div>
</div>
