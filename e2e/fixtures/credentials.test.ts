import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { QA_PASSWORD_MISSING, requiredQaPassword } from './credentials.ts';

test('QA password is required: absent or blank fails explicitly', () => {
	for (const env of [{}, { QA_ADMIN_PASSWORD: '' }, { QA_ADMIN_PASSWORD: '   ' }]) {
		assert.throws(() => requiredQaPassword(env), { message: QA_PASSWORD_MISSING });
	}
});

test('QA password is returned as provided, and never echoed in the error message', () => {
	const secret = 'Zq7-unit-test-only-value';
	assert.equal(requiredQaPassword({ QA_ADMIN_PASSWORD: secret }), secret);
	assert.ok(!QA_PASSWORD_MISSING.includes(secret));
});

test('no E2E file falls back to a hard-coded password', () => {
	const root = new URL('..', import.meta.url).pathname;
	const files: string[] = [];
	const walk = (dir: string) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (/\.ts$/.test(name) && !name.endsWith('.test.ts')) files.push(path);
		}
	};
	walk(root);
	assert.ok(files.length > 20);
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		assert.doesNotMatch(source, /QA_ADMIN_PASSWORD\s*\?\?/, `${file} defaults QA_ADMIN_PASSWORD`);
		assert.doesNotMatch(source, /QA_ADMIN_PASSWORD\s*\|\|/, `${file} defaults QA_ADMIN_PASSWORD`);
	}
});
