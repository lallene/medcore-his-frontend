<script lang="ts">
	import type { PatientTab, PatientTabItem } from '$lib/components/patients/patient-360/types';

	interface Props {
		tabs: PatientTabItem[];
		activeTab: PatientTab;
		onSelect: (tab: PatientTab) => void;
	}

	let { tabs, activeTab, onSelect }: Props = $props();
</script>

<nav
	class="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
	aria-label="Navigation du dossier patient"
>
	<div class="flex min-w-max items-center gap-1">
		{#each tabs as tab (tab.id)}
			{@const TabIcon = tab.icon}

			<button
				type="button"
				onclick={() => onSelect(tab.id)}
				class={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
					activeTab === tab.id
						? 'bg-[#0E4C92] text-white shadow-sm'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				}`}
				aria-current={activeTab === tab.id ? 'page' : undefined}
			>
				<TabIcon size={16} />

				<span>{tab.label}</span>

				{#if tab.count !== undefined}
					<span
						class={`rounded-full px-2 py-0.5 text-[10px] font-black ${
							activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
						}`}
					>
						{tab.count}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</nav>
