import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
	// Той самий `define`, що у vite.config.ts: інакше тести бачили б
	// `__APP_VERSION__` невизначеним і перевіряли б поведінку, якої в
	// продакшн-збірці не буває.
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'build/', '.svelte-kit/', 'static/']
		}
	},
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib')
		}
	}
});
