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
	/npm run check(?![:\w])|npm run check:(worker|i18n|test-discovery)\b|npm run lint(?![:\w])|npm (run )?test(?!:(e2e|watch))(:\w+)?(?!\S)|npm audit\b|npm run validate-content\b/;
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

/**
 * `--legacy-peer-deps` у CI (DEPENDENCIES-v8 § 2.4, `DEP-TOOL-ENGINE-CONFLICT`).
 *
 * Прапорець знімає перевірку peer-залежностей для УСЬОГО дерева — тобто гасить
 * сигнал там, де він потрібен, заради одного пакета, який його породив. І
 * головне: він переживає причину. У `MindStep` його додали 2026-03-03 комітом
 * «resolve Vite 7 dependency conflict» і не знімали пів року; на 2026-08-23
 * `npm ci` без прапорця проходить чисто, тобто екосистема наздогнала Vite 7
 * давно, а перевірка peer-залежностей лишалася вимкненою.
 *
 * Правильний спосіб для інструмента, чиї транзитивні `engines` конфліктують із
 * проєктом, — обгортка над `npx` із послабленням РІВНО для дочірнього процесу
 * (`scripts/firebase-cli.mjs`), а не прапорець на весь install.
 *
 * Перевірка тримає нуль: у шести проєктах із семи прапорця не було ніколи, і
 * ратчет на нулі коштує нічого — зате перша ж спроба «швидко полагодити install»
 * стає видимою в прогоні, а не через пів року.
 */
describe('install у CI не глушить перевірку peer-залежностей', () => {
	it('жоден workflow не кличе npm із --legacy-peer-deps', () => {
		const offenders = files.filter((file) =>
			/--legacy-peer-deps/.test(readFileSync(`${DIR}/${file}`, 'utf8'))
		);
		expect(
			offenders,
			'прапорець знімає перевірку peer-залежностей для всього дерева; ' +
				'для інструмента з конфліктом engines є обгортка над npx (DEPENDENCIES-v8 § 2.4):\n' +
				offenders.join('\n')
		).toEqual([]);
	});

	it('перевірка жива: workflow прочитано', () => {
		expect(files.length, 'у .github/workflows немає жодного yml').toBeGreaterThan(0);
	});
});

/**
 * Рантайм дії береться з `runs.using`, а не з номера релізу
 * (CI-CD-AND-TOOLS-v9 § 1.9, `CI-ACTION-RUNTIME`).
 *
 * ## Чому номер мажора нічого не каже
 *
 * Дія друкує в прогоні попередження «Node.js 20 actions are deprecated» — і
 * підняття мажора його не знімає, бо мажор дії та її рантайм не повʼязані
 * нічим. Канон називає конкретні приклади: `upload-artifact@v5` і
 * `configure-pages@v5` вийшли ПІСЛЯ появи node24 і лишилися на node20.
 * Прочитати це можна рівно в одному місці — `action.yml` того самого мажора.
 *
 * ## Що перевіряє інваріант, а що — людина
 *
 * Мережі в тесті немає й бути не мусить: гейт, який ходить у GitHub, червоніє
 * від чужої недоступності. Тому інваріант стежить за іншим — щоб у workflow не
 * зʼявилося дії, чий рантайм НІХТО НЕ ДИВИВСЯ. Кожен мажор мусить мати запис у
 * таблиці нижче; новий або піднятий — це червоний прогін і рівно одна команда,
 * якою його закрити:
 *
 *     curl -s https://raw.githubusercontent.com/actions/<дія>/<мажор>/action.yml | grep using:
 *
 * Так «перевірено» перестає означати «виглядало свіжим».
 *
 * ## Заміряно 2026-09-10 тією самою командою
 *
 * Усі сім дій пайплайна — на `node24`. `upload-pages-artifact@v5` —
 * `composite`: власного рантайму він не має взагалі, тож попередження про
 * node20 від нього прийти не може; його внутрішні кроки живуть під власними
 * мажорами й оновлюються разом із дією.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1): підняти в `deploy.yml`
 * `actions/checkout@v7` до `@v8` — перевірка червоніє з назвою дії й командою,
 * якою дізнатися її рантайм. Прогнано.
 */
describe('рантайм дій CI перевірений, а не вгаданий (§ 1.9)', () => {
	/** `дія@мажор` → `runs.using` на дату звірки. Тільки те, що справді читали. */
	const VERIFIED_RUNTIME: Record<string, string> = {
		'actions/checkout@v7': 'node24',
		'actions/setup-node@v7': 'node24',
		'actions/cache@v6': 'node24',
		'actions/upload-artifact@v7': 'node24',
		'actions/configure-pages@v6': 'node24',
		'actions/upload-pages-artifact@v5': 'composite',
		'actions/deploy-pages@v5': 'node24'
	};

	/** Рантайми, які ще не застаріли. `composite` не має власного. */
	const CURRENT = new Set(['node24', 'composite']);

	const used = [...new Set([...all.matchAll(/uses:\s*([\w.-]+\/[\w.-]+@[\w.-]+)/g)].map((m) => m[1]))];

	it('перевірка жива: дії у workflow знайдено', () => {
		expect(used.length, 'жодного `uses:` — розбір workflow зламався').toBeGreaterThan(3);
	});

	it('кожна дія має звірений рантайм', () => {
		const unchecked = used.filter((action) => !(action in VERIFIED_RUNTIME));
		expect(
			unchecked,
			'дію додано або піднято, а її `runs.using` ніхто не дивився. Номер мажора ' +
				'про рантайм не каже нічого:\n' +
				unchecked
					.map(
						(a) =>
							`  ${a} — curl -s https://raw.githubusercontent.com/${a.split('@')[0]}/${a.split('@')[1]}/action.yml | grep using:`
					)
					.join('\n')
		).toEqual([]);
	});

	it('жодна дія не стоїть на застарілому рантаймі', () => {
		const stale = used
			.filter((action) => action in VERIFIED_RUNTIME)
			.filter((action) => !CURRENT.has(VERIFIED_RUNTIME[action]))
			.map((action) => `${action} — ${VERIFIED_RUNTIME[action]}`);
		expect(
			stale,
			`рантайм дії вийшов із підтримки, і прогін друкуватиме попередження:\n${stale.join('\n')}`
		).toEqual([]);
	});

	it('у таблиці немає записів про дії, яких у workflow вже немає', () => {
		const stale = Object.keys(VERIFIED_RUNTIME).filter((action) => !used.includes(action));
		expect(
			stale,
			`запис звіряє рантайм дії, якої в пайплайні немає — прибрати:\n${stale.join('\n')}`
		).toEqual([]);
	});
});

/**
 * Вивантажується та збірка, яку перевіряли (§ 1.10, `CI-DEPLOY-ORDER`, HIGH).
 *
 * ## Дефект живе в ПОРЯДКУ кроків, і тому його не бачить жоден гейт
 *
 * Кожен гейт міряє теку `build/`, яка на момент його погляду правильна.
 * `playwright.config.ts` тут піднімає власний сервер командою
 * `npm run build && npm run preview` — у ту саму теку. Досить переставити крок
 * E2E під крок збірки, і порядок стає такий: правильна збірка → зелений
 * `check:build` над нею → E2E ПЕРЕЗАПИСУЄ `build/` власною збіркою →
 * `upload-pages-artifact` вивантажує саме її.
 *
 * Заміряно 2026-08-26 в `adoptananimal`: збірка E2E йшла без `BASE_PATH` і
 * `SITE_ORIGIN`, і сайт відкривався (пререндер робить шляхи до ресурсів
 * відносними), але `canonical` кожної з 229 сторінок і кожен `<loc>` у
 * `sitemap.xml` вказували на корінь СУСІДНЬОГО сайту на спільному домені.
 * Тут ціна така сама: запасна адреса `alik532ua.github.io` — спільний origin.
 *
 * Сьогодні порядок правильний — E2E стоїть вище збірки для деплою. Саме тому
 * інваріант і додається зараз: він не лікує наявний дефект, а тримає стан, який
 * тримався коментарем. Коментар не червоніє.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: переставити крок `E2E — гейти над зібраним сайтом`
 * під крок `Build` — перевірка червоніє й називає саме цей крок; замінити в
 * `lighthouserc.cjs` `staticDistDir` на `startServerCommand: npm run build …` —
 * червоніє друга перевірка.
 */
describe('деплой вивантажує перевірену збірку (§ 1.10)', () => {
	/** Крок, що ПИШЕ в `build/`: власна збірка або прогін, який збирає сам. */
	const WRITES_BUILD = /npm run build\b|npm run test:e2e\b|playwright test\b|preview\b/;
	const UPLOAD = /upload-pages-artifact/;

	const pipeline = files.flatMap((file) =>
		stepsOf(readFileSync(`${DIR}/${file}`, 'utf8')).map((s) => ({ ...s, file }))
	);

	const uploadAt = pipeline.findIndex((s) => UPLOAD.test(s.body));
	const buildAt = pipeline.reduce(
		(last, step, i) => (i < uploadAt && /npm run build\b/.test(step.body) ? i : last),
		-1
	);

	it('перевірка жива: кроки збірки й вивантаження знайдено', () => {
		expect(uploadAt, 'у пайплайні немає кроку upload-pages-artifact — порядок міряти нічим').toBeGreaterThan(
			-1
		);
		expect(buildAt, 'перед вивантаженням немає жодного `npm run build`').toBeGreaterThan(-1);
	});

	it('між збіркою для деплою і вивантаженням ніщо не пише в build/', () => {
		const between = pipeline
			.slice(buildAt + 1, uploadAt)
			.filter((step) => WRITES_BUILD.test(step.body))
			.map((step) => `${step.file} → ${step.name}`);
		expect(
			between,
			'крок між збіркою і вивантаженням перезаписує `build/` — на Pages поїде ' +
				'не та збірка, яку перевірив `check:build`:\n' + between.join('\n')
		).toEqual([]);
	});

	it('вивантажується саме тека збірки', () => {
		const path = pipeline[uploadAt]?.body.match(/path:\s*'?"?\.?\/?([\w./-]+?)'?"?\s*$/m)?.[1];
		expect(path, 'у кроці upload немає `path:` — незрозуміло, що саме їде на хостинг').toBeDefined();
		expect(path?.replace(/\/$/, ''), 'вивантажується не `build/`').toBe('build');
	});

	it('Lighthouse читає готову збірку, а не робить власну', () => {
		// Крок lhci стоїть НИЖЧЕ збірки для деплою (перед вивантаженням), тож
		// власна збірка в його конфізі — це рівно той самий перезапис, лише
		// заведений не з workflow, а з файлу поруч. Умова перевіряється там, де
		// вона записана: у конфізі.
		const lhciBelowBuild = pipeline
			.slice(buildAt + 1, uploadAt)
			.some((step) => /lhci\b/.test(step.body));
		if (!lhciBelowBuild) return;

		const config = existsSync('lighthouserc.cjs') ? readFileSync('lighthouserc.cjs', 'utf8') : '';
		expect(config, 'крок lhci є, а конфігу lighthouserc.cjs немає').not.toBe('');
		expect(
			/staticDistDir/.test(config),
			'Lighthouse нижче збірки для деплою мусить читати готову теку (`staticDistDir`)'
		).toBe(true);
		expect(
			/startServerCommand[\s\S]{0,80}(npm run build|vite build)/.test(config),
			'конфіг Lighthouse збирає сайт сам — це перезапише `build/` після `check:build`'
		).toBe(false);
	});
});
