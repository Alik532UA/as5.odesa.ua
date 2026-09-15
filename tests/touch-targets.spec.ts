import { expect, test, type Page } from './fixtures';
import { htmlRoutes } from './routes';
import { OVERLAYS } from './overlays';
import { waitForSettled } from './settled';
import {
	OVERLAP_ALLOWED_PAIR,
	TOUCH_DEBT,
	TOUCH_DEBT_COARSE,
	TOUCH_MIN,
	TOUCH_MIN_COARSE,
	TOUCH_OVERLAP_MAX
} from './touch-baseline';

/**
 * GATE-TOUCH-TARGET — розмір сенсорних цілей (WCAG 2.2 SC 2.5.8, рівень AA, і
 * UI-ELEMENTS-v8 § 1 для дотику).
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
 * ## Два пороги, бо їх справді два
 *
 * 24×24 — нормативний мінімум SC 2.5.8 і діє на будь-якому вказівнику. 44×44
 * канон вимагає на ДОТИКУ, і в проєкті воно живе в `@media (pointer: coarse)`.
 *
 * Перша редакція цього файлу міряла лише перший поріг, і причина була записана
 * прямо: «Playwright ходить мишею, тобто `coarse`-гілка в замір не потрапляє».
 * Твердження виявилося неправдою — контекст із `hasTouch: true` дає
 * `matchMedia('(pointer: coarse)').matches === true`, — і саме за ним ховався
 * справжній дефект (заміряно 2026-09-02, усі 7 сторінок):
 *
 *     header-settings-btn  40×40      footer-piano-btn  120×36
 *     header-burger-btn    40×40      order website     120×36
 *     Facebook, Instagram  36×36      skip-to-content   195×38
 *
 * Кружечки соцмереж мали власне правило `@media (pointer: coarse)` на 44×44 —
 * і воно не діяло ніколи: стояло ВИЩЕ за базове `width: 36px` тієї ж
 * специфічності, тобто програвало порядком. Поруч лежав коментар, який
 * пояснював, чому кружечок 44×44. Найдорожча форма помилки: код виглядає
 * зробленим, і в нього ніхто не повертається.
 *
 * Тепер мінімум задає одна утиліта `.touch-target` у `global.css` через
 * `min-width`/`min-height` — вони від нічиєї специфічності не залежать узагалі.
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

/** Замір однієї сторінки в одному вікні. Спільний для обох порогів. */
async function measure(page: Page, route: string, vp: { w: number; h: number }, min: number) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: vp.w, height: vp.h });
	await page.goto(route);
	await expect(page.getByTestId('app-header')).toBeVisible();
	await waitForSettled(page);

	return page.evaluate(
		([selector, limit]) => {
			const small: Target[] = [];
			let seen = 0;
			for (const node of Array.from(document.querySelectorAll(selector as string))) {
				const el = node as HTMLElement;
				const box = el.getBoundingClientRect();
				if (box.width === 0 || box.height === 0) continue;
				const style = getComputedStyle(el);
				if (style.visibility === 'hidden' || style.display === 'none') continue;
				seen++;
				if (box.width >= (limit as number) && box.height >= (limit as number)) continue;
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
		[INTERACTIVE, min] as const
	);
}

/** Той самий замір, але в межах одного піддерева — для станів після взаємодії. */
async function measureWithin(page: Page, rootTestId: string, min: number) {
	return page.evaluate(
		([selector, limit, root]) => {
			const scope = document.querySelector(`[data-testid="${root as string}"]`);
			const small: Target[] = [];
			let seen = 0;
			if (!scope) return { seen, small };
			for (const node of Array.from(scope.querySelectorAll(selector as string))) {
				const el = node as HTMLElement;
				const box = el.getBoundingClientRect();
				if (box.width === 0 || box.height === 0) continue;
				const style = getComputedStyle(el);
				if (style.visibility === 'hidden' || style.display === 'none') continue;
				seen++;
				if (box.width >= (limit as number) && box.height >= (limit as number)) continue;
				const label =
					el.dataset.testid ||
					(el.textContent ?? '').trim().slice(0, 40) ||
					el.getAttribute('aria-label') ||
					el.tagName.toLowerCase();
				small.push({ label, w: Math.round(box.width), h: Math.round(box.height) });
			}
			return { seen, small };
		},
		[INTERACTIVE, min, rootTestId] as const
	);
}

function report(
	route: string,
	min: number,
	seen: number,
	small: Target[],
	debt: Record<string, readonly string[]>
) {
	// Canary: сторінка без жодної цілі дала б «порушень немає»
	// (AI-AGENT-PITFALLS-v8 § 1). Шапка є всюди, тож нуль неможливий.
	expect(seen, `на ${route} не знайдено жодної інтерактивної цілі`).toBeGreaterThan(0);

	const known = debt[route] ?? [];
	const unexpected = small
		.filter((t) => !known.includes(t.label))
		.map((t) => `«${t.label}» ${t.w}×${t.h}`);

	expect(
		unexpected,
		`ціль менша за ${min}×${min} CSS px:\n${unexpected.join('\n')}`
	).toEqual([]);
}

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
				const { seen, small } = await measure(page, route, vp, TOUCH_MIN);
				report(route, TOUCH_MIN, seen, small, TOUCH_DEBT);
			});
		}
	}
});

/**
 * Той самий замір у контексті, який браузер вважає сенсорним.
 *
 * `hasTouch: true` — і більше нічого: `isMobile` додав би емуляцію мобільного
 * viewport разом із власним UA, тобто змінив би не лише те, що перевіряється.
 * Заміряно: обидва варіанти дають `(pointer: coarse)` і `(hover: none)`, тож
 * зайва половина емуляції нічого не додає, а вплив на розкладку додає.
 *
 * Вікно лише мобільне: `(pointer: coarse)` на десктопній ширині — це планшет у
 * ландшафті, і правила проєкту від ширини тут не залежать.
 */
test.describe('GATE-TOUCH-TARGET на дотику', () => {
	test.use({ hasTouch: true });

	const vp = VIEWPORTS[0];

	test('браузер справді вважає вказівник грубим — перевірка жива', async ({ page }) => {
		await page.goto('/');
		const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
		expect(coarse, '`hasTouch` не дав `pointer: coarse` — гейт міряв би десктопну гілку').toBe(
			true
		);
	});

	for (const route of htmlRoutes()) {
		test(`${route} (дотик) — цілі не менші за ${TOUCH_MIN_COARSE}×${TOUCH_MIN_COARSE}`, async ({
			page
		}) => {
			const { seen, small } = await measure(page, route, vp, TOUCH_MIN_COARSE);
			report(route, TOUCH_MIN_COARSE, seen, small, TOUCH_DEBT_COARSE);
		});
	}
});

/**
 * Стани, яких у завантаженій сторінці немає.
 *
 * Замір лише «як воно приїхало» пропускає рівно те, чим на телефоні
 * користуються найбільше: мобільне меню — це ВСЯ навігація сайту на вузькому
 * екрані, а бачив її гейт нуль разів. Заміряно 2026-09-02 у контексті з
 * `hasTouch` (390×844), до виправлення:
 *
 *     mobile-menu-close-btn   40×40      mobile-nav-home-link      78×29
 *     piano-close-btn         32×48      mobile-nav-about-link    178×29
 *                                        ще три пункти             …×29
 *
 * Тобто кожен пункт мобільного меню був на 15 px нижчий за норму дотику.
 *
 * Перелік і спосіб відкриття — спільний `tests/overlays.ts`, той самий, що
 * міряє axe: два власні переліки станів розходяться на першому ж новому
 * оверлеї, а виглядає це як «там перевірено».
 */

test.describe('GATE-TOUCH-TARGET у станах на дотику', () => {
	test.use({ hasTouch: true });

	for (const overlay of OVERLAYS) {
		test(`${overlay.name} — цілі не менші за ${TOUCH_MIN_COARSE}×${TOUCH_MIN_COARSE}`, async ({
			page
		}) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.setViewportSize({ width: VIEWPORTS[0].w, height: VIEWPORTS[0].h });
			await page.goto('/');
			await waitForSettled(page);

			await page.getByTestId(overlay.open).click();
			await page.getByTestId(overlay.root).waitFor({ state: 'visible' });
			await waitForSettled(page);

			const { seen, small } = await measureWithin(page, overlay.root, TOUCH_MIN_COARSE);
			expect(seen, `у стані «${overlay.name}» не знайдено жодної цілі`).toBeGreaterThan(0);

			const unexpected = small.map((t) => `«${t.label}» ${t.w}×${t.h}`);
			expect(
				unexpected,
				`ціль менша за ${TOUCH_MIN_COARSE}×${TOUCH_MIN_COARSE} CSS px у стані ` +
					`«${overlay.name}»:\n${unexpected.join('\n')}`
			).toEqual([]);
		});
	}
});

/**
 * § 10.3.1 `A11Y-TOUCH-OVERLAP` — цілі перевіряються ПАРАМИ.
 *
 * Поелементна перевірка вище зелена й тоді, коли дві цілі по 44×44 лежать одна
 * на одній: кожна окремо відповідає правилу. У `CV` саме так і сталося —
 * збільшення бейджа до 44 px геометрично зʼїло сусідню кнопку закриття, і клік
 * по її кутку почав відкривати бейдж. Тобто виправлення одного правила
 * порушило інше, і жодна перевірка розміру цього не бачила.
 *
 * Клас особливий тим, що росте саме там, де щойно правили: `padding` розширює
 * зону кліку НЕВИДИМО, і сусід програє в місці, де візуально не змінилося
 * нічого. Тому пари міряються після поелементної перевірки, у тих самих вікнах
 * і в тих самих станах.
 *
 * ## Що вважається порушенням
 *
 * Перетин прямокутників двох РІЗНИХ цілей більший за `TOUCH_OVERLAP_MAX` по
 * обох осях. Вкладені пари (картка-посилання з кнопкою всередині) пропускаються
 * за `contains`: там зовнішній елемент є ціллю навмисно, і перекриття — це
 * вкладеність, а не сусідство.
 *
 * ## Чому виняток тут перевіряється, а не оголошується
 *
 * Дозволена пара (клавіші піаніно) не звільняється від заміру: гейт доводить,
 * що нашарування ОДНОЗНАЧНЕ — у двох клавіш різний `z-index`, і
 * `elementFromPoint` у центрі перетину віддає верхню. Запис у переліку без цієї
 * умови означав би «ми колись на це подивилися», і першу ж помилку в `z-index`
 * — коли біла клавіша спливе над чорною — він би сховав. Перевірка ж скаже про
 * неї тим самим прогоном.
 *
 * Заміряно 2026-09-10: на всіх 7 сторінках у двох вікнах і в станах «мобільне
 * меню» та «налаштування» — жодної пари; у стані «піаніно» — 14 пар по 129×23
 * px, усі чорна(z3) над білою(z2), усі влучання у чорну.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1): дописати
 * `padding-inline: 40px` кнопці шапки — гейт червоніє парою
 * «header-settings-btn ✕ header-burger-btn» із числами перетину; поміняти
 * `z-index` чорної клавіші на менший за білу — червоніє умова однозначності
 * нашарування, хоча самі пари лишаються дозволеними. Прогнано.
 */

type Pair = {
	a: string;
	b: string;
	overlap: string;
	allowed: boolean;
	layered: boolean;
	hit: string;
};

/** Пари цілей, що перетинаються, у межах scope (або всієї сторінки). */
async function overlappingPairs(page: Page, scopeTestId: string | null) {
	return page.evaluate(
		([selector, scopeId, maxOverlap, allowedSource]) => {
			const scope: ParentNode | null = scopeId
				? document.querySelector(`[data-testid="${scopeId as string}"]`)
				: document;
			if (!scope) return { seen: 0, pairs: [] as Pair[] };

			const allowed = new RegExp(allowedSource as string);
			const visible = (Array.from(scope.querySelectorAll(selector as string)) as HTMLElement[]).filter(
				(el) => {
					const box = el.getBoundingClientRect();
					if (box.width === 0 || box.height === 0) return false;
					const style = getComputedStyle(el);
					return style.visibility !== 'hidden' && style.display !== 'none';
				}
			);
			const label = (el: HTMLElement) =>
				el.dataset.testid ||
				(el.textContent ?? '').trim().slice(0, 30) ||
				el.getAttribute('aria-label') ||
				el.tagName.toLowerCase();

			const pairs: Pair[] = [];
			for (let i = 0; i < visible.length; i++) {
				for (let j = i + 1; j < visible.length; j++) {
					const a = visible[i];
					const b = visible[j];
					// Вкладеність — не сусідство: зовнішній елемент є ціллю навмисно.
					if (a.contains(b) || b.contains(a)) continue;

					const ra = a.getBoundingClientRect();
					const rb = b.getBoundingClientRect();
					const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
					const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
					if (ox <= (maxOverlap as number) || oy <= (maxOverlap as number)) continue;

					const la = label(a);
					const lb = label(b);
					const za = getComputedStyle(a).zIndex;
					const zb = getComputedStyle(b).zIndex;
					const cx = (Math.max(ra.left, rb.left) + Math.min(ra.right, rb.right)) / 2;
					const cy = (Math.max(ra.top, rb.top) + Math.min(ra.bottom, rb.bottom)) / 2;
					const hitEl = document.elementFromPoint(cx, cy);
					const hit = !hitEl
						? 'нічого'
						: a.contains(hitEl)
							? la
							: b.contains(hitEl)
								? lb
								: `сторонній: ${label(hitEl as HTMLElement)}`;

					pairs.push({
						a: la,
						b: lb,
						overlap: `${Math.round(ox)}×${Math.round(oy)}`,
						allowed: allowed.test(la) && allowed.test(lb),
						// Однозначне нашарування: різний z-index І влучання в одну з двох.
						layered: za !== zb && (hit === la || hit === lb),
						hit
					});
				}
			}
			return { seen: visible.length, pairs };
		},
		[INTERACTIVE, scopeTestId, TOUCH_OVERLAP_MAX, OVERLAP_ALLOWED_PAIR.source] as const
	);
}

function reportPairs(where: string, seen: number, pairs: Pair[]) {
	// Канарка: сторінка без цілей дала б «пар немає» (AI-AGENT-PITFALLS-v9 § 1).
	expect(seen, `у «${where}» не знайдено жодної інтерактивної цілі`).toBeGreaterThan(1);

	const stolen = pairs
		.filter((p) => !p.allowed)
		.map((p) => `«${p.a}» ✕ «${p.b}» — перетин ${p.overlap} px, клік бере «${p.hit}»`);
	expect(
		stolen,
		`цілі перекривають одна одну більш ніж на ${TOUCH_OVERLAP_MAX} px у «${where}»:\n${stolen.join('\n')}`
	).toEqual([]);

	const ambiguous = pairs
		.filter((p) => p.allowed && !p.layered)
		.map((p) => `«${p.a}» ✕ «${p.b}» — перетин ${p.overlap} px, клік бере «${p.hit}»`);
	expect(
		ambiguous,
		`перетин дозволений як навмисне нашарування, але воно неоднозначне ` +
			`(однаковий z-index або клік іде повз обидві цілі) у «${where}»:\n${ambiguous.join('\n')}`
	).toEqual([]);
}

test.describe('GATE-TOUCH-OVERLAP', () => {
	test.use({ hasTouch: true });

	for (const vp of VIEWPORTS) {
		for (const route of htmlRoutes()) {
			test(`${route} (${vp.name}) — цілі не крадуть одна в одної кліки`, async ({ page }) => {
				await page.emulateMedia({ reducedMotion: 'reduce' });
				await page.setViewportSize({ width: vp.w, height: vp.h });
				await page.goto(route);
				await expect(page.getByTestId('app-header')).toBeVisible();
				await waitForSettled(page);

				const { seen, pairs } = await overlappingPairs(page, null);
				reportPairs(`${route} (${vp.name})`, seen, pairs);
			});
		}
	}

	for (const overlay of OVERLAYS) {
		test(`${overlay.name} — цілі не крадуть одна в одної кліки`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.setViewportSize({ width: VIEWPORTS[0].w, height: VIEWPORTS[0].h });
			await page.goto('/');
			await waitForSettled(page);

			await page.getByTestId(overlay.open).click({ force: true });
			await page.getByTestId(overlay.root).waitFor({ state: 'visible' });
			await waitForSettled(page);

			const { seen, pairs } = await overlappingPairs(page, overlay.root);
			reportPairs(`стан «${overlay.name}»`, seen, pairs);
		});
	}
});
