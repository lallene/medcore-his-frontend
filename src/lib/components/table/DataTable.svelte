<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
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

<div class="rounded-2xl border border-border bg-surface shadow-xs" data-testid="data-table">
	<div class="flex items-center justify-between border-b border-border px-6 py-4">
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

	<div class="border-b border-border px-6 py-4" data-testid="table-toolbar">
		<SearchInput bind:value={search} class="max-w-sm" />
	</div>

	<Table variant="plain">
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th>{column.label}</th>
				{/each}
				{#if actions.length > 0}
					<th class="mc-actions">Actions</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if loading}
				<TableState state="loading" colspan={columns.length + (actions.length > 0 ? 1 : 0)} />
			{:else if filteredRows.length === 0}
				<TableState
					state="empty"
					colspan={columns.length + (actions.length > 0 ? 1 : 0)}
					title={emptyMessage}
				/>
			{:else}
				{#each filteredRows as row, index (`row-${index}`)}
					<tr>
						{#each columns as column (column.key)}
							<td>{getValue(row, column)}</td>
						{/each}
						{#if actions.length > 0}
							<td class="mc-actions">
								<div class="flex justify-end gap-2">
									{#each actions as action (action.label)}
										<Button
											variant={action.variant ?? 'secondary'}
											size="sm"
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
	</Table>
</div>
