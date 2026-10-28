import { createHash } from 'node:crypto';

const hsts = 'max-age=31536000';

const permissions =
	'camera=(), microphone=(), geolocation=(), clipboard=(), fullscreen=(), payment=()';

export function originOf(apiURL) {
	if (!apiURL || typeof apiURL !== 'string') {
		return '';
	}
	try {
		const url = new URL(apiURL);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			return '';
		}
		return url.origin;
	} catch {
		return '';
	}
}

export function isDocument(pathname) {
	if (!pathname) {
		return true;
	}
	const path = pathname.split(/[?#]/, 1)[0];
	if (path === '/' || path.endsWith('/') || path.endsWith('.html')) {
		return true;
	}
	const base = path.slice(path.lastIndexOf('/') + 1);
	// Extensionless paths are SPA navigations. Fingerprinted assets keep an extension.
	return base.length > 0 && !base.includes('.');
}

export function inlineScriptSources(html) {
	const sources = [];
	const pattern = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
	for (const match of html.matchAll(pattern)) {
		const attrs = match[1] || '';
		if (/\ssrc\s*=/i.test(attrs)) {
			continue;
		}
		sources.push(match[2]);
	}
	return sources;
}

export function scriptSourceHash(source) {
	const digest = createHash('sha256').update(source).digest('base64');
	return `'sha256-${digest}'`;
}

export function frontendHeaders(apiURL, pathname, scriptSources = []) {
	const connect = ["'self'"];
	const images = ["'self'", 'blob:', 'data:'];
	const origin = originOf(apiURL);
	if (origin) {
		connect.push(origin);
		images.push(origin);
	}
	const scriptSrc = ["'self'", ...scriptSources.map(scriptSourceHash)];
	const csp = [
		"default-src 'self'",
		`script-src ${scriptSrc.join(' ')}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src ${images.join(' ')}`,
		"font-src 'self'",
		`connect-src ${connect.join(' ')}`,
		"object-src 'none'",
		"base-uri 'self'",
		"frame-ancestors 'none'",
		"form-action 'self'"
	].join('; ');

	const headers = {
		'Strict-Transport-Security': hsts,
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': permissions,
		'Content-Security-Policy': csp
	};
	if (isDocument(pathname)) {
		headers['Cache-Control'] = 'no-cache';
	}
	return headers;
}
