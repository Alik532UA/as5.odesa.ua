import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { A11Y_BASELINE, A11Y_KNOWN } from './a11y-baseline';

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
 * автотестом / ще ні / лише людина» (BETA-CHECKLIST-v8). Пункти доступності
 * додані туди тим самим комітом, що й цей файл.
 *
 * Третя межа (§ 10.2): `analyze()` бачить лише той стан, що є одразу після
 * `goto()`. Модалки, відкриті меню й тости в нього не потрапляють НІКОЛИ.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

/**
 * Заголовок дограв появу — обов'язкова умова перед заміром.
 *
 * Переходи Svelte (`in:fade`) пишуть інлайн `style.opacity` з JS покадрово,
 * тобто це НЕ CSS-анімація і `prefers-reduced-motion` їх не стосується. axe на
 * напівпрозорому тексті міряє колір, змішаний із тлом, і дає `color-contrast`,
 * якого на дограній сторінці немає. У `VetCrewGames` це заміряно: `#436a3d` на
 * `#7fa967` (2.3) під анімацією проти прохідної пари після неї, причому
 * результат залежав від навантаження машини.
 *
 * `toHaveCSS` сам перепитує до таймауту, тож це умова на стан, а не пауза.
 * Ширша перевірка «жоден елемент не має проміжної прозорості» не годиться: на
 * сторінці бувають елементи з постійним частковим `opacity`, і така умова не
 * настає ніколи.
 */
async function waitForTitleShown(page: Page) {
	await expect(page.locator('h1').first()).toHaveCSS('opacity', '1');
}

async function audit(page: Page, key: string) {
	await waitForTitleShown(page);
	const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

	// Перевірка, яка захищає перевірку: axe, що не проаналізував нічого, дав би
	// «нуль порушень» на порожній сторінці (AI-AGENT-PITFALLS-v8 § 1).
	expect(
		results.passes.length,
		'axe не виконав жодної перевірки — сторінка порожня чи не завантажилася?'
	).toBeGreaterThan(0);

	const ids = [...new Set(results.violations.map((v) => v.id))].sort();
	expect(ids, `новий тип порушення, якого не було в базі (${key})`).toEqual(
		[...A11Y_KNOWN[key]].sort()
	);
	expect(
		results.violations.length,
		`порушень побільшало (${key}): ${results.violations.map((v) => v.id).join(', ')}`
	).toBeLessThanOrEqual(A11Y_BASELINE[key]);
}

test('головна сторінка не має машинно-виявних порушень WCAG', async ({ page }) => {
	await page.goto('/');
	// Очікування конкретного елемента, а не `networkidle`: axe на недомальованій
	// сторінці дав би нуль порушень і зелений результат ні про що.
	await expect(page.getByTestId('app-header')).toBeVisible();
	await audit(page, 'home');
});

/**
 * ТЕМНА ТЕМА — окремий прогін, а не той самий (ACCESSIBILITY-v8 § 6).
 *
 * Контраст — властивість ПАРИ кольорів, тож зелений результат у світлій темі не
 * говорить про темну взагалі нічого. `colorScheme: 'dark'` б'є в
 * `prefers-color-scheme`, тобто перевіряється саме той шлях, яким тему отримує
 * відвідувач, що ніколи не торкався перемикача.
 */
test.describe('темна тема', () => {
	test.use({ colorScheme: 'dark' });

	test('головна сторінка не має машинно-виявних порушень WCAG', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('app-header')).toBeVisible();
		await audit(page, 'homeDark');
	});
});

/**
 * Сторінка чеклиста — найщільніша розмітка проєкту: вкладки, кнопки, позначки.
 * Саме там найлегше зламати доступність непомітно, бо дивиться на неї
 * тестувальник, а не відвідувач.
 */
test('сторінка чеклиста не має машинно-виявних порушень WCAG', async ({ page }) => {
	await page.goto('/beta-test-checklists/');
	await expect(page.getByTestId('beta-checklist-section').first()).toBeVisible();
	await audit(page, 'betaChecklist');
});
