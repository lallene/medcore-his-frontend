<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import {
		buttonBaseClasses,
		buttonDisabledClasses,
		buttonSizeClasses,
		buttonVariantClasses,
		type ButtonSize,
		type ButtonVariant
	} from '$lib/design/status';

	/**
	 * Lien de navigation présenté comme un bouton (jamais `<button>` dans `<a>`).
	 * Désactivé ou en chargement : sans `href`, non focusable, `aria-disabled`.
	 */
	interface Props {
		href: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		class?: string;
		children?: Snippet;
		'aria-label'?: string;
		'data-testid'?: string;
	}

	let {
		href,
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		class: className = '',
		children,
		'aria-label': ariaLabel,
		'data-testid': testId
	}: Props = $props();

	const inactive = $derived(disabled || loading);
</script>

<!-- L'appelant passe toujours une URL issue de resolve(...). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href={inactive ? undefined : href}
	role={inactive ? 'link' : undefined}
	aria-disabled={inactive || undefined}
	aria-busy={loading || undefined}
	aria-label={ariaLabel}
	data-testid={testId}
	class={cn(
		buttonBaseClasses,
		buttonDisabledClasses,
		buttonVariantClasses[variant],
		buttonSizeClasses[size],
		fullWidth && 'w-full',
		className
	)}
>
	{#if loading}
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
	{/if}
	{@render children?.()}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
