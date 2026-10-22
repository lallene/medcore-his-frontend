<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { CircleHelp, X } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { ensureHelpCatalog, helpEntries } from '$lib/help/store';
	import { hasDetailedHelp } from '$lib/help/catalog';
	import HelpArticle from './HelpArticle.svelte';

	/**
	 * LOT AIDE — contextual help for one element, referenced by its stable help key.
	 * - short help: tooltip on hover AND keyboard focus, and on tap (pinned);
	 * - detailed help: the same button opens an accessible panel (click / Enter / Space);
	 * - Escape closes and returns focus to the button.
	 * Renders nothing when the key is unknown or not visible for the user's permissions.
	 */
	interface Props {
		helpKey: string;
		class?: string;
	}

	let { helpKey, class: className = '' }: Props = $props();

	const uid = `help-${Math.random().toString(36).slice(2, 9)}`;
	let hover = $state(false);
	let focused = $state(false);
	let pinned = $state(false);
	let panelOpen = $state(false);
	let root = $state<HTMLSpanElement>();
	let button = $state<HTMLButtonElement>();
	let panel = $state<HTMLDivElement>();

	const entry = $derived($helpEntries.get(helpKey));
	const detailed = $derived(hasDetailedHelp(entry));
	const tipVisible = $derived(!panelOpen && (hover || focused || pinned));

	onMount(() => {
		void ensureHelpCatalog();
	});

	async function activate(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (detailed) {
			panelOpen = !panelOpen;
			pinned = false;
			if (panelOpen) {
				await tick();
				panel?.focus();
			}
		} else {
			pinned = !pinned;
		}
	}

	function close(restoreFocus: boolean) {
		const wasOpen = panelOpen || pinned || hover || focused;
		panelOpen = false;
		pinned = false;
		hover = false;
		if (restoreFocus && wasOpen) button?.focus();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !(panelOpen || pinned || focused || hover)) return;
		event.stopPropagation();
		close(panelOpen);
		focused = false;
	}

	function onWindowPointerdown(event: PointerEvent) {
		if ((panelOpen || pinned) && root && !root.contains(event.target as Node)) close(false);
	}
</script>

<svelte:window onkeydown={onWindowKeydown} onpointerdown={onWindowPointerdown} />

{#if entry}
	<span class={`relative inline-flex align-middle ${className}`} bind:this={root}>
		<button
			bind:this={button}
			type="button"
			class="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-[#0E4C92] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4C92]/40"
			aria-label={`Aide : ${entry.elementLabel}`}
			aria-describedby={`${uid}-tip`}
			aria-expanded={detailed ? panelOpen : undefined}
			aria-controls={detailed ? `${uid}-panel` : undefined}
			data-testid={`help-hint-${helpKey}`}
			onclick={activate}
			onmouseenter={() => (hover = true)}
			onmouseleave={() => (hover = false)}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		>
			<CircleHelp class="h-4 w-4" aria-hidden="true" />
		</button>
		<span
			id={`${uid}-tip`}
			role="tooltip"
			class={`absolute left-1/2 top-full z-40 mt-1 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium normal-case leading-snug text-white shadow-lg ${tipVisible ? 'block' : 'hidden'}`}
			data-testid={`help-tooltip-${helpKey}`}
		>
			{entry.shortHelp}
			{#if detailed}<span class="mt-1 block text-slate-300">Cliquez pour en savoir plus.</span>{/if}
		</span>
		{#if detailed && panelOpen}
			<div
				bind:this={panel}
				id={`${uid}-panel`}
				role="dialog"
				aria-modal="false"
				aria-labelledby={`${uid}-title`}
				tabindex="-1"
				class="absolute left-0 top-full z-50 mt-2 w-80 max-w-[85vw] rounded-xl border border-slate-200 bg-white p-4 text-left font-normal normal-case shadow-xl focus:outline-none"
				data-testid={`help-panel-${helpKey}`}
			>
				<div class="flex items-start justify-between gap-2">
					<HelpArticle {entry} titleId={`${uid}-title`} />
					<button
						type="button"
						class="rounded-md p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4C92]/40"
						aria-label="Fermer l’aide"
						data-testid={`help-panel-close-${helpKey}`}
						onclick={() => close(true)}
					>
						<X class="h-4 w-4" aria-hidden="true" />
					</button>
				</div>
				<a
					href={resolve(`/help?key=${encodeURIComponent(helpKey)}`)}
					class="mt-3 inline-block text-xs font-semibold text-[#0E4C92] hover:underline"
					>Ouvrir dans le centre d’aide</a
				>
			</div>
		{/if}
	</span>
{/if}
