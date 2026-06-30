<script lang="ts">
	interface TimelineActivity {
		time: string;
		description: string;
		type: string;
	}

	interface Props {
		activities?: TimelineActivity[];
	}

	let { activities = [] }: Props = $props();
</script>

<div class="rounded-xl border bg-white p-6 shadow-sm">
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Activité récente</h2>

	<div class="space-y-4">
		{#each activities as activity, index (`${activity.time}-${activity.description}-${index}`)}
			<div class="border-l-2 border-slate-200 pl-4">
				<p class="text-sm font-medium text-slate-800">{activity.description}</p>
				<p class="text-xs text-slate-500">{activity.time} · {activity.type}</p>
			</div>
		{/each}
	</div>
</div>
