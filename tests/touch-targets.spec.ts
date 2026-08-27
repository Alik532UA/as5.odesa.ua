import { expect, test } from '@playwright/test';
import { htmlRoutes } from './routes';
import { waitForSettled } from './settled';
import { TOUCH_DEBT, TOUCH_MIN } from './touch-baseline';

/**
 * GATE-TOUCH-TARGET — розмір сенсорних цілей (WCAG 2.2 SC 2.5.8, рівень AA).
 *
 * ## Чому гейт з'явився лише тепер
 *
 * `PROJECT-CONTEXT.md` відносив «44×44 px цілі дотику» до того, що «статично не
 * перевіряється», з планом «пункт `common_8` чеклиста». План був правильний
 * рівно наполовину: СТАТИЧНО розмір справді не порахувати — він складається з
 * шрифта, паддінгів і розкладки, — але браузер його вимірює точно. Ручний
 * пункт тим часом стояв невиконаним, і три контакти підвалу (тобто кожна
 * сторінка сайту) порушували SC 2.5.8:
 *
 *     адреса  264×19    телефон 110×14    пошта 145×14      (2026-08-28)
 *
 * Це той самий клас, що й `GATE-OVERLAY-FIT`: правило, віддане людині, живе
 * рівно доти, доки людина про нього пам'ятає.
 *
 * ## Поріг — 24, а не 44, і це не поблажка
 *
 * 24×24 — нормативний мінімум SC 2.5.8 і діє на будь-якому вказівнику. 44×44
 * канон вимагає на ДОТИКУ (UI-ELEMENTS-v8 § 1), і саме там воно й стоїть — у
 * `@media (pointer: coarse)`. Playwright ходить мишею, тобто `coarse`-гілка в
 * замір не потрапляє; ставити 44 порогом гейта означало б міряти одне, а
 * вимагати інше.
 *
 * ## Борг — переліком, а не числом
 *
 * Число тут гірше за перелік: «14 порушень» не каже, чи це ті самі чотирнадцять
 * чи інші. `TOUCH_DEBT` тримає підписи, і поява НОВОЇ цілі валить прогін, навіть
 * якщо загальна кількість не зросла.
 */

/** Усе, до чого відвідувач може дотягнутися пальцем. */
const INTERACTIVE =
	'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';

/**
 * Вікна заміру. Мобільне обов'язкове (там більшість цілей і найтісніше), але
 * НЕ достатнє: у шапці на вузькому екрані навігація схована під бургер, тож
 * заміром лише мобільного її пункти не бачить ніхто.
 */
const VIEWPORTS = [
	{ w: 390, h: 844, name: 'телефон' },
	{ w: 1280, h: 900, name: 'десктоп' }
];

type Target = { label: string; w: number; h: number };

test.describe('GATE-TOUCH-TARGET', () => {
	test('перелік сторінок і вікон не порожній — гейт живий', () => {
		expect(htmlRoutes().length, 'жодної сторінки під замір').toBeGreaterThan(0);
		expect(VIEWPORTS.length, 'жодного вікна під замір').toBeGreaterThan(0);
	});

	for (const vp of VIEWPORTS) {
		for (const route of htmlRoutes()) {
			test(`${route} (${vp.name}) — цілі не менші за ${TOUCH_MIN}×${TOUCH_MIN}`, async ({
				page
			}) => {
				await page.emulateMedia({ reducedMotion: 'reduce' });
				await page.setViewportSize({ width: vp.w, height: vp.h });
				await page.goto(route);
				await expect(page.getByTestId('app-header')).toBeVisible();
				await waitForSettled(page);

				const { seen, small } = await page.evaluate(
					([selector, min]) => {
						const small: Target[] = [];
						let seen = 0;
						for (const node of Array.from(document.querySelectorAll(selector as string))) {
							const el = node as HTMLElement;
							const box = el.getBoundingClientRect();
							if (box.width === 0 || box.height === 0) continue;
							const style = getComputedStyle(el);
							if (style.visibility === 'hidden' || style.display === 'none') continue;
							seen++;
							if (box.width >= (min as number) && box.height >= (min as number)) continue;
							// Підпис має пережити зміну розкладки: спершу локатор,
							// далі текст, і лише потім тег — щоб борг не «зникав»
							// від правки, якої ніхто не робив.
							const label =
								el.dataset.testid ||
								(el.textContent ?? '').trim().slice(0, 40) ||
								el.getAttribute('aria-label') ||
								el.tagName.toLowerCase();
							small.push({
								label,
								w: Math.round(box.width),
								h: Math.round(box.height)
							});
						}
						return { seen, small };
					},
					[INTERACTIVE, TOUCH_MIN] as const
				);

				// Canary: сторінка без жодної цілі дала б «порушень немає»
				// (AI-AGENT-PITFALLS-v8 § 1). Шапка є всюди, тож нуль неможливий.
				expect(seen, `на ${route} не знайдено жодної інтерактивної цілі`).toBeGreaterThan(0);

				const known = TOUCH_DEBT[route] ?? [];
				const unexpected = small
					.filter((t) => !known.includes(t.label))
					.map((t) => `«${t.label}» ${t.w}×${t.h}`);

				expect(
					unexpected,
					`ціль менша за ${TOUCH_MIN}×${TOUCH_MIN} CSS px — WCAG 2.2 SC 2.5.8, рівень AA:\n` +
						unexpected.join('\n')
				).toEqual([]);
			});
		}
	}
});
