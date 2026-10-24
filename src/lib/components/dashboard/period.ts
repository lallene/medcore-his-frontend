/**
 * Période du tableau de bord : deux dates civiles locales « Du » et « Au »
 * (date de fin incluse), envoyées au backend comme intervalle demi-ouvert
 * [from, to) au format YYYY-MM-DD, sans conversion UTC.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatCivilDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Date civile du jour dans le fuseau du navigateur. */
export function todayCivilDate(now: Date = new Date()): string {
	return formatCivilDate(now);
}

/** Ajoute n jours civils (n peut être négatif) à une date YYYY-MM-DD. */
export function addCivilDays(isoDate: string, days: number): string {
	const match = ISO_DATE.exec(isoDate);
	if (!match) throw new Error(`Date invalide : ${isoDate}`);
	const [, year, month, day] = match;
	return formatCivilDate(new Date(Number(year), Number(month) - 1, Number(day) + days));
}

export function isValidCivilDate(isoDate: string): boolean {
	const match = ISO_DATE.exec(isoDate);
	if (!match) return false;
	return addCivilDays(isoDate, 0) === isoDate;
}

export type PeriodValidation = { ok: true } | { ok: false; message: string };

export function validatePeriod(fromInclusive: string, toInclusive: string): PeriodValidation {
	if (!isValidCivilDate(fromInclusive) || !isValidCivilDate(toInclusive)) {
		return { ok: false, message: 'Renseignez une date de début et une date de fin valides.' };
	}
	if (fromInclusive > toInclusive) {
		return { ok: false, message: 'La date de début doit précéder ou égaler la date de fin.' };
	}
	return { ok: true };
}

/** « Du » et « Au » inclus → paramètres API [from, to). */
export function toApiRange(
	fromInclusive: string,
	toInclusive: string
): { from: string; to: string } {
	return { from: fromInclusive, to: addCivilDays(toInclusive, 1) };
}

/** Libellé lisible : « Le 24/10/2026 » ou « Du 25/09/2026 au 24/10/2026 ». */
export function periodLabel(fromInclusive: string, toInclusive: string): string {
	const fr = (iso: string) => iso.split('-').reverse().join('/');
	return fromInclusive === toInclusive
		? `Le ${fr(fromInclusive)}`
		: `Du ${fr(fromInclusive)} au ${fr(toInclusive)}`;
}
