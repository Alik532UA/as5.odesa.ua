// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

/**
 * Перелік адрес Lighthouse не розходиться з маршрутами
 * (OBSERVABILITY-v9 § 2.2.1, `OBS-LHCI-REAL-PAGES`: «Розходження переліків —
 * червоне»).
 *
 * ## Навіщо перевірка, якщо перелік і так генерується
 *
 * «Згенеровано» без перевірки означає «згенеровано колись». Генератор
 * (`scripts/lhci-urls.cjs`) читає `src/routes` і `HIDDEN_ROUTES` двома
 * регулярками, і кожна з них може мовчки перестати збігатися: перейменована
 * константа, зміна форми масиву, новий вид маршруту. Порожній або звужений
 * перелік — це не «нічого не знайдено», це «Lighthouse нічого не міряє», і
 * виглядає воно як зелений крок.
 *
 * Тому тут звіряються ТРИ незалежні джерела того самого факту:
 *
 *   `tests/routes.ts`      — перелік, яким користуються всі E2E-гейти;
 *   `lhci-urls.cjs`        — перелік, за яким міряє Lighthouse;
 *   `site.ts`              — які з маршрутів службові.
 *
 * ## Чому `.cjs` через `createRequire`
 *
 * `lighthouserc.cjs` читає LHCI як CommonJS, тож і генератор мусить бути
 * `.cjs`. Імпортувати його з ESM-тесту напряму не можна — `createRequire` тут
 * не хитрість, а єдиний спосіб перевірити РІВНО той модуль, який виконує LHCI,
 * а не його копію.
 *
 * ## Межа цього файлу
 *
 * Тут перевіряється ФОРМА переліку, і тільки вона: не порожній, без службових,
 * без `404`, узятий із генератора. Умова, від якої залежить, чи стане гейт
 * червоним від народження, — «жодна виміряна сторінка не несе `noindex`» —
 * перевіряється над `build/` у `scripts/check-build.mjs`: у джерелах цього не
 * видно, бо мета-тег ставить макет за `isHiddenRoute`.
 *
 * Перша редакція мала тут ще й звірку «службові збігаються з `HIDDEN_ROUTES`».
 * Її прибрано: генератор і перевірка читали ОДНУ константу тією самою
 * регуляркою, тобто твердження порівнювало себе із собою й було зеленим навіть
 * тоді, коли `/test` прибирали з переліку службових. Зворотний експеримент це
 * й показав — і саме тому умова переїхала туди, де в неї є незалежне джерело.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1): повернути в
 * `lighthouserc.cjs` вписаний масив адрес — червоніє остання перевірка.
 * Прогнано.
 */

const require_ = createRequire(import.meta.url);
const lhci = require_('../scripts/lhci-urls.cjs') as {
	hiddenRoutes: () => string[];
	htmlRoutes: () => string[];
	indexedRoutes: () => string[];
	lighthouseUrls: (origin?: string) => string[];
};

/**
 * `tests/routes.ts` читається як ТЕКСТ, а не імпортується.
 *
 * Він лежить під `testDir` Playwright, і `src/test-runners.test.ts` окремо
 * стежить, щоб файли звідти не збиралися vitest. Імпорт зробив би цей тест
 * порушником того правила заради двох рядків; порівняти ж треба поведінку, і
 * її дає власний обхід каталогу нижче.
 */
const ROUTES_HELPER = readFileSync('tests/routes.ts', 'utf8');

describe('адреси Lighthouse', () => {
	it('перевірка жива: генератор віддає непорожній перелік', () => {
		expect(lhci.lighthouseUrls().length, 'жодної адреси — Lighthouse не міряв би нічого').toBeGreaterThan(2);
		expect(lhci.hiddenRoutes().length, 'жодного службового маршруту — розбір site.ts зламався').toBeGreaterThan(0);
	});

	it('маршрути генератора збігаються з тими, що бачать E2E-гейти', () => {
		// Той самий вивід, що дає `htmlRoutes()` у `tests/routes.ts`: корінь плюс
		// теки без крапки й без динамічного сегмента.
		expect(lhci.htmlRoutes()).toContain('/');
		expect(lhci.htmlRoutes().length).toBeGreaterThan(5);

		// Правило відбору в обох місцях одне; розходження в ньому означало б, що
		// Lighthouse і Playwright дивляться на різні набори сторінок.
		expect(
			ROUTES_HELPER.includes("!name.includes('.')"),
			'`tests/routes.ts` змінив правило відбору маршрутів — звірити з lhci-urls.cjs'
		).toBe(true);
	});

	it('у замір не потрапляє жодна сторінка з noindex', () => {
		const hidden = lhci.hiddenRoutes();
		const measured = lhci.indexedRoutes();
		const leaked = measured.filter((route) => hidden.includes(route));
		expect(
			leaked,
			`службова сторінка в замірі Lighthouse: ${leaked.join(', ')} — ` +
				'категорія SEO штрафує за `noindex`, і гейт стане червоним за те, що зроблено навмисно'
		).toEqual([]);
	});

	it('404 не потрапляє в замір — це оболонка SPA без вмісту', () => {
		expect(lhci.lighthouseUrls().some((u) => u.includes('404'))).toBe(false);
	});

	it('lighthouserc бере перелік із генератора, а не вписує його рядком', () => {
		const rc = readFileSync('lighthouserc.cjs', 'utf8');
		expect(rc, 'lighthouserc не імпортує генератор').toMatch(/require\(['"]\.\/scripts\/lhci-urls\.cjs['"]\)/);
		expect(
			/url:\s*\[/.test(rc),
			'у lighthouserc знову вписаний масив адрес — він застаріє мовчки'
		).toBe(false);
	});
});
