import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Версія береться з package.json під час збірки, а не дублюється в коді:
// захардкоджений `const VERSION` розсинхронізується з релізом і вводить в
// оману саме тоді, коли за ним прийшли — під час розбору баг-репорту
// (VERSIONING-v8 § 1).
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
	plugins: [sveltekit()],

	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},

	build: {
		// Code splitting: isolate heavy vendor chunks
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('node_modules/svelte/')) return 'svelte';
					if (id.includes('node_modules/svelte-i18n/')) return 'i18n';
					if (id.includes('node_modules/zod/')) return 'validation';
				},
			},
		},

		// Minification
		minify: 'esbuild',

		// CSS code splitting for better caching
		cssCodeSplit: true,

		// Warn when chunks are large
		chunkSizeWarningLimit: 500,
	},
});
