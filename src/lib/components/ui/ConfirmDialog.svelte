<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		loading?: boolean;
		onconfirm?: () => void | Promise<void>;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		description = 'Cette action est définitive.',
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		danger = true,
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();

	async function confirm() {
		await onconfirm?.();
		open = false;
	}

	function cancel() {
		open = false;
		oncancel?.();
	}
</script>

<Modal bind:open {title} {description} size="sm">
	{#snippet footer()}
		<Button variant="ghost" onclick={cancel} disabled={loading}>{cancelLabel}</Button>
		<Button variant={danger ? 'danger' : 'primary'} {loading} onclick={confirm}>
			{confirmLabel}
		</Button>
	{/snippet}
</Modal>
