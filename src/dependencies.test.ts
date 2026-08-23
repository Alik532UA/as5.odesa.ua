// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Інваріанти по залежностях (DEPENDENCIES-v8 § 6).
 *
 * Для статичного сайту кожна прод-залежність — чужий код, який виконується в
 * браузері відвідувача. Дефекти цього класу не мають симптомів: другий
 * lockfile не ламає збірку, плаваюча версія не ламає її сьогодні, а зайва
 * залежність не ламає її ніколи — вона просто тягне за собою ризик і час
 * встановлення.
 */
const ROOT = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	engines?: Record<string, string>;
};

const runtime = Object.keys(pkg.dependencies ?? {});
const all = { ...pkg.dependencies, ...pkg.devDependencies };

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, keep, out);
		else if (keep(entry)) out.push(full.replace(/\\/g, '/'));
	}
	return out;
}

describe('перевірка жива', () => {
	it('package.json прочитано і залежності в ньому є', () => {
		expect(Object.keys(all).length).toBeGreaterThan(5);
		expect(runtime.length).toBeGreaterThan(0);
	});
});

describe('залежності', () => {
	it('один менеджер пакетів (§ 2.1)', () => {
		const locks = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].filter((f) =>
			existsSync(join(ROOT, f))
		);
		expect(locks, `знайдено кілька lockfile — це дві різні збірки: ${locks.join(', ')}`).toHaveLength(1);
	});

	it('інструменти збірки не в dependencies (§ 2.2)', () => {
		const buildOnly = runtime.filter((d) =>
			/^(vite|vitest|typescript|svelte-check|jsdom|husky|globals|prettier|@types\/|@sveltejs\/(kit|adapter|vite-plugin)|eslint|@eslint\/|@playwright)/.test(
				d
			)
		);
		expect(buildOnly, `мають бути у devDependencies: ${buildOnly.join(', ')}`).toEqual([]);
	});

	it('немає плаваючих версій (§ 2.3)', () => {
		const floating = Object.entries(all)
			.filter(([, v]) => v === '*' || v === 'latest' || v === '')
			.map(([k]) => k);
		expect(floating, `невідтворювана збірка: ${floating.join(', ')}`).toEqual([]);
	});

	it('engines.node вказано і збігається з версією в CI (§ 2.3)', () => {
		const declared = pkg.engines?.node;
		expect(declared, 'engines.node не вказано').toBeTruthy();

		const workflow = readFileSync(join(ROOT, '.github/workflows/deploy.yml'), 'utf8');
		const ciNode = workflow.match(/node-version:\s*'?(\d+)/)?.[1];
		expect(ciNode, 'у workflow не знайдено node-version').toBeTruthy();

		const minimum = declared!.match(/(\d+)/)?.[1];
		expect(
			Number(ciNode),
			`CI ставить Node ${ciNode}, а package.json вимагає ${declared} — .npmrc тут engine-strict`
		).toBeGreaterThanOrEqual(Number(minimum));
	});

	/**
	 * DEP-DEPENDABOT, HIGH. Без цього файлу оновлення не відстежує ніхто:
	 * `npm audit` у CI повідомляє, що вразливість УЖЕ є, а Dependabot — що вона
	 * вже виправлена вище за течією.
	 */
	it('оновлення відстежуються автоматично (§ 3.1)', () => {
		const config = ['.github/dependabot.yml', '.github/dependabot.yaml', 'renovate.json'].find((f) =>
			existsSync(join(ROOT, f))
		);
		expect(config, 'немає ні dependabot.yml, ні renovate.json').toBeTruthy();
	});

	/**
	 * PROJECT-STRUCTURE-v8 § 4.3 для залежностей: наявність ≠ використання.
	 *
	 * Перший же прогін цієї перевірки в цьому проєкті знайшов
	 * `@sveltejs/adapter-auto` — пакет, який лежав у `devDependencies`, поки
	 * `svelte.config.js` імпортував `adapter-static`. Дефект без симптому: збірку
	 * він не ламає ніколи, лише тягне ризик і час встановлення, а читається як
	 * «адаптер, можливо, змінюють». Видалено тим самим комітом.
	 */
	it('кожна залежність десь використовується (§ 4.3)', () => {
		const sources = [
			...walk(join(ROOT, 'src'), (n) => /\.(ts|js|svelte)$/.test(n)),
			...walk(join(ROOT, 'scripts'), (n) => /\.(ts|js|mjs)$/.test(n)),
			// `tests/` — теж код проєкту, і саме там живе єдиний імпорт
			// `@axe-core/playwright`. Без цього рядка перевірка оголосила б
			// залежність невживаною одразу після появи гейта axe: помилка не в
			// залежності, а в тому, що перевірка дивилася не всюди.
			...walk(join(ROOT, 'tests'), (n) => /\.(ts|js)$/.test(n)),
			join(ROOT, 'svelte.config.js'),
			join(ROOT, 'vite.config.ts'),
			join(ROOT, 'vitest.config.ts'),
			join(ROOT, 'playwright.config.ts'),
			join(ROOT, 'eslint.config.js'),
			join(ROOT, '.prettierrc')
			// Цей файл із переліку виключено нижче: він називає пакети в
			// коментарях і в списку винятків, тож інакше сам собі був би доказом
			// використання. Знайдено зворотним експериментом — повернення
			// невживаного пакета перевірку не валило, бо його ім'я стояло тут-таки
			// в коментарі.
		]
			.filter((f) => f !== __filename.replace(/\\/g, '/'))
			// `existsSync`, а не безумовне читання: у цьому проєкті немає ні
			// `.prettierrc`, ні самого `prettier`, і `readFileSync` падав з ENOENT.
			// Впала перевірка виглядає як знахідка, хоча насправді не перевірила
			// нічого — той самий клас, що й гейт, який доводиться вимикати.
			.filter((f) => existsSync(f));
		const text = sources.map((f) => readFileSync(f, 'utf8')).join('\n');
		// Саме `pkg.scripts`, а не `pkg`: у повному package.json назва кожної
		// залежності є за визначенням, тож перевірка проходила б завжди. Знайдено
		// зворотним експериментом — перша редакція пропускала все.
		const scripts = JSON.stringify(pkg.scripts ?? {});

		/**
		 * Пакети, які працюють без згадки в коді: їх кличе інструмент, а не
		 * імпорт. Список явний, щоб виняток був видимий у diff, а не діяв як
		 * клас.
		 */
		const IMPLICIT = new Set([
			'husky', // ставиться скриптом `prepare`, живе в .husky/
			'jsdom', // середовище Vitest із vite.config.ts
			'svelte-check', // кличеться зі скрипта `check`
			'prettier-plugin-svelte', // підключається з .prettierrc
			'@sveltejs/vite-plugin-svelte', // тягне sveltekit() усередині
			'typescript', // потрібен svelte-check і typescript-eslint
			// TypeScript підхоплює його сам. Без нього `svelte-check` падає на
			// `node:fs` в інваріантах цієї теки, і виглядає це як помилка коду,
			// а не як відсутній пакет (CODE-QUALITY-v8 § 1.1).
			'@types/node',
			// Vitest підхоплює провайдера покриття сам, коли скрипт
			// `test:coverage` передає `--coverage`; імені пакета в жодному
			// джерелі немає й бути не мусить.
			'@vitest/coverage-v8'
		]);

		const unused = Object.keys(all)
			.filter((name) => !IMPLICIT.has(name))
			.filter((name) => !text.includes(name) && !scripts.includes(name));

		expect(unused, `залежності, яких ніхто не згадує: ${unused.join(', ')}`).toEqual([]);
	});
});
