import { expect, test, type Page } from '@playwright/test';
import { EXPECTED_ROUTE_COUNT, dynamicRoutes, htmlRoutes } from './routes';

/**
 * Дублікати `data-testid` у ЖИВОМУ DOM (TESTID-AND-NAMING-v8, `GATE-TESTID-RUNTIME`).
 *
 * ## Чому цього гейта не було, хоч на нього вже посилалися
 *
 * `GATE-TESTID-RUNTIME` — єдиний BLOCKING-гейт із `canon.json`, застосовний до
 * цього проєкту, якого тут не існувало. При цьому докблок
 * `src/testid-conventions.test.ts` уже казав про нього як про наявний:
 * «рантайм-дублікати ловить Playwright-інваріант». Твердження було
 * найдорожчого сорту — воно закривало тему.
 *
 * Друга половина причини — `AGENTS.md`, який три дні після встановлення
 * Playwright забороняв писати файли під нього. Гейт неможливо було зробити, не
 * порушивши інструкцію проєкту.
 *
 * ## Чому статичної перевірки замало
 *
 * `src/testid-conventions.test.ts` читає ДЖЕРЕЛА, і в цьому його сила: він
 * бачить локатори всередині `{#if}`, куди браузер після `goto()` не заходить.
 * Але дублікат — властивість не файлу, а СТОРІНКИ: два компоненти з чистими
 * власними списками дають зіткнення, щойно опиняться в одному DOM. Статична
 * перевірка ловить лише повтор у межах одного компонента, і це записано в її
 * власному докблоці.
 *
 * Дзеркально й межа цієї перевірки: вона бачить рівно ті стани, які тут
 * відкриті руками. Мобільне меню (`{#if ui.isMenuOpen}`) і модалка піаніно в
 * prerendered HTML відсутні ЗОВСІМ — тому нижче їх відкривають, а не
 * сподіваються застати.
 *
 * ## Чому це коштує дублікат
 *
 * Два елементи з однаковим `data-testid` роблять `getByTestId()`
 * недетермінованим: Playwright кидає strict mode violation, і тест падає не
 * там, де дефект. Гірший випадок — `.first()`, дописаний, щоб «полагодити»
 * падіння: тоді перевірка мовчки міряє випадковий із двох елементів.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): дописати другому
 * елементу вже зайнятий `data-testid` — перевірка червоніє з назвою й
 * кількістю; звузити `ROUTES` до одного маршруту — червоніє звірка переліку.
 */

/**
 * Перелік сторінок — спільний із axe-гейтом (`tests/routes.ts`), і саме тому
 * винесений: два власні переліки розходяться на першій же новій сторінці, а
 * виглядає це як «там перевірено».
 */
const ROUTES = htmlRoutes();

/** Кожен `data-testid` сторінки з кількістю входжень більше одного. */
async function duplicates(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const counts = new Map<string, number>();
		for (const el of document.querySelectorAll('[data-testid]')) {
			const id = el.getAttribute('data-testid') ?? '';
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return [...counts.entries()]
			.filter(([, n]) => n > 1)
			.map(([id, n]) => `${id} — ${n} елементи`)
			.sort();
	});
}

const testIdCount = (page: Page) =>
	page.evaluate(() => document.querySelectorAll('[data-testid]').length);

/**
 * Перевірка, яка захищає перевірку.
 *
 * Нуль локаторів дав би «жодного дубліката» на будь-якій порожній чи
 * незавантаженій сторінці — зелений результат ні про що
 * (AI-AGENT-PITFALLS-v8 § 1).
 */
async function expectNoDuplicates(page: Page, where: string) {
	expect(await testIdCount(page), `жодного data-testid (${where}) — сторінка не завантажилася?`)
		.toBeGreaterThan(0);
	expect(await duplicates(page), `дублікати data-testid (${where})`).toEqual([]);
}

test('перелік маршрутів під гейтом виведено, а не вписано', () => {
	expect(dynamicRoutes(), 'динамічний маршрут — перелік нижче його не розгортає').toEqual([]);
	expect(ROUTES.length, `маршрути під гейтом: ${ROUTES.join(', ')}`).toBe(EXPECTED_ROUTE_COUNT);
});

for (const route of ROUTES) {
	test(`${route} — жодного дубліката data-testid`, async ({ page }) => {
		await page.goto(route);
		// Шапка живе в layout, тобто є на кожній сторінці, зокрема службових.
		await expect(page.getByTestId('app-header')).toBeVisible();
		await expectNoDuplicates(page, route);
	});
}

/**
 * СТАНИ, ЯКИХ НЕМАЄ В PRERENDERED HTML.
 *
 * Мобільне меню стоїть під `{#if ui.isMenuOpen}`, модалка піаніно — під своїм
 * прапорцем; у `build/*.html` їхньої розмітки немає жодного байта. Саме тут
 * дублікат найімовірніший: меню повторює ті самі пункти навігації, що й шапка,
 * і різняться вони лише префіксом (`nav-*` проти `mobile-nav-*`).
 */
test('відкриті оверлеї не додають дублікатів', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('app-header')).toBeVisible();

	await page.getByTestId('header-settings-btn').click();
	await expectNoDuplicates(page, 'відкриті налаштування');
	await page.keyboard.press('Escape');

	await page.getByTestId('footer-piano-btn').click();
	await expect(page.getByTestId('piano-modal')).toBeVisible();
	await expectNoDuplicates(page, 'відкрита модалка піаніно');
	await page.getByTestId('piano-close-btn').click();

	// Бургер до 768px має `display: none`, тож без зміни вікна клік по ньому
	// не відбудеться — і меню, найцікавіший стан, лишилося б неперевіреним.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByTestId('header-burger-btn').click();
	await expect(page.getByTestId('mobile-menu-modal')).toBeVisible();
	await expectNoDuplicates(page, 'відкрите мобільне меню');
});

/**
 * Чеклист — найщільніша розмітка проєкту (131 локатор у зібраному HTML), і
 * вкладки перемальовують більшу її частину. Перевіряються всі, бо активна за
 * замовчуванням одна: решта в prerendered HTML не існує.
 */
test('вкладки чеклиста не додають дублікатів', async ({ page }) => {
	await page.goto('/beta-test-checklists');
	await expect(page.getByTestId('beta-checklist-section').first()).toBeVisible();

	const tabs = page.locator('[data-testid^="beta-tab-"]');
	const count = await tabs.count();
	expect(count, 'вкладок не знайдено — перевірка міряла б одну сторінку').toBeGreaterThan(1);

	for (let i = 0; i < count; i += 1) {
		const id = await tabs.nth(i).getAttribute('data-testid');
		await tabs.nth(i).click();
		await expectNoDuplicates(page, `чеклист, вкладка ${id}`);
	}
});
