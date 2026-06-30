export type TableRow = Record<string, unknown>;

export interface TableColumn {
	key: string;
	label: string;
	render?: (row: TableRow) => string | number;
}

export interface TableAction {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger';
	onClick: (row: TableRow) => void;
}
