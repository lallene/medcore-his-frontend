<script lang="ts">
	import { onMount } from 'svelte';
	import { listOrganizationServices } from '$lib/api/organization';
	import type { OrganizationService } from '$lib/types/organization';
	import { eligibleServices } from './state';
	let {
		value = $bindable<number | null>(null),
		capability = '',
		disabled = false,
		includeInactive = false,
		placeholder = 'Sélectionner un service',
		onchange
	}: {
		value?: number | null;
		capability?: 'consultation' | 'hospitalization' | 'beds' | '';
		disabled?: boolean;
		includeInactive?: boolean;
		placeholder?: string;
		onchange?: () => void;
	} = $props();
	let services = $state<OrganizationService[]>([]);
	let error = $state('');
	const eligible = $derived(eligibleServices(services, capability, includeInactive));
	onMount(async () => {
		try {
			services = await listOrganizationServices(!includeInactive);
		} catch {
			error = 'Services indisponibles';
		}
	});
</script>

<select
	bind:value
	{disabled}
	{onchange}
	class="w-full rounded-xl border bg-white p-3 text-sm"
	aria-label="Service"
>
	<option value={null}>{error || placeholder}</option>
	{#each eligible as service (service.id)}<option value={service.id} disabled={!service.active}
			>{service.name} — {service.code}{service.active ? '' : ' (inactif)'}</option
		>{/each}
</select>
