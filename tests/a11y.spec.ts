import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { A11Y_BASELINE, A11Y_KNOWN } from './a11y-baseline';
import { OVERLAYS } from './overlays';
import { EXPECTED_ROUTE_COUNT, dynamicRoutes, htmlRoutes } from './routes';
import { waitForSettled } from './settled';

/**
 * Машинно-виявні порушення WCAG (ACCESSIBILITY-v8 § 10, `GATE-A11Y-AXE`).
 *
 * ## Чому цей гейт з'явився лише тепер
 *
 * Аудит канону v8 (прохід 4, 2026-08-23) заміряв: три проєкти з семи не мали
 * E2E ЗОВСІМ, тобто `GATE-A11Y-AXE` у них не був «зелений» — його не існувало.
 *
 * ## МЕЖА МЕТОДУ, і її треба знати, щоб зелений не читався як «сайт доступний»
 *
 * axe ловить приблизно третину проблем доступності. Порядок фокуса,
 * осмисленість `alt`, логічність заголовків, зрозумілість `aria-label`,
 * працездатність focus trap — він не бачить нічого з цього. Зелений axe означає
 * рівно одне: немає порушень, які видно машині.
 *
 * Друга половина — людина, і в цьому проєкті вона не «колись»: сторінка
 * `/beta-test-checklists` містить перелік перевірок із рівнями «покрито
 * автотестом / ще ні / лише людина» (BETA-CHECKLIST-v8).
 *
 * Третя межа (§ 10.2): `analyze()` бачить лише той стан, що є одразу після
 * `goto()`. Тому оверлеї — мобільне меню, панель налаштувань, піаніно — тут
 * відкриваються й міряються окремо, за спільним переліком `tests/overlays.ts`
 * (той самий, що й у `touch-targets.spec.ts`). Тости в аудит не потрапляють і
 * досі. (Дублікати `data-testid` у цих станах ловить `testid-runtime.spec.ts`.)
 *
 * ## Що змінилося 2026-08-27
 *
 * Сторінок було дві з семи, і саме розширення переліку виявило, що умова
 * готовності неправильна — див. `waitForSettled` у `tests/settled.ts`.
 *
 * ## Що змінилося 2026-09-02
 *
 * Оверлеї під аудитом — і саме перша спроба їх заміряти показала, що умова
 * готовності знову була неправильна, іншим способом: `waitForSettled` рахував
 * лише `CSSAnimation`, а Svelte 5 веде `in:fly` меню через Web Animations API.
 * axe бачив кнопку «Вступ» на прозорості 0.2 — контраст 1.06:1 у світлій схемі,
 * 1.17:1 у темній, пара, якої не існує жодного кадру після завершення.
 * Виправлено в `tests/settled.ts`; тут лишився лише виклик.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

const SCHEMES = ['light', 'dark'] as const;

async function audit(page: Page, key: string) {
	const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

	// Перевірка, яка захищає перевірку: axe, що не проаналізував нічого, дав би
	// «нуль порушень» на порожній сторінці (AI-AGENT-PITFALLS-v8 § 1).
	expect(
		results.passes.length,
		`axe не виконав жодної перевірки (${key}) — сторінка порожня чи не завантажилася?`
	).toBeGreaterThan(0);

	const known = A11Y_KNOWN[key];
	const limit = A11Y_BASELINE[key];
	expect(known, `у базі немає запису для «${key}» — сторінку не заміряно`).toBeDefined();
	expect(limit, `у базі немає числа для «${key}»`).toBeDefined();

	const ids = [...new Set(results.violations.map((v) => v.id))].sort();
	expect(ids, `новий тип порушення, якого не було в базі (${key})`).toEqual([...known].sort());

	// Вузли, а не правила: тринадцять пар нижче AA і тридцять три дають однакове
	// число правил, тож погіршення втричі лишалося б зеленим.
	const nodes = results.violations.reduce((sum, v) => sum + v.nodes.length, 0);
	expect(
		nodes,
		`порушень побільшало (${key}): ${results.violations.map((v) => `${v.id}×${v.nodes.length}`).join(', ')}`
	).toBeLessThanOrEqual(limit);
}

test('перелік сторінок під аудитом виведено, а не вписано', () => {
	expect(dynamicRoutes(), 'динамічний маршрут — перебір його не розгортає').toEqual([]);
	expect(htmlRoutes().length, `сторінки: ${htmlRoutes().join(', ')}`).toBe(EXPECTED_ROUTE_COUNT);

	// Кожна сторінка й кожен оверлей мусять мати запис у базі в ОБОХ схемах —
	// інакше новий стан можна додати, не замірявши його, і гейт лишиться зеленим.
	const expected = [...htmlRoutes(), ...OVERLAYS.map((overlay) => overlay.root)].flatMap((state) =>
		SCHEMES.map((scheme) => `${state} ${scheme}`)
	);
	const missing = expected.filter((key) => !(key in A11Y_BASELINE) || !(key in A11Y_KNOWN));
	expect(missing, `немає запису в базі axe:\n${missing.join('\n')}`).toEqual([]);

	const stale = Object.keys(A11Y_BASELINE).filter((key) => !expected.includes(key));
	expect(stale, `запис про стан, якого вже немає:\n${stale.join('\n')}`).toEqual([]);
});

for (const route of htmlRoutes()) {
	for (const scheme of SCHEMES) {
		/**
		 * ТЕМНА ТЕМА — окремий прогін, а не той самий (ACCESSIBILITY-v8 § 6).
		 *
		 * Контраст — властивість ПАРИ кольорів, тож зелений результат у світлій
		 * темі не говорить про темну взагалі нічого. І це не формальність:
		 * `/test` дає 13 вузлів у світлій темі й 33 у темній.
		 *
		 * `colorScheme` б'є в `prefers-color-scheme`, тобто перевіряється саме
		 * той шлях, яким тему отримує відвідувач, що ніколи не торкався
		 * перемикача.
		 */
		test(`${route} (${scheme}) не має машинно-виявних порушень WCAG`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
			await page.goto(route);
			// Шапка живе в layout, тобто є на кожній сторінці — на відміну від
			// `<h1>`, якого на `/test` немає.
			await expect(page.getByTestId('app-header')).toBeVisible();
			await waitForSettled(page);
			await audit(page, `${route} ${scheme}`);
		});
	}
}

for (const overlay of OVERLAYS) {
	for (const scheme of SCHEMES) {
		/**
		 * Оверлей міряється у ВІДКРИТОМУ стані (ACCESSIBILITY-v8 § 10.2): після
		 * `goto()` його в DOM немає, і жоден прогін по сторінках його не бачить.
		 * Друге `waitForSettled` — після кліку: `in:fly` меню їде через Web
		 * Animations API, і без нього axe міряє кольори посеред анімації.
		 */
		test(`${overlay.name} (${scheme}) не має машинно-виявних порушень WCAG у відкритому стані`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
			await page.setViewportSize(overlay.viewport);
			await page.goto('/');
			await expect(page.getByTestId('app-header')).toBeVisible();
			await waitForSettled(page);

			await page.getByTestId(overlay.open).click();
			await page.getByTestId(overlay.root).waitFor({ state: 'visible' });
			await waitForSettled(page);
			await audit(page, `${overlay.root} ${scheme}`);
		});
	}
}
