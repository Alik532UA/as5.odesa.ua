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
	 * Відстеження оновлень (DEPENDENCIES-v8 § 3.1, DEP-DEPENDABOT).
	 *
	 * `npm audit` у CI бачить лише те, що вже має CVE, і мовчить про
	 * залежність, яка просто відстала на рік. Групування перевіряється окремо
	 * від самої наявності файлу: без нього приходить по PR на пакет, їх
	 * перестають читати на другому тижні, і гейт із тестами над ними нічого не
	 * вартий.
	 */
	it('оновлення залежностей відстежуються згруповано (§ 3.1)', () => {
		const path = '.github/dependabot.yml';
		expect(existsSync(path), 'немає .github/dependabot.yml — оновлення не відстежує ніхто').toBe(
			true
		);
		const config = readFileSync(path, 'utf8');
		expect(/groups:/.test(config), 'без groups приходить окремий PR на кожен пакет').toBe(true);
		expect(/interval:\s*weekly/.test(config), 'канон вимагає щотижневого ритму').toBe(true);
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

/**
 * Гейт биття посилань живе не у workflow, а в конфізі збірки — але вимикається
 * так само тихо, як крок CI, і з тим самим наслідком.
 */
describe('prerender як гейт', () => {
	const config = readFileSync('svelte.config.js', 'utf8');

	it('handleHttpError не вимкнено рядком на весь сайт', () => {
		/*
		 * `'warn'` чи `'ignore'` — це не налаштування суворості, а вимкнена
		 * перевірка: биття посилання в живому меню після цього не зупиняє нічого,
		 * а виглядає збірка так само зелено. Відомі винятки називаються умовою
		 * всередині функції, і тоді вони видні в diff.
		 */
		expect(
			/handleHttpError:\s*['"](warn|ignore)['"]/.test(config),
			'handleHttpError вимкнено рядком — биття посилань більше не ловить ніхто'
		).toBe(false);
		expect(config, 'handleHttpError не оголошено взагалі').toMatch(/handleHttpError/);
	});
});

/**
 * Впала перевірка не забирає звіт у решти (CI-CD-AND-TOOLS-v8 § 1.8).
 *
 * ## Що саме ловить ця перевірка
 *
 * GitHub за замовчуванням НЕ запускає кроки після впалого. Job із рядка
 * `check → lint → test → audit` при червоному `lint` дає один рядок у звіті —
 * і про тести з аудитом відомо не «зелені» й не «червоні», а НІЧОГО.
 *
 * Це не гіпотеза. У `teatralo4ka` крок `Lint` падав на 26 помилках, і `gh run
 * list` показував `failure` на шести послідовних пушах; три наступні гейти
 * (`Unit tests`, `Audit`, `Validate content`) за ці дві доби не виконалися ані
 * разу. Червоне при цьому стало звичним фоном — тобто гірше за зелену галочку
 * без прогону, бо виглядає як чесне падіння.
 *
 * ## Межа правила
 *
 * Під нього підпадають лише НЕЗАЛЕЖНІ СТАТИЧНІ гейти — ті, яким потрібні самі
 * `node_modules`: типи, lint, юніт-тести, аудит, валідація вмісту, паритет мов.
 * Кроки з побічним ефектом (`build`, `deploy`, `upload-pages-artifact`) і кроки,
 * що залежать від `build/` або від браузерів (`check:build`, `check:bundle`,
 * Playwright, Lighthouse), `!cancelled()` НЕ отримують: запускати їх після
 * впалої збірки означає не звіт, а шум.
 *
 * Гейт визначається за КОМАНДОЮ, а не за назвою кроку: назви в проєктах різні
 * («Lint» / «Linting», «Unit Tests» / «Run unit tests»), команди однакові.
 *
 * Перший гейт у job `if` не потребує: до нього ще ніщо не падало.
 */
const INDEPENDENT_GATE =
	/npm run check(?![:\w])|npm run check:(worker|i18n)\b|npm run lint(?![:\w])|npm (run )?test(?!:(e2e|watch))(:\w+)?(?!\S)|npm audit\b|npm run validate-content\b/;
/** Виглядає гейтом, але залежить від збірки чи браузерів. */
const BUILD_DEPENDENT = /check:build|check:bundle|check:rules|playwright|lhci|npm run build/;

/**
 * Кроки одного workflow у порядку появи, з розбиттям на job.
 *
 * Розбір регуляркою, а не YAML-парсером: `js-yaml` є не в кожному проєкті, а
 * додавати залежність заради однієї перевірки дорожче за розбір рівнів відступу.
 * Ціна — перевірка «розбір живий» нижче, без якої порожній результат читався б
 * як «порушень немає».
 */
function stepsOf(text: string): { job: string; name: string; body: string }[] {
	const steps: { job: string; name: string; body: string }[] = [];
	const lines = text.split('\n');
	let job = '(поза job)';
	for (let i = 0; i < lines.length; i++) {
		const jobLine = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(lines[i]);
		if (jobLine) {
			job = jobLine[1];
			continue;
		}
		const stepLine = /^(\s+)- name: (.*)$/.exec(lines[i]);
		if (!stepLine) continue;
		const [, indent, name] = stepLine;
		let j = i + 1;
		// Коментар на рівні кроку належить НАСТУПНОМУ кроку: інакше рядок
		// «# playwright install без кешу…» приліплюється до `Audit dependencies`
		// і виключає його як залежний від браузерів.
		while (
			j < lines.length &&
			!new RegExp(`^${indent}- `).test(lines[j]) &&
			!new RegExp(`^${indent}#`).test(lines[j])
		) {
			j++;
		}
		steps.push({ job, name: name.trim(), body: lines.slice(i, j).join('\n') });
	}
	return steps;
}

describe('гейти не ховають один одного (CI-CD-AND-TOOLS-v8 § 1.8)', () => {
	// Свій перелік файлів, а не спільний `all`: назва файлу потрібна в тексті
	// помилки, а склеєний вміст її втрачає.
	const gates = files.flatMap((file) =>
		stepsOf(readFileSync(`${DIR}/${file}`, 'utf8'))
			.filter((s) => INDEPENDENT_GATE.test(s.body) && !BUILD_DEPENDENT.test(s.body))
			.map((s) => ({ ...s, file }))
	);

	it('розбір живий: незалежні статичні гейти знайдено', () => {
		expect(
			gates.length,
			'у workflow не знайдено жодного кроку з `npm run check/lint/test/audit` — ' +
				'або розбір зламався, або гейтів справді немає; обидва випадки червоні'
		).toBeGreaterThan(0);
	});

	it('кожен гейт після першого в job несе `if: !cancelled()`', () => {
		const seen = new Set<string>();
		const offenders: string[] = [];
		for (const gate of gates) {
			const key = `${gate.file}::${gate.job}`;
			const isFirst = !seen.has(key);
			seen.add(key);
			if (isFirst) continue;
			if (!/!cancelled\(\)/.test(gate.body)) {
				offenders.push(`${gate.file} → ${gate.job} → «${gate.name}»`);
			}
		}
		expect(
			offenders,
			`перший червоний гейт забере звіт у цих кроків:\n${offenders.join('\n')}`
		).toEqual([]);
	});

	it('`continue-on-error` не стоїть на гейтах', () => {
		// `continue-on-error: true` — не альтернатива `!cancelled()`, а
		// протилежність: job зеленіє при червоному гейті. Це рівно те, що § 1.6
		// забороняє.
		const lax = gates
			.filter((g) => /continue-on-error:\s*true/.test(g.body))
			.map((g) => `${g.file} → «${g.name}»`);
		expect(lax, `гейт, який не валить job:\n${lax.join('\n')}`).toEqual([]);
	});
});
