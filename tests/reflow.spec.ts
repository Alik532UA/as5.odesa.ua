import { expect, test, type Page } from './fixtures';
import { htmlRoutes } from './routes';
import { OVERLAYS } from './overlays';
import { waitForSettled } from './settled';
import { REFLOW_DEBT, REFLOW_WIDTH } from './reflow-baseline';

/**
 * GATE-REFLOW — WCAG 1.4.10 (Reflow, рівень AA): на ширині 320 CSS px вміст
 * читається без прокрутки у ДВОХ напрямках (ACCESSIBILITY-v9 § 10.8,
 * `A11Y-REFLOW`). 320 обрано специфікацією, а не смаком: це 400 % масштабу на
 * вікні 1280 px.
 *
 * ## Чому цього не покривав жоден наявний гейт
 *
 * `axe` не бачить цього в принципі, і не через недогляд: критерій про
 * РОЗКЛАДКУ, а не про дерево доступності. У проєкті вже є два гейти, що
 * міряють на 320 px, і обидва міряють інше:
 *
 *   `GATE-OVERLAY-FIT`  — центрований оверлей не ховає власний вміст
 *                         (вісь вертикальна: вікно коротке, модалка вища);
 *   `GATE-PANEL-FIT`    — до кожної кнопки прив'язаної панелі можна дістатися.
 *
 * Обидва дивляться на ОДИН елемент і його вміст. Горизонтальна прокрутка
 * сторінки — властивість документа: її дає будь-який елемент, який не влазить
 * і не обрізаний, найчастіше зовсім не той, який правили.
 *
 * ## Головне: чому замір іде з НЕЙТРАЛІЗОВАНИМ `overflow-x`
 *
 * Канон приписує `document.documentElement.scrollWidth <= 320`. У цьому
 * проєкті таке твердження **не може стати червоним ніколи**: `global.css`
 * ставить `overflow-x: hidden` і на `html`, і на `body`, тож `scrollWidth`
 * документа дорівнює ширині вікна за визначенням. Заміряно: із навмисно
 * доданим `min-width: 420px` на `.footer__content` гейт у такій редакції
 * лишався зеленим на всіх 7 сторінках. Гейт, який не може впасти, від
 * зеленого не відрізняється (AI-AGENT-PITFALLS-v9 § 1).
 *
 * І це не лише проблема заміру. `overflow-x: hidden` на документі WCAG 1.4.10
 * не ВИКОНУЄ — він ховає його порушення: смуги немає, доскролити нікуди, і
 * вміст, що не вмістився, зникає замість того, щоб бути незручним. Саме так
 * два заголовки сторінок обрізалися по букві, і не червоніло нічого
 * (коміт «Заголовки двох сторінок обрізалися на 320 px»).
 *
 * Тому перед заміром `overflow-x` знімається `addStyleTag` — рівно на `html` і
 * `body`, і тільки на час заміру. Власні обрізання всередині сторінки
 * лишаються чинними: карусель чернетки (`.focus-track`, 1966 px), декоративна
 * хвиля (`.wave-container`, 499 px) і горизонтальний скролер
 * (`.g-scroll`, 3930 px) обрізані СВОЇМИ контейнерами, у `scrollWidth`
 * документа не входять і порушенням не є.
 *
 * ## Стани після взаємодії — окремим блоком
 *
 * Замір «як сторінка приїхала» пропускає найчастіше місце дефекту: модалку з
 * фіксованою `width` у пікселях (§ 10.8). У prerendered HTML її немає взагалі.
 * Перелік станів і спосіб відкриття — спільний `tests/overlays.ts`, той самий,
 * що в axe і в сенсорних цілях: два власні переліки розходяться на першому ж
 * новому оверлеї, а виглядає це як «там перевірено».
 *
 * ## Замір на 2026-09-10
 *
 * Усі оверлеї й 6 із 7 сторінок — рівно 320. Єдине перевищення (`/test`,
 * 330) лежить у `reflow-baseline.ts` зі стелею й причиною.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1): дописати
 * `min-width: 420px` до `.footer__content` у `FooterSection.svelte` —
 * гейт червоніє на всіх 7 сторінках із `scrollWidth 452` і називає
 * `div.footer__content L32 R452` першим рядком переліку кандидатів. Прогнано.
 */

const REFLOW_VIEWPORT = { width: REFLOW_WIDTH, height: 568 };

/**
 * Знімає обрізання ДОКУМЕНТА, не сторінки.
 *
 * `overflow-x: visible` разом із неявним `overflow-y: auto` за специфікацією
 * обчислюється в `auto` — саме це й потрібно: `html` стає прокрутним
 * контейнером і починає звітувати справжню ширину вмісту.
 */
async function unclipDocument(page: Page) {
	await page.addStyleTag({
		content: 'html, body { overflow-x: visible !important; }'
	});
}

type Culprit = { label: string; left: number; right: number };

/**
 * Наслідок плюс кандидати на його причину.
 *
 * Кандидат — елемент, чий правий край за межею вікна і якого НЕ обрізає
 * жоден предок. `html` і `body` у цьому обході пропускаються: вони і є
 * контейнер, чию прокрутку ми міряємо, і без цього винятку кожен кандидат
 * оголошувався б обрізаним самим `body` (перша редакція звітувала нуль
 * кандидатів при `scrollWidth` 381 — тобто «прокрутка є, причини немає»).
 */
async function measureReflow(page: Page) {
	return page.evaluate((limit) => {
		const culprits: Culprit[] = [];
		for (const node of Array.from(document.body.querySelectorAll('*'))) {
			const el = node as HTMLElement;
			const box = el.getBoundingClientRect();
			if (box.width === 0 || box.height === 0) continue;
			if (box.right <= limit + 0.5) continue;

			let clipped = false;
			for (
				let p = el.parentElement;
				p && p !== document.body && p !== document.documentElement;
				p = p.parentElement
			) {
				if (getComputedStyle(p).overflowX === 'visible') continue;
				if (box.right > p.getBoundingClientRect().right + 0.5) {
					clipped = true;
					break;
				}
			}
			if (clipped) continue;

			const cls =
				typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
			const id = el.dataset.testid ? `[${el.dataset.testid}]` : '';
			culprits.push({
				label: `${el.tagName.toLowerCase()}${id}${cls}`,
				left: Math.round(box.left),
				right: Math.round(box.right)
			});
		}
		return {
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
			// Найдальший правий край — найімовірніша причина.
			culprits: culprits.sort((a, b) => b.right - a.right).slice(0, 8)
		};
	}, REFLOW_WIDTH);
}

function assertFits(
	where: string,
	ceiling: number,
	measured: Awaited<ReturnType<typeof measureReflow>>
) {
	// Канарка: вікно, якого браузер не застосував, дало б інший `clientWidth` —
	// і замір стосувався б не тієї ширини (AI-AGENT-PITFALLS-v9 § 1).
	expect(
		measured.clientWidth,
		`вікно не ${REFLOW_WIDTH} CSS px (clientWidth ${measured.clientWidth}) — ` +
			'замір стосується не тієї ширини'
	).toBe(REFLOW_WIDTH);

	const suspects = measured.culprits.map((c) => `  ${c.label} L${c.left} R${c.right}`).join('\n');
	const overCeiling = measured.scrollWidth - ceiling;
	const note =
		ceiling === REFLOW_WIDTH
			? `WCAG 1.4.10: вміст не вміщається в ${REFLOW_WIDTH} px і обрізається `
			: `стеля боргу для ${where} — ${ceiling} px, і вона лише спадає; перевищено на ${overCeiling} px. `;

	expect(
		measured.scrollWidth,
		`${where}: ${note}scrollWidth ${measured.scrollWidth}.\n` +
			'Кандидати на причину (правий край за межею, предком не обрізаний):\n' +
			(suspects || '  жодного — причина у власній ширині html/body чи в inline-вмісті'),
	).toBeLessThanOrEqual(ceiling);
}

test.describe('GATE-REFLOW', () => {
	test('перелік сторінок і станів не порожній — гейт живий', () => {
		expect(htmlRoutes().length, 'жодної сторінки під замір').toBeGreaterThan(0);
		expect(OVERLAYS.length, 'жодного стану під замір').toBeGreaterThan(0);
	});

	test('у списку боргу немає записів про неіснуючі маршрути', () => {
		const routes = htmlRoutes();
		const stale = Object.keys(REFLOW_DEBT).filter((r) => !routes.includes(r));
		expect(
			stale,
			`борг за reflow названий для маршрутів, яких немає: ${stale.join(', ')}`
		).toEqual([]);
	});

	for (const route of htmlRoutes()) {
		const ceiling = REFLOW_DEBT[route] ?? REFLOW_WIDTH;
		test(`${route} — вміст уміщається в ${REFLOW_WIDTH} px (стеля ${ceiling})`, async ({
			page
		}) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.setViewportSize(REFLOW_VIEWPORT);
			await page.goto(route);
			await expect(page.getByTestId('app-header')).toBeVisible();
			await waitForSettled(page);
			await unclipDocument(page);

			assertFits(route, ceiling, await measureReflow(page));
		});
	}
});

/**
 * Оверлеї на 320 px.
 *
 * Тригер відкривається `force: true`: на вузькому вікні частина тригерів
 * (шестерня налаштувань, кнопка піаніно в підвалі) лежить під іншим шаром або
 * вимагає прокрутки, а предмет цього гейта — розкладка ВІДКРИТОГО стану, не
 * досяжність кнопки. Досяжність міряють `GATE-TOUCH-TARGET` і
 * `GATE-PANEL-FIT`; без `force` цей гейт падав би на клікові й до власного
 * заміру не доходив ніколи.
 */
test.describe('GATE-REFLOW у станах після взаємодії', () => {
	for (const overlay of OVERLAYS) {
		test(`${overlay.name} — уміщається в ${REFLOW_WIDTH} px`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.setViewportSize(REFLOW_VIEWPORT);
			await page.goto('/');
			await waitForSettled(page);

			await page.getByTestId(overlay.open).click({ force: true });
			await page.getByTestId(overlay.root).waitFor({ state: 'visible' });
			await waitForSettled(page);
			await unclipDocument(page);

			assertFits(`стан «${overlay.name}»`, REFLOW_WIDTH, await measureReflow(page));
		});
	}
});
