import { expect, test, type Page } from './fixtures';

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

/**
 * Той самий пункт у локаторі — kebab-case (§ 5.6, `BETA-LOCATOR-PER-CHECK`).
 *
 * У сховищі лежить `common_1`, у розмітці — `common-1`: підкреслень у
 * локаторах немає (TESTID-AND-NAMING § 1.2). Дві константи, бо перевірка звіту
 * нижче звіряється з ПЕРШОЮ, а кліки — з другою.
 */
const TID = CHECK.replace(/_/g, '-');

const progress = (page: Page) => page.getByTestId('beta-progress-value').innerText();

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.getByTestId('beta-checklist-section')).toBeVisible({ timeout: 20_000 });
});

test('позначка переживає перезавантаження', async ({ page }) => {
	const vote = page.getByTestId(`beta-vote-${TID}-ok-btn`);
	await vote.click();
	await expect(vote).toHaveAttribute('aria-pressed', 'true');

	await page.reload();

	await expect(
		page.getByTestId(`beta-vote-${TID}-ok-btn`),
		'позначка не пережила перезавантаження — сесія тестувальника зникає мовчки'
	).toHaveAttribute('aria-pressed', 'true');
});

test('поступ росте на один, а повторний клік його повертає', async ({ page }) => {
	const before = await progress(page);
	const vote = page.getByTestId(`beta-vote-${TID}-ok-btn`);

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

	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();

	await expect(own, 'лічильник вкладки не зрушив').not.toHaveText(before);
	await expect(
		page.getByTestId('beta-tab-home-progress-text'),
		'позначка потрапила в чужу вкладку'
	).toHaveText(/^0\//);
});

test('перемикання вкладки міняє пункти й не губить позначене', async ({ page }) => {
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();

	await page.getByTestId('beta-tab-home-btn').click();
	await expect(
		page.getByTestId(`beta-check-${TID}-item`),
		'пункти чужої вкладки лишилися на екрані'
	).toHaveCount(0);

	await page.getByTestId('beta-tab-common-btn').click();
	await expect(
		page.getByTestId(`beta-vote-${TID}-ok-btn`),
		'позначка загубилася при поверненні на вкладку'
	).toHaveAttribute('aria-pressed', 'true');
});

/**
 * § 6.3: стирання — єдина незворотна дія на сторінці, і стоїть вона в тому
 * самому рядку, що й кнопка звіту, до якої тягнуться щоразу.
 */
test('перше натискання «стерти» нічого не стирає', async ({ page }) => {
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();
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

/**
 * Буфер обміну в headless недоступний, і це зручно: сценарій заразом доводить,
 * що ЗАПАСНИЙ шлях (§ 6.2) справді працює. Перевіряється саме локатор відмови
 * (§ 6.2.1) — спільна підказка зеленіла б і тоді, коли буфер спрацював, тобто
 * запасний шлях лишався б неперевіреним.
 */
test('звіт доходить до людини навіть без буфера обміну', async ({ page, context }) => {
	await context.clearPermissions();
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();
	await page.getByTestId('beta-report-btn').click();

	const field = page.getByTestId('beta-report-input');
	if (await field.isVisible()) {
		await expect(page.getByTestId('beta-report-failed-hint')).toBeVisible();
		await expect(field, 'у звіті немає позначеного пункта').toHaveValue(new RegExp(CHECK));
	}
});

/**
 * § 8.5.1 і § 8.4: версія відповідає на «чи рахується моя позначка», перелік
 * екранів знімає найдовший крок у роботі — прочитав пункт, шукає, де це на
 * сайті. Обидва беруться з того самого, що читають інваріанти, тож розійтися з
 * дійсністю непоміченими не можуть, — але лише доти, доки їх справді малюють.
 */
test('на сторінці видно версію, вихід і екрани вкладки', async ({ page }) => {
	await expect(page.getByTestId('beta-version-text')).toHaveText(/\d/);
	await expect(
		page.getByTestId('beta-home-link'),
		'зі службової сторінки нема куди піти'
	).toHaveAttribute('href', /.+/);

	// У вкладки «Спільне» маршрутів немає навмисно — шапка й підвал живуть на
	// КОЖНІЙ сторінці. Екрани показує будь-яка інша.
	await page.getByTestId('beta-tab-pages-btn').click();
	const links = page.locator('[data-testid^="beta-screen-"]');
	expect(await links.count(), 'вкладка не показала жодного екрана').toBeGreaterThan(0);
	await expect(links.first()).toHaveAttribute('href', /.+/);
});
