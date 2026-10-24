export type PaginationItem = number | 'gap';

/**
 * Pages affichées : toujours la première et la dernière, la page courante et ses
 * voisines ; les trous sont représentés par `'gap'`. Ex. 1 … 4 5 6 … 60.
 */
export function paginationItems(page: number, totalPages: number, siblings = 1): PaginationItem[] {
	const total = Math.max(0, Math.floor(totalPages));
	if (total <= 0) return [];
	const current = Math.min(Math.max(1, Math.floor(page)), total);
	if (total <= 5 + siblings * 2) return Array.from({ length: total }, (_, i) => i + 1);

	const from = Math.max(2, current - siblings);
	const to = Math.min(total - 1, current + siblings);
	const items: PaginationItem[] = [1];
	if (from > 2) items.push('gap');
	for (let n = from; n <= to; n += 1) items.push(n);
	if (to < total - 1) items.push('gap');
	items.push(total);
	return items;
}
