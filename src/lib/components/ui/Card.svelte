<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardAccent = 'default' | 'medical' | 'success' | 'info' | 'purple' | 'danger';

	interface Props {
		title?: string;
		subtitle?: string;
		padding?: boolean;
		size?: 'default' | 'compact';
		accent?: CardAccent;
		icon?: typeof import('lucide-svelte').UserRound;
		children?: Snippet;
	}

	let {
		title = '',
		subtitle = '',
		padding = true,
		size = 'default',
		accent = 'default',
		icon,
		children
	}: Props = $props();

	const accentClasses: Record<CardAccent, string> = {
		default: 'bg-slate-100 text-slate-500',
		medical: 'bg-blue-50 text-[#0E4C92]',
		success: 'bg-emerald-50 text-[#18B893]',
		info: 'bg-sky-50 text-blue-500',
		purple: 'bg-violet-50 text-violet-500',
		danger: 'bg-rose-50 text-rose-500'
	};
</script>

<div
	class="overflow-visible rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
>
	{#if title}
		<div
			class={size === 'compact'
				? 'border-b border-[#EEF3F8] px-4 py-3'
				: 'border-b border-[#EEF3F8] px-6 py-4'}
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
							? 'text-sm font-semibold text-[#172033]'
							: 'text-lg font-semibold text-[#172033]'}
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
