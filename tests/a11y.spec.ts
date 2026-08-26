import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { A11Y_BASELINE, A11Y_KNOWN } from './a11y-baseline';
import { EXPECTED_ROUTE_COUNT, dynamicRoutes, htmlRoutes } from './routes';

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
 * `goto()`. Модалки, відкриті меню й тости в нього не потрапляють НІКОЛИ.
 * (Дублікати `data-testid` у цих станах ловить `testid-runtime.spec.ts`.)
 *
 * ## Що змінилося 2026-08-27
 *
 * Сторінок було дві з семи, і саме розширення переліку виявило, що умова
 * готовності неправильна — див. `waitForSettled` нижче.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

const SCHEMES = ['light', 'dark'] as const;

/**
 * ГОТОВНІСТЬ ДО ЗАМІРУ: усі скінченні CSS-анімації дограли.
 *
 * ## Що тут було й чому воно не працювало
 *
 * Стояло очікування `opacity: 1` на першому `<h1>`. Обидві половини хибні:
 *
 *  - прозорість, яка псує замір, лежить не на заголовку, а на його ПРЕДКОВІ:
 *    `.page-content { animation: fadeInUp 0.6s }`. У дитини
 *    `getComputedStyle().opacity` дорівнює одиниці незалежно від предка, тож
 *    умова наставала одразу — заміряно: `.page-content` у цю мить стоїть на
 *    0.13–0.22;
 *  - на `/test` заголовка `<h1>` немає взагалі, і очікування падало з
 *    «element(s) not found» — тобто сторінку неможливо було додати до гейта, не
 *    змінивши умову.
 *
 * Ціна першого була не теоретична: замір на непрозорій сторінці давав
 * `color-contrast` на `/competitions` і `/admission`, якого на дограній
 * сторінці немає. Обидва кольори пари змішані з тлом, тож axe міряє пару,
 * якої не існує ні одного кадру після завершення.
 *
 * ## Чому `reducedMotion` у конфізі цього не рятував
 *
 * ЗАМІРЯНО: із `use: { reducedMotion: 'reduce' }` сторінка повідомляє
 * `matchMedia('(prefers-reduced-motion: reduce)').matches === false`, а
 * `.page-content` — `animation-duration: 0.6s`. Перенесення налаштування на
 * рівень проєкту нічого не змінює. Спрацьовує лише явний виклик
 * `page.emulateMedia()` — після нього `matches === true` і тривалість стає
 * `1e-05s`. Тому налаштування дублюється викликом нижче, а НЕ мається на
 * увазі з конфіга.
 *
 * ## Чому саме `getAnimations()`, і чому лише `CSSAnimation`
 *
 * Умова на стан, а не пауза: `waitForFunction` перепитує сам. Нескінченні
 * анімації (чайки, `seagullFly 4s infinite`) виключені — вони не завершаться
 * ніколи й на колір не впливають.
 *
 * `CSSTransition` виключено НАВМИСНО і за заміром: на сторінці постійно висить
 * перехід на SVG хвилі, який щокадру перезапускається кадровою анімацією.
 * Умова «усі анімації дограли» без цього фільтра не настає ніколи — перша
 * редакція цієї функції впала на всіх 14 замірах саме так.
 */
async function waitForSettled(page: Page) {
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation)
			.every(
				(animation) =>
					animation.effect?.getTiming().iterations === Infinity ||
					animation.playState === 'finished'
			)
	);
}

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

	// Кожна сторінка мусить мати запис у базі в ОБОХ схемах — інакше нову
	// сторінку можна додати, не замірявши її, і гейт лишиться зеленим.
	const missing = htmlRoutes()
		.flatMap((route) => SCHEMES.map((scheme) => `${route} ${scheme}`))
		.filter((key) => !(key in A11Y_BASELINE) || !(key in A11Y_KNOWN));
	expect(missing, `немає запису в базі axe:\n${missing.join('\n')}`).toEqual([]);

	const stale = Object.keys(A11Y_BASELINE).filter(
		(key) => !htmlRoutes().some((route) => key === `${route} light` || key === `${route} dark`)
	);
	expect(stale, `запис про сторінку, якої вже немає:\n${stale.join('\n')}`).toEqual([]);
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
