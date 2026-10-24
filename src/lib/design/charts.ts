import { medcoreColors } from './theme.ts';

export type ChartTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const chartColors: Record<ChartTone, string> = {
	primary: medcoreColors.primary,
	success: medcoreColors.semantic.successStrong,
	warning: medcoreColors.semantic.warningStrong,
	danger: medcoreColors.semantic.dangerStrong,
	info: medcoreColors.semantic.infoStrong,
	neutral: medcoreColors.neutral.textMuted
};

export const chartMotion = {
	durationMs: 520,
	easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
} as const;

export function clampPercent(value: number): number {
	return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function sharePercent(value: number, total: number): number {
	if (total <= 0) return 0;
	return clampPercent((Math.max(0, value) / total) * 100);
}

export function formatChartNumber(value: number): string {
	return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

/**
 * Axe vertical « arrondi » : pas 1/2/2,5/5 × 10ⁿ visant `ticks` intervalles (au moins
 * `minStep`), maximum = premier multiple du pas qui couvre la valeur.
 */
export function niceAxis(maxValue: number, ticks = 4, minStep = 1): { max: number; step: number } {
	const safe = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
	if (safe === 0) return { max: ticks * minStep, step: minStep };
	const raw = safe / ticks;
	const magnitude = 10 ** Math.floor(Math.log10(raw));
	const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
	const step = Math.max(minStep, nice);
	return { max: Math.ceil(safe / step) * step, step };
}

/** « 2026-09-25 » → « 25/09 », sans conversion de fuseau. */
export function shortCivilDate(isoDate: string): string {
	const [, month, day] = isoDate.split('-');
	return `${day}/${month}`;
}

/** Intervalle entre deux libellés d'abscisse pour en afficher au plus `maxLabels`. */
export function labelInterval(count: number, maxLabels: number): number {
	if (count <= maxLabels || maxLabels <= 1) return 1;
	return Math.ceil((count - 1) / (maxLabels - 1));
}
