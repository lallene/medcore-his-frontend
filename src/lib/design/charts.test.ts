import assert from 'node:assert/strict';
import test from 'node:test';
import {
	clampPercent,
	formatChartNumber,
	labelInterval,
	niceAxis,
	sharePercent,
	shortCivilDate
} from './charts.ts';

test('chart percentages stay inside their visual range', () => {
	assert.equal(clampPercent(-4), 0);
	assert.equal(clampPercent(42), 42);
	assert.equal(clampPercent(140), 100);
	assert.equal(sharePercent(25, 100), 25);
	assert.equal(sharePercent(1, 0), 0);
});

test('chart values use French grouping', () => {
	assert.equal(formatChartNumber(1250000).replaceAll('\u202f', ' '), '1 250 000');
});

test('daily axes round up and thin labels', () => {
	assert.deepEqual(niceAxis(0), { max: 4, step: 1 });
	assert.deepEqual(niceAxis(3), { max: 3, step: 1 });
	assert.deepEqual(niceAxis(45), { max: 60, step: 20 });
	assert.deepEqual(niceAxis(8), { max: 8, step: 2 });
	assert.deepEqual(niceAxis(190), { max: 200, step: 50 });
	assert.deepEqual(niceAxis(36), { max: 40, step: 10 });
	assert.deepEqual(niceAxis(9), { max: 10, step: 2.5 });
	assert.equal(shortCivilDate('2026-09-25'), '25/09');
	assert.equal(labelInterval(1, 8), 1);
	assert.equal(labelInterval(30, 8), 5);
	assert.equal(labelInterval(366, 8), 53);
});
