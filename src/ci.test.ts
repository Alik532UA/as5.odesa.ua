import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * CI-CD-AND-TOOLS-v8 § 3 — workflow теж код, і його стан перевіряється.
 *
 * Пайплайн живе поза межами всіх інших гейтів: `svelte-check` його не читає,
 * ESLint не читає, тести не читають. Помилка в ньому виявляється або на
 * наступному push (у кращому разі), або взагалі ніколи — коли крок мовчки
 * перестає щось перевіряти, а зелена галочка лишається.
 */
const DIR = '.github/workflows';

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
const all = files.map((f) => readFileSync(`${DIR}/${f}`, 'utf8')).join('\n');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
	scripts?: Record<string, string>;
};
const scripts = pkg.scripts ?? {};

describe('перевірка жива', () => {
	it('workflow знайдено', () => {
		expect(files.length, 'у .github/workflows немає жодного yml — перевіряти нема що').toBeGreaterThan(0);
	});
});

describe('CI', () => {
	it('тести запускаються в CI (§ 1.6)', () => {
		expect(/run:\s*npm (test|run test)/.test(all), 'у workflow немає кроку з тестами').toBe(true);
	});

	it('використовується npm ci, а не npm install', () => {
		expect(/run:\s*npm install\b/.test(all), 'npm install робить білд невідтворюваним').toBe(
			false
		);
	});

	it('Playwright має крок встановлення браузерів (§ 1.3)', () => {
		if (!/playwright test/.test(all)) return;
		expect(/playwright install/.test(all), 'без install крок падає на відсутньому браузері').toBe(
			true
		);
	});

	it('жоден тестовий скрипт не у watch-режимі (§ 1.4)', () => {
		// Не лише `test`: гейтом у workflow буває `test:unit`, `test:report`,
		// `test:ci` — і саме там watch і зустрічається, бо `test` перевіряють, а
		// решту ні. `test:watch` виключений навмисно: він для цього й існує.
		const watchers = Object.entries(scripts)
			.filter(([name]) => /^test(:|$)/.test(name) && name !== 'test:watch')
			.filter(([, cmd]) => /^vitest\s*$/.test(cmd));
		expect(watchers, 'watch-режим підвисне поза CI, де немає CI=true').toEqual([]);
	});

	/**
	 * Пункт поза шаблоном пакета — знайдений у цих проєктах.
	 *
	 * Workflow кличе npm-скрипти за іменем. Перейменування скрипта в
	 * `package.json` не ламає нічого локально й нічого не ламає на збірці: воно
	 * ламає рівно той крок CI, який на нього посилався, і виявляється це вже
	 * після push. Тут це видно до коміту.
	 */
	it('кожен npm-скрипт із workflow існує в package.json', () => {
		const referenced = [...all.matchAll(/run:\s*npm run ([\w:-]+)/g)].map((m) => m[1]);
		const missing = [...new Set(referenced)].filter((name) => !(name in scripts));
		expect(
			missing,
			`workflow кличе скрипт, якого немає — крок упаде на push: ${missing.join(', ')}`
		).toEqual([]);
	});

	/**
	 * Група паралельності з `cancel-in-progress: false` (§ 1.3).
	 *
	 * Без групи пуш пачкою комітів дає стільки прогонів, скільки комітів; із
	 * групою й `true` усі проміжні скасовуються. У сусідніх проєктах саме це
	 * сховало на кілька днів гейт, червоний від народження: прогін, який
	 * УПЕРШЕ виконав би новий крок, скасували раніше, ніж він до нього дійшов
	 * (AI-AGENT-PITFALLS-v8 § 1.4).
	 */
	it('прогони шикуються в чергу, а не скасовують один одного (§ 1.3)', () => {
		expect(/^concurrency:/m.test(all), 'у workflow немає блоку concurrency').toBe(true);
		expect(
			/cancel-in-progress:\s*true/.test(all),
			'cancel-in-progress: true — проміжний прогін може не виконатися жодного разу'
		).toBe(false);
		expect(
			/cancel-in-progress:\s*false/.test(all),
			'значення не задано явно — дефолт залежить від версії runner'
		).toBe(true);
	});

	/**
	 * Аудит рахує лише прод-граф (SECURITY-v8 § 9).
	 *
	 * Окремо ловиться `--production`: із npm 9 прапорець застарілий і мовчки
	 * ігнорується, тобто крок виглядає тим самим, а перевіряє інше — рівно той
	 * клас, проти якого цей файл і написаний.
	 */
	it('npm audit обмежений прод-залежностями (§ 9)', () => {
		const audits = [...all.matchAll(/run:\s*(npm audit[^\n]*)/g)].map((m) => m[1]);
		expect(audits.length, 'кроку з npm audit у workflow немає').toBeGreaterThan(0);
		const wrong = audits.filter((cmd) => !cmd.includes('--omit=dev'));
		expect(wrong, `аудит рахує й devDependencies: ${wrong.join(', ')}`).toEqual([]);
		const deprecated = audits.filter((cmd) => cmd.includes('--production'));
		expect(deprecated, `--production застарів із npm 9 і мовчки ігнорується: ${deprecated.join(', ')}`).toEqual(
			[]
		);
	});

	/**
	 * Збірка не бруднить робоче дерево (§ 1.5) — єдина машинна перевірка
	 * правила «артефакт збірки не комітиться» (VERSIONING-v8 § 1.4).
	 */
	it('після збірки перевіряється чистота дерева (§ 1.5)', () => {
		expect(
			/run:\s*git diff --exit-code/.test(all),
			'немає кроку git diff --exit-code — згенерований артефакт потрапив би в коміт непоміченим'
		).toBe(true);
	});
});
