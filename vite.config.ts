import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

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
