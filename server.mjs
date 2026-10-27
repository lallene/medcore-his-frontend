import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import sirv from 'sirv';
import { frontendHeaders, inlineScriptSources } from './security-headers.mjs';

const port = Number(process.env.PORT || 10000);
const apiURL = process.env.PUBLIC_API_URL || '';
const scriptSources = inlineScriptSources(readFileSync('build/index.html', 'utf8'));
if (scriptSources.length === 0) {
	process.stderr.write('frontend CSP: inline bootstrap script missing\n');
	process.exit(1);
}
const assets = sirv('build', {
	single: true,
	setHeaders(res, pathname) {
		const headers = frontendHeaders(apiURL, pathname, scriptSources);
		for (const [key, value] of Object.entries(headers)) {
			res.setHeader(key, value);
		}
	}
});

createServer((req, res) => {
	assets(req, res);
}).listen(port, '0.0.0.0');
