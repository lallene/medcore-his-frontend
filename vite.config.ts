import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
	server: {
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true,
				secure: false,
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq, req) => {
						const method = req.method ?? 'GET';
						const url = req.url ?? '';

						const allowed =
							method === 'GET' || (method === 'POST' && url.startsWith('/api/auth/login'));

						if (!allowed) {
							proxyReq.destroy(new Error(`Blocked local preview mutation: ${method} ${url}`));
						}
					});
				}
			}
		}
	},

	resolve: {
		alias: {
			'@': path.resolve('./src')
		}
	},

	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html'
			})
		})
	]
});
