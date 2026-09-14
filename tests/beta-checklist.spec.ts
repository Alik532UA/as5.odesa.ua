import { expect, test, type Page } from '@playwright/test';

/**
 * Сторінка чеклиста бета-тестування (BETA-CHECKLIST-v9 § 5.7, `BETA-PAGE-E2E`).
 *
 * ## Чого бракувало
 *
 * Інваріанти в `src/beta-checklist.test.ts` дивилися на ДАНІ: чи є в пункта
 * локатор, чи існує названий файл тесту, чи не перекошені рівні.
 * `tests/testid-runtime.spec.ts` і `tests/a11y.spec.ts` заходили сюди по
 * дорозі. Між ними лишалася діра розміром зі сторінку: чи працює те, заради
 * чого все це написано.
 *
 * Позначки живуть у `localStorage`, звіт складається в браузері, буфер обміну
 * відмовляє буденно — і кожен із цих кроків втрачає роботу тестувальника
 * МОВЧКИ: сторінка лишається намальованою, а інваріанти зеленими.
 */

const PAGE = '/beta-test-checklists';

/** Перший пункт вкладки «Спільне» — `id` стабільний назавжди (§ 2.2). */
const CHECK = 'common_1';

const progress = (page: Page) => page.getByTestId('beta-progress-value').innerText();

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.getByTestId('beta-checklist-section')).toBeVisible({ timeout: 20_000 });
});

test('позначка переживає перезавантаження', async ({ page }) => {
	const vote = page.getByTestId(`beta-vote-${CHECK}-ok-btn`);
	await vote.click();
	await expect(vote).toHaveAttribute('aria-pressed', 'true');

	await page.reload();

	await expect(
		page.getByTestId(`beta-vote-${CHECK}-ok-btn`),
		'позначка не пережила перезавантаження — сесія тестувальника зникає мовчки'
	).toHaveAttribute('aria-pressed', 'true');
});

test('поступ росте на один, а повторний клік його повертає', async ({ page }) => {
	const before = await progress(page);
	const vote = page.getByTestId(`beta-vote-${CHECK}-ok-btn`);

	await vote.click();
	await expect(page.getByTestId('beta-progress-value'), 'поступ не зрушив').not.toHaveText(before);

	// Повторне натискання того самого стану знімає позначку (§ 3.3): помилковий
	// клік мусить бути зворотним, інакше єдиний вихід — стерти все.
	await vote.click();
	await expect(
		page.getByTestId('beta-progress-value'),
		'повторний клік не зняв позначку'
	).toHaveText(before);
});

test('лічильник вкладки росте окремо від загального', async ({ page }) => {
	const own = page.getByTestId('beta-tab-common-progress-text');
	await expect(own).toBeVisible();
	const before = await own.innerText();

	await page.getByTestId(`beta-vote-${CHECK}-ok-btn`).click();

	await expect(own, 'лічильник вкладки не зрушив').not.toHaveText(before);
	await expect(
		page.getByTestId('beta-tab-home-progress-text'),
		'позначка потрапила в чужу вкладку'
	).toHaveText(/^0\//);
});

test('перемикання вкладки міняє пункти й не губить позначене', async ({ page }) => {
	await page.getByTestId(`beta-vote-${CHECK}-ok-btn`).click();

	await page.getByTestId('beta-tab-home-btn').click();
	await expect(
		page.getByTestId(`beta-check-${CHECK}-item`),
		'пункти чужої вкладки лишилися на екрані'
	).toHaveCount(0);

	await page.getByTestId('beta-tab-common-btn').click();
	await expect(
		page.getByTestId(`beta-vote-${CHECK}-ok-btn`),
		'позначка загубилася при поверненні на вкладку'
	).toHaveAttribute('aria-pressed', 'true');
});

/**
 * § 6.3: стирання — єдина незворотна дія на сторінці, і стоїть вона в тому
 * самому рядку, що й кнопка звіту, до якої тягнуться щоразу.
 */
test('перше натискання «стерти» нічого не стирає', async ({ page }) => {
	await page.getByTestId(`beta-vote-${CHECK}-ok-btn`).click();
	const marked = await progress(page);

	await page.getByTestId('beta-clear-btn').click();
	await expect(
		page.getByTestId('beta-progress-value'),
		'одне натискання знесло всю роботу тестувальника'
	).toHaveText(marked);

	await page.getByTestId('beta-clear-btn').click();
	await expect(page.getByTestId('beta-progress-value')).not.toHaveText(marked);
});

/**
 * § 8.2 `BETA-TABS-NOT-ARIA`. Доти смужка оголошувала `role="tablist"` без
 * `tabpanel`, `aria-controls` і стрілок — тобто обіцяла віджет, якого немає:
 * читалка називала його табами, а стрілки не робили нічого. Перевіряється саме
 * відсутність обіцянки, бо повернути її легко й непомітно.
 */
test('вкладки — перемикачі, а не ARIA-таби без реалізації', async ({ page }) => {
	await expect(page.locator('[role="tablist"]'), 'роль повернулася без віджета').toHaveCount(0);
	await expect(page.locator('[role="tab"]')).toHaveCount(0);

	await expect(page.getByTestId('beta-tab-common-btn')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByTestId('beta-tab-home-btn')).toHaveAttribute('aria-pressed', 'false');
});
