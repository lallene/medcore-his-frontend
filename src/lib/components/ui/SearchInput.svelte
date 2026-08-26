<script lang="ts">
	import { Search } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import Input from './Input.svelte';

	interface Props {
		id?: string;
		value?: string;
		placeholder?: string;
		label?: string;
		class?: string;
	}

	let {
		id = 'medcore-search',
		value = $bindable(''),
		placeholder = 'Rechercher…',
		label = 'Recherche',
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('relative', className)}>
	<label class="sr-only" for={id}>{label}</label>
	<Search
		class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
		aria-hidden="true"
	/>
	<Input {id} bind:value {placeholder} class="pl-10" />
</div>
