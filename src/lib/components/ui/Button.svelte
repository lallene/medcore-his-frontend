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

	interface Props {
		type?: 'button' | 'submit' | 'reset';
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		'aria-label'?: string;
		'data-testid'?: string;
	}

	let {
		type = 'button',
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		class: className = '',
		onclick,
		children,
		'aria-label': ariaLabel,
		'data-testid': testId
	}: Props = $props();
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	aria-label={ariaLabel}
	aria-busy={loading || undefined}
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
</button>
