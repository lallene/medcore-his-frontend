<script lang="ts">
	import type { WorkflowStats } from '$lib/types/dashboard';

	interface Props {
		workflow: WorkflowStats;
		total: number;
	}

	let { workflow, total }: Props = $props();

	function percent(value: number): number {
		if (total === 0) return 0;
		return Math.round((value / total) * 100);
	}

	const rows = $derived([
		{ label: 'Draft', value: workflow.draft, className: 'bg-slate-500', track: 'bg-slate-100' },
		{
			label: 'Submitted',
			value: workflow.submitted,
			className: 'bg-blue-600',
			track: 'bg-blue-100'
		},
		{
			label: 'Controlled',
			value: workflow.controlled,
			className: 'bg-amber-600',
			track: 'bg-amber-100'
		},
		{
			label: 'Validated',
			value: workflow.validated,
			className: 'bg-green-600',
			track: 'bg-green-100'
		},
		{ label: 'Rejected', value: workflow.rejected, className: 'bg-red-600', track: 'bg-red-100' },
		{
			label: 'Cancelled',
			value: workflow.cancelled,
			className: 'bg-zinc-600',
			track: 'bg-zinc-100'
		}
	]);
</script>

<div class="rounded-xl border bg-white p-6 shadow-sm">
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Workflow Assurance</h2>

	<div class="space-y-4">
		{#each rows as row (row.label)}
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span>{row.label}</span>
					<span>{row.value}</span>
				</div>

				<div class={`h-2 rounded-full ${row.track}`}>
					<div
						class={`h-2 rounded-full ${row.className}`}
						style={`width: ${percent(row.value)}%`}
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
