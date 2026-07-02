<script lang="ts">
	import { CreditCard, FileText, HeartPulse, Shield, Users } from 'lucide-svelte';
	import type { ActivityItem } from '$lib/types/dashboard';

	interface Props {
		activities?: ActivityItem[];
	}

	let { activities = [] }: Props = $props();

	function getIcon(type: string) {
		if (type.includes('patient')) return Users;
		if (type.includes('consultation')) return HeartPulse;
		if (type.includes('workflow')) return Shield;
		if (type.includes('voucher')) return FileText;
		if (type.includes('payment')) return CreditCard;
		return Shield;
	}
</script>

<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
	<h2 class="text-lg font-semibold text-slate-900">Activité récente</h2>
	<p class="mt-1 text-sm text-slate-500">Timeline opérationnelle</p>

	<div class="mt-6 space-y-5">
		{#each activities as activity, index (`${activity.time}-${activity.description}-${index}`)}
			{@const Icon = getIcon(activity.type)}

			<div class="relative border-l-2 border-slate-200 pl-8">
				<div
					class="absolute -left-[14px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#E7F3FF] text-[#0E4C92] ring-4 ring-white"
				>
					<Icon size={15} />
				</div>

				<p class="text-sm font-semibold text-slate-800">{activity.description}</p>
				<p class="mt-1 text-xs text-slate-500">{activity.time} · {activity.type}</p>
			</div>
		{/each}
	</div>
</div>
