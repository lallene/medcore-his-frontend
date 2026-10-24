import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addCivilDays,
	isValidCivilDate,
	periodLabel,
	toApiRange,
	todayCivilDate,
	validatePeriod
} from './period.ts';

test('end date is inclusive: [from, to+1day)', () => {
	assert.deepEqual(toApiRange('2026-10-24', '2026-10-24'), {
		from: '2026-10-24',
		to: '2026-10-25'
	});
	assert.deepEqual(toApiRange('2026-09-25', '2026-10-24'), {
		from: '2026-09-25',
		to: '2026-10-25'
	});
});

test('civil day arithmetic crosses month, year, leap day and DST changes', () => {
	assert.equal(addCivilDays('2026-10-31', 1), '2026-11-01');
	assert.equal(addCivilDays('2026-12-31', 1), '2027-01-01');
	assert.equal(addCivilDays('2028-02-28', 1), '2028-02-29');
	assert.equal(addCivilDays('2026-03-29', 1), '2026-03-30');
	assert.equal(addCivilDays('2026-10-25', 1), '2026-10-26');
	assert.equal(addCivilDays('2026-10-24', -29), '2026-09-25');
});

test('validation rejects invalid or inverted periods', () => {
	assert.deepEqual(validatePeriod('2026-10-01', '2026-10-24'), { ok: true });
	assert.deepEqual(validatePeriod('2026-10-24', '2026-10-24'), { ok: true });
	assert.equal(validatePeriod('2026-10-25', '2026-10-24').ok, false);
	assert.equal(validatePeriod('', '2026-10-24').ok, false);
	assert.equal(isValidCivilDate('2026-02-30'), false);
	assert.equal(isValidCivilDate('24/10/2026'), false);
});

test('today uses the local civil date and labels are readable', () => {
	assert.equal(todayCivilDate(new Date(2026, 9, 24, 23, 59)), '2026-10-24');
	assert.equal(periodLabel('2026-10-24', '2026-10-24'), 'Le 24/10/2026');
	assert.equal(periodLabel('2026-09-25', '2026-10-24'), 'Du 25/09/2026 au 24/10/2026');
});
