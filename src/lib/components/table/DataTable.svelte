<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { TableAction, TableColumn, TableRow } from '$lib/types/table';

	interface Props {
		title: string;
		description?: string;
		columns: TableColumn[];
		rows: TableRow[];
		actions?: TableAction[];
		loading?: boolean;
		emptyMessage?: string;
		createLabel?: string;
		onCreate?: () => void;
	}

	let {
		title,
		description = '',
		columns,
		rows,
		actions = [],
		loading = false,
		emptyMessage = 'Aucune donnée disponible',
		createLabel = '',
		onCreate
	}: Props = $props();

	let search = $state('');

	const filteredRows = $derived(
		rows.filter((row) => {
			if (!search.trim()) return true;

			return Object.values(row).some((value) =>
				String(value ?? '')
					.toLowerCase()
					.includes(search.toLowerCase())
			);
		})
	);

	function getValue(row: TableRow, column: TableColumn): string | number {
		if (column.render) return column.render(row);

		const value = row[column.key];

		if (typeof value === 'string' || typeof value === 'number') return value;

		return '';
	}
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">{title}</h2>

			{#if description}
				<p class="mt-1 text-sm text-slate-500">{description}</p>
			{/if}
		</div>

		{#if createLabel && onCreate}
			<Button onclick={onCreate}>{createLabel}</Button>
		{/if}
	</div>

	<div class="border-b border-slate-100 px-6 py-4">
		<input
			bind:value={search}
			placeholder="Rechercher..."
			class="w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-600"
		/>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-50 text-xs uppercase text-slate-500">
				<tr>
					{#each columns as column (column.key)}
						<th class="px-6 py-3 font-semibold">{column.label}</th>
					{/each}

					{#if actions.length > 0}
						<th class="px-6 py-3 text-right font-semibold">Actions</th>
					{/if}
				</tr>
			</thead>

			<tbody>
				{#if loading}
					<tr>
						<td
							colspan={columns.length + (actions.length > 0 ? 1 : 0)}
							class="px-6 py-10 text-center text-slate-500"
						>
							Chargement...
						</td>
					</tr>
				{:else if filteredRows.length === 0}
					<tr>
						<td
							colspan={columns.length + (actions.length > 0 ? 1 : 0)}
							class="px-6 py-10 text-center text-slate-500"
						>
							{emptyMessage}
						</td>
					</tr>
				{:else}
					{#each filteredRows as row, index (`row-${index}`)}
						<tr class="border-t border-slate-100 hover:bg-slate-50">
							{#each columns as column (column.key)}
								<td class="px-6 py-4 text-slate-700">
									{getValue(row, column)}
								</td>
							{/each}

							{#if actions.length > 0}
								<td class="px-6 py-4 text-right">
									<div class="flex justify-end gap-2">
										{#each actions as action (action.label)}
											<Button
												variant={action.variant ?? 'secondary'}
												onclick={() => action.onClick(row)}
											>
												{action.label}
											</Button>
										{/each}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
