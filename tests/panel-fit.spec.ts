import { test, expect } from './fixtures';
import { waitForSettled } from './settled';

/**
 * GATE-PANEL-FIT — панель, прив'язана до кнопки, лишається досяжною.
 *
 * ## Чому це окремий гейт, а не рядок у `overlay-fit.spec.ts`
 *
 * `GATE-OVERLAY-FIT` міряє ЦЕНТРОВАНИЙ оверлей: він росте в обидва боки від
 * середини вікна, і ламається по вертикалі. Панель біля кнопки ламається
 * інакше (FLUID-SIZING-v8 § 5): вона успадковує позицію тригера й вилазить за
 * той бік, до якого тригер ближчий. Спільного між ними лише слово «не
 * вміщається», тож і перевірки різні.
 *
 * ## Що було заміряно 2026-09-02 (до виправлення)
 *
 * Випадайка налаштувань: `position: absolute; right: 0; width: 220px` усередині
 * шапки з `position: fixed`. Координати від краю вікна:
 *
 *   320×568  ліва межа −4;  перемикач «Гарячі клавіші» 567…595 при висоті 568
 *   667×375  ліва межа 343; той самий перемикач — на 220 px нижче краю
 *   844×390  ліва межа 592; той самий перемикач — на 211 px нижче краю
 *
 * `scrollIntoViewIfNeeded()` не змінював координат жодного разу: панель лежить
 * усередині `position: fixed`, тобто поза потоком прокрутки сторінки.
 *
 * Перемикач «Гарячі клавіші» — це ОБРАНИЙ проєктом спосіб виконати WCAG SC
 * 2.1.4 (рівень A). Отже на телефоні в ландшафті записана відповідність не
 * виконувалася взагалі, і побачити це можна було лише в браузері.
 *
 * ## Що саме перевіряється
 *
 * Не «панель вміщається», а «до кожної кнопки в ній можна дістатися». Це не те
 * саме: панель із внутрішньою прокруткою вища за вікно — і це нормально, доки
 * прокрутка справді доносить кнопку до видимої області. Тому замір іде після
 * `scrollIntoViewIfNeeded()` і по КОЖНОМУ інтерактивному елементу панелі.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути
 * `max-height`/`overflow-y` і прив'язку `right: 0` без заміру — гейт червоніє
 * на 667×375 і 844×390 з числами вище. Прогнано.
 */

const VIEWPORTS = [
	{ w: 1280, h: 800, name: 'десктоп' },
	{ w: 844, h: 390, name: 'телефон, ландшафт' },
	{ w: 667, h: 375, name: 'малий телефон, ландшафт' },
	{ w: 390, h: 844, name: 'телефон, портрет' },
	{ w: 320, h: 568, name: 'вузький телефон' }
];

/** Панелі, прив'язані до тригера. Поки одна — перелік лишається переліком. */
const PANELS = [
	{
		name: 'налаштування',
		trigger: 'header-settings-btn',
		panel: 'header-settings-panel'
	}
];

test.describe('GATE-PANEL-FIT', () => {
	test('перелік панелей і вікон не порожній — гейт живий', () => {
		expect(PANELS.length, 'жодної панелі під перевіркою').toBeGreaterThan(0);
		expect(VIEWPORTS.length, 'жодного вікна під перевіркою').toBeGreaterThan(0);
	});

	for (const vp of VIEWPORTS) {
		for (const panel of PANELS) {
			test(`${panel.name} досяжні у ${vp.w}×${vp.h} (${vp.name})`, async ({ page }) => {
				await page.emulateMedia({ reducedMotion: 'reduce' });
				await page.setViewportSize({ width: vp.w, height: vp.h });
				await page.goto('/');
				await waitForSettled(page);

				const trigger = page.getByTestId(panel.trigger);
				if (!(await trigger.isVisible())) {
					test.skip(true, `тригер ${panel.trigger} на цій ширині не показується`);
				}
				await trigger.click();
				await page.getByTestId(panel.panel).waitFor({ state: 'visible' });
				await waitForSettled(page);

				const root = page.getByTestId(panel.panel);

				// Горизонталь — властивість самої панелі: прокрутка сторінки її не
				// рятує, бо панель лежить у `position: fixed`.
				const box = await root.boundingBox();
				expect(box, `${panel.panel} без геометрії — перевірка міряла б порожнечу`).not.toBeNull();
				const edges = { left: Math.round(box!.x), right: Math.round(box!.x + box!.width) };
				expect(
					{ offLeft: Math.max(0, -edges.left), offRight: Math.max(0, edges.right - vp.w) },
					`${panel.name}: панель ${Math.round(box!.width)} px стоїть у ${edges.left}…${edges.right} ` +
						`при вікні ${vp.w} px`
				).toEqual({ offLeft: 0, offRight: 0 });

				// Вертикаль — властивість КОЖНОЇ кнопки: панель вища за вікно
				// законна, доки прокрутка доносить кнопку до видимої області.
				const controls = root.locator('button, a[href], input, select, [tabindex]:not([tabindex="-1"])');
				const count = await controls.count();
				expect(count, 'у панелі не знайдено жодного елемента — гейт міряв би порожнечу').toBeGreaterThan(
					0
				);

				const unreachable: string[] = [];
				for (let i = 0; i < count; i += 1) {
					const control = controls.nth(i);
					await control.scrollIntoViewIfNeeded();
					const id = (await control.getAttribute('data-testid')) ?? `#${i}`;
					const rect = await control.boundingBox();
					if (!rect) {
						unreachable.push(`${id}: немає геометрії`);
						continue;
					}
					const above = Math.max(0, Math.round(-rect.y));
					const below = Math.max(0, Math.round(rect.y + rect.height - vp.h));
					const left = Math.max(0, Math.round(-rect.x));
					const right = Math.max(0, Math.round(rect.x + rect.width - vp.w));
					if (above || below || left || right) {
						unreachable.push(
							`${id}: ${above} px вище, ${below} px нижче, ${left} px ліворуч, ${right} px праворуч за краєм`
						);
					}
				}

				expect(
					unreachable,
					`${panel.name} у вікні ${vp.w}×${vp.h}: до цих елементів не дістатися ` +
						`навіть прокруткою — панель лежить у position: fixed\n${unreachable.join('\n')}`
				).toEqual([]);
			});
		}
	}
});
