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
	const uid = $props.id();
	const titleId = `medcore-modal-title-${uid}`;
	const focusableSelector =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	let dialog = $state<HTMLElement | null>(null);

	// Focus entrant à l'ouverture, restitué à l'élément déclencheur à la fermeture.
	$effect(() => {
		if (!open || !dialog) return;
		const previous = document.activeElement as HTMLElement | null;
		dialog.focus();
		return () => previous?.focus?.();
	});

	function close() {
		open = false;
		onclose?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			close();
			return;
		}
		if (e.key !== 'Tab' || !dialog) return;
		const items = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		if (e.shiftKey && (active === first || active === dialog)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
			e.preventDefault();
			first.focus();
		}
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-slate-950/40 p-4"
		role="presentation"
		onclick={onBackdropClick}
	>
		<div
			bind:this={dialog}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			class={cn(
				'flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl outline-none',
				widths[size]
			)}
		>
			<header
				class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"
			>
				<div>
					<h2 id={titleId} class="text-lg font-semibold text-foreground">{title}</h2>
					{#if description}
						<p class="mt-1 text-sm text-muted-foreground">{description}</p>
					{/if}
				</div>
				<IconButton label="Fermer" onclick={close}>
					<X size={18} />
				</IconButton>
			</header>
			{#if children}
				<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">{@render children()}</div>
			{/if}
			{#if footer}
				<footer
					class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-surface-muted/60 px-5 py-3"
				>
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
