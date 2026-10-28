import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import { frontendHeaders, scriptSourceHash } from './security-headers.mjs';

test('frontend CSP matches the static SvelteKit app', () => {
	const headers = frontendHeaders('https://api.example.test/base', '/index.html');
	const csp = headers['Content-Security-Policy'];
	assert.match(csp, /default-src 'self'/);
	const source = '\n{\n__sveltekit = { base: "" };\n}\n';
	const hashed = frontendHeaders('https://api.example.test/base', '/index.html', [source]);
	const hashedCsp = hashed['Content-Security-Policy'];
	const scriptSrc = hashedCsp.split('; ').find((part) => part.startsWith('script-src'));
	assert.equal(scriptSrc, `script-src 'self' ${scriptSourceHash(source)}`);
	assert.equal(scriptSrc.includes('unsafe-inline'), false);
	assert.equal(scriptSrc.includes('unsafe-eval'), false);
	assert.equal(
		scriptSourceHash(source),
		`'sha256-${createHash('sha256').update(source).digest('base64')}'`
	);
	assert.match(csp, /style-src 'self' 'unsafe-inline'/);
	assert.match(csp, /img-src 'self' blob: data: https:\/\/api\.example\.test/);
	assert.match(csp, /connect-src 'self' https:\/\/api\.example\.test/);
	assert.match(csp, /object-src 'none'/);
	assert.match(csp, /base-uri 'self'/);
	assert.match(csp, /frame-ancestors 'none'/);
	assert.match(csp, /form-action 'self'/);
	assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000');
	assert.equal(headers['X-Content-Type-Options'], 'nosniff');
	assert.equal(headers['X-Frame-Options'], 'DENY');
	assert.equal(headers['Cache-Control'], 'no-cache');
	assert.equal(
		frontendHeaders('https://api.example.test', '/_app/immutable/app.js')['Cache-Control'],
		undefined
	);
});

test('SPA navigations are uncached documents and hashed assets stay cacheable', () => {
	for (const path of ['/', '/index.html', '/login', '/dashboard', '/grc/risks']) {
		const headers = frontendHeaders('', path);
		assert.equal(headers['Cache-Control'], 'no-cache', path);
		assert.match(headers['Content-Security-Policy'], /connect-src 'self'/);
		assert.doesNotMatch(headers['Content-Security-Policy'], /onrender/);
		assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000');
		assert.equal(headers['X-Content-Type-Options'], 'nosniff');
		assert.equal(headers['X-Frame-Options'], 'DENY');
		assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
		assert.match(headers['Permissions-Policy'], /camera=\(\)/);
	}
	for (const path of [
		'/_app/immutable/app.js',
		'/_app/immutable/app.css',
		'/favicon.ico',
		'/login?source=r05'
	]) {
		const headers = frontendHeaders('', path);
		const expected = path.startsWith('/login') ? 'no-cache' : undefined;
		assert.equal(headers['Cache-Control'], expected, path);
	}
});

test('frontend CSP does not hardcode an environment host', () => {
	const local = frontendHeaders('http://127.0.0.1:8080', '/');
	assert.match(local['Content-Security-Policy'], /http:\/\/127\.0\.0\.1:8080/);
	assert.doesNotMatch(local['Content-Security-Policy'], /onrender/);
	const absent = frontendHeaders('', '/');
	assert.match(absent['Content-Security-Policy'], /connect-src 'self'/);
	assert.doesNotMatch(absent['Content-Security-Policy'], /https?:\/\//);
});

test('local static responses carry one coherent policy', async () => {
	const server = createServer((req, res) => {
		const path = req.url === '/' ? '/index.html' : req.url;
		if (path === '/missing') {
			res.writeHead(404, frontendHeaders('https://api.example.test', path));
			res.end('not found');
			return;
		}
		res.writeHead(200, frontendHeaders('https://api.example.test', path));
		res.end(path.endsWith('.html') ? '<!doctype html>' : '{}');
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address();
	try {
		for (const path of ['/', '/_app/app.js', '/missing']) {
			const response = await fetch(`http://127.0.0.1:${port}${path}`);
			assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
			assert.equal(response.headers.get('content-security-policy')?.split(',').length, 1);
			assert.equal(
				response.headers.get('strict-transport-security')?.includes('includeSubDomains'),
				false
			);
		}
		const html = await fetch(`http://127.0.0.1:${port}/`);
		assert.equal(html.headers.get('cache-control'), 'no-cache');
		const asset = await fetch(`http://127.0.0.1:${port}/_app/app.js`);
		assert.equal(asset.headers.get('cache-control'), null);
		const missing = await fetch(`http://127.0.0.1:${port}/missing`);
		assert.equal(missing.status, 404);
		assert.match(missing.headers.get('content-security-policy'), /frame-ancestors 'none'/);
	} finally {
		await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
	}
});
