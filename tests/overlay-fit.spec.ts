import { test, expect, type Page } from '@playwright/test';
import { waitForSettled } from './settled';

/**
 * GATE-OVERLAY-FIT — центрований оверлей не ховає власний вміст.
 *
 * ## Чому це окремий гейт, а не рядок у `fluid-sizing.test.ts`
 *
 * Анти-патерн FLUID-SIZING-v8 рівня CRITICAL — «модальне вікно без
 * `max-height` у центрованому оверлеї» — належить до класу дефектів, яких не
 * видно НІ в джерелах, НІ в `build/` (AI-AGENT-PITFALLS-v8 § 2.1). Розмітка
 * правильна, стилі на місці, збірка зелена; на екрані розробника все
 * вміщається. Дефект існує лише в рантаймі й лише на КОРОТКОМУ вікні.
 *
 * Юніт-інваріант у `src/fluid-sizing.test.ts` ловить клас («хтось узагалі
 * подумав про стелю?»), а не наслідок. Число пікселів, які не видно, міряє
 * лише браузер — і саме воно тут.
 *
 * ## Що було заміряно 2026-08-28 (до виправлення)
 *
 * `PianoModal.svelte`, `#wrap` без `max-height`:
 *
 *   844×390 (телефон, ландшафт): висота 668, top −139, bottom 529
 *   1280×600 (ноутбук):          висота 668, top  −34, bottom 634
 *
 * Батько (`.piano-modal`) центрує й має `overflow: hidden`, тож зайве
 * обрізається З ОБОХ БОКІВ і доскролити до нього не можна. На телефоні в
 * ландшафті — тобто в орієнтації, для якої піаніно й призначене, — з
 * клавіатури зникало 119 px.
 *
 * ## Межа гейта
 *
 * Перевіряється саме те, що ВИДНО: жоден піксель оверлея не лежить за межами
 * вікна. Внутрішня прокрутка (`overflow-y: auto`) при цьому дозволена — вона
 * робить вміст досяжним, а гейт написаний проти недосяжного.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати
 * `max-height: 100dvh` з `#wrap` у `PianoModal.svelte` — гейт червоніє на
 * 844×390 і 1280×600 з числами вище. Прогнано.
 */

/**
 * Вікна, коротші за типовий десктоп. Саме коротке — вісь, по якій ламається
 * центрований оверлей: медіазапити проєкту дивляться на ширину, тому широке
 * й низьке вікно проходить повз усі гілки `@media (max-width: …)`.
 */
const VIEWPORTS = [
	{ w: 1280, h: 600, name: 'ноутбук, коротке вікно' },
	{ w: 844, h: 390, name: 'телефон, ландшафт' },
	{ w: 667, h: 375, name: 'малий телефон, ландшафт' },
	{ w: 390, h: 844, name: 'телефон, портрет' }
];

/**
 * Оверлеї сайту. `open` доводить елемент до видимого стану, `content` — той
 * елемент, який центрується і який не має права стирчати за екран.
 *
 * Прихований тригер — не привід пропустити оверлей мовчки: `skipIfHidden`
 * названий явно, і кожен пропуск друкується в звіт.
 */
const OVERLAYS = [
	{
		name: 'піаніно',
		testId: 'piano-modal',
		content: '#wrap',
		skipIfHidden: null,
		open: async (page: Page) => page.getByTestId('footer-piano-btn').click()
	},
	{
		name: 'мобільне меню',
		testId: 'mobile-menu-modal',
		content: 'nav',
		skipIfHidden: 'header-burger-btn',
		open: async (page: Page) => page.getByTestId('header-burger-btn').click()
	}
];

test.describe('GATE-OVERLAY-FIT', () => {
	test('перелік оверлеїв і вікон не порожній — гейт живий', () => {
		expect(OVERLAYS.length, 'жодного оверлея під перевіркою').toBeGreaterThan(0);
		expect(VIEWPORTS.length, 'жодного короткого вікна під перевіркою').toBeGreaterThan(0);
	});

	for (const vp of VIEWPORTS) {
		for (const overlay of OVERLAYS) {
			test(`${overlay.name} вміщається у ${vp.w}×${vp.h} (${vp.name})`, async ({ page }) => {
				// `emulateMedia`, а не рядок у конфізі: заміряно, що
				// `use.reducedMotion` до сторінки не доходить (`tests/settled.ts`).
				await page.emulateMedia({ reducedMotion: 'reduce' });
				await page.setViewportSize({ width: vp.w, height: vp.h });
				await page.goto('/');

				if (overlay.skipIfHidden) {
					const trigger = page.getByTestId(overlay.skipIfHidden);
					if (!(await trigger.isVisible())) {
						test.skip(true, `тригер ${overlay.skipIfHidden} на цій ширині не показується`);
					}
				}

				await overlay.open(page);
				await page.getByTestId(overlay.testId).waitFor();
				// Оверлеї входять із `transition:`/`animation`, а міряти треба
				// спокійний стан: під час входу висота ще не та, яка лишиться.
				await waitForSettled(page);

				const box = await page.evaluate(
					([testId, selector]) => {
						const root = document.querySelector(`[data-testid="${testId}"]`);
						const el = root?.querySelector(selector as string);
						if (!(el instanceof HTMLElement)) return null;
						const r = el.getBoundingClientRect();
						return {
							top: Math.round(r.top),
							bottom: Math.round(r.bottom),
							height: Math.round(r.height),
							viewport: window.innerHeight
						};
					},
					[overlay.testId, overlay.content] as const
				);

				expect(box, `${overlay.content} не знайдено — перевірка міряла б порожнечу`).not.toBeNull();
				const { top, bottom, height, viewport } = box!;
				const hiddenAbove = Math.max(0, -top);
				const hiddenBelow = Math.max(0, bottom - viewport);

				expect(
					{ hiddenAbove, hiddenBelow },
					`${overlay.name}: вміст ${height} px у вікні ${viewport} px — ` +
						`${hiddenAbove} px зрізано зверху й ${hiddenBelow} px знизу, ` +
						'і доскролити до них не можна (батько центрує)'
				).toEqual({ hiddenAbove: 0, hiddenBelow: 0 });
			});
		}
	}
});
