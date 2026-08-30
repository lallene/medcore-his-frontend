<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import IconButton from './IconButton.svelte';

	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description = '',
		size = 'md',
		onclose,
		children,
		footer
	}: Props = $props();

	const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

	function close() {
		open = false;
		onclose?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
		role="presentation"
		onclick={onBackdropClick}
		onkeydown={onKeydown}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="medcore-modal-title"
			tabindex="-1"
			class={cn(
				'flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-modal)]',
				widths[size]
			)}
		>
			<header
				class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-4"
			>
				<div>
					<h2 id="medcore-modal-title" class="text-lg font-semibold text-slate-900">{title}</h2>
					{#if description}
						<p class="mt-1 text-sm text-slate-500">{description}</p>
					{/if}
				</div>
				<IconButton label="Fermer" onclick={close}>
					<X size={18} />
				</IconButton>
			</header>
			{#if children}
				<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">{@render children()}</div>
			{/if}
			{#if footer}
				<footer class="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
