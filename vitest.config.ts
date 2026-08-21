import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
	// Плагін svelte потрібен НЕ заради компонентних тестів, а заради
	// контролерів: файл `.svelte.ts` містить руни, і без компілятора
	// `$state` у ньому — просто невідома функція. Доти будь-яка спроба
	// імпортувати `states/ui.svelte.ts` у тест падала на цьому, тож
	// класи-контролери — місце, де живе логіка теми, мови й тла, — не були
	// покриті нічим (CODE-QUALITY-v8 § 4.2: юніт-тести контролерів без DOM).
	//
	// Компонентні тести це НЕ вмикає: для монтування `.svelte` потрібен ще
	// `@testing-library/svelte`, якого тут немає. Обраний підхід, коли вони
	// знадобляться, — B (PROJECT-CONTEXT.md).
	plugins: [svelte({ hot: false })],

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
		// Руни й `$app/*` збираються під браузер: без цього умовного експорту
		// частина модулів приходить у серверному варіанті, і тест перевіряв би
		// не той код, що їде відвідувачу.
		conditions: ['browser'],
		alias: {
			$lib: path.resolve(__dirname, './src/lib'),
			'$app/environment': path.resolve(__dirname, './src/test-mocks/app-environment.ts')
		}
	}
});
