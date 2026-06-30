<script lang="ts">
	import { Building2, FileText, ShieldCheck, Users } from 'lucide-svelte';

	type KpiIcon = 'users' | 'shield' | 'building' | 'file';

	interface Props {
		title: string;
		value: number;
		description?: string;
		icon?: KpiIcon;
	}

	let { title, value, description = '', icon }: Props = $props();
</script>

<div class="rounded-xl border bg-white p-5 shadow-sm">
	<div class="flex items-start justify-between">
		<div>
			<p class="text-sm text-slate-500">{title}</p>
			<p class="mt-2 text-3xl font-bold text-slate-900">{value}</p>

			{#if description}
				<p class="mt-1 text-xs text-slate-400">{description}</p>
			{/if}
		</div>

		{#if icon}
			<div class="rounded-lg bg-slate-100 p-2 text-slate-600">
				{#if icon === 'users'}
					<Users size={20} />
				{:else if icon === 'shield'}
					<ShieldCheck size={20} />
				{:else if icon === 'building'}
					<Building2 size={20} />
				{:else}
					<FileText size={20} />
				{/if}
			</div>
		{/if}
	</div>
</div>
