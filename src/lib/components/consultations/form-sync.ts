export function formSnapshot(value: unknown): string {
	return JSON.stringify(value);
}

export function isFormDirty(value: unknown, baseline: string): boolean {
	return baseline !== '' && formSnapshot(value) !== baseline;
}

export function uniquePositiveIDs(values: number[]): number[] {
	return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

export function shouldHydrateForm(options: {
	initialized: boolean;
	sameEntity: boolean;
	dirty: boolean;
	force?: boolean;
}): boolean {
	return Boolean(options.force || !options.initialized || !options.sameEntity || !options.dirty);
}
