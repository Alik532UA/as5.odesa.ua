import { describe, expect, it } from 'vitest';
import {
	HIDDEN_ROUTES,
	SITE_FALLBACK_ROOT,
	SITE_ORIGIN,
	SITE_ROOT,
	assetUrl,
	canonicalUrl,
	isHiddenRoute,
	siteRootFor
} from './site';

/**
 * Політика публічних адрес (SEO-v9 § 1, DEBUGGING-v9 § 3.4).
 *
 * ## Чому саме цей модуль вартий окремих інваріантів
 *
 * Він ламав сайт двічі, і обидва рази невидимо в коді:
 *
 *  - `canonical` збирався як `SITE_ORIGIN + base + pathname`, а `pathname` УЖЕ
 *    містить базу — кожна сторінка оголошувала канонічну адресу, якої не існує;
 *  - `og:image` збирався БЕЗ бази — тобто теж указував не туди.
 *
 * Різниця між двома формулами — одна константа, і жоден тип її не звіряє:
 * `SITE_ORIGIN` і `SITE_ROOT` мають однаковий тип і зараз навіть однакове
 * значення (база порожня з переїзду на власний домен). Тобто помилка знову
 * стане невидимою — до наступної зміни бази. Тут вона названа словами:
 * `canonicalUrl` бере origin, `assetUrl` бере корінь.
 *
 * Другий бік файлу — `siteRootFor()`: відколи скидання даних фільтрує кеші й
 * реєстрації service worker за цим коренем, ця функція є МЕЖЕЮ між своїм і
 * чужим на спільному origin. Її поведінка на трьох різних хостах — не деталь.
 *
 * Модуль став покриваним лише з підставою `$app/paths`
 * (`src/test-mocks/app-paths.ts`): без неї імпорт падав до першого `it`.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: замінити в `canonicalUrl` `SITE_ORIGIN` на
 * `SITE_ROOT` — червоніє перевірка формули (з непорожньою базою вона дає
 * подвоєння); прибрати `SITE_FALLBACK_ROOT` зі списку в `siteRootFor` —
 * червоніє межа за запасною адресою.
 */

describe('політика адрес (SEO-v9 § 1)', () => {
	it('перевірка жива: константи на місці й це справжні адреси', () => {
		expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
		expect(SITE_FALLBACK_ROOT).toMatch(/^https:\/\/[^/]+\/.+\/$/);
		expect(HIDDEN_ROUTES.length).toBeGreaterThan(0);
	});

	it('canonical бере ORIGIN, бо pathname уже містить базу', () => {
		// Саме тут і був дефект: із `SITE_ROOT` замість `SITE_ORIGIN` при
		// непорожній базі виходило `…/as5.odesa.ua/as5.odesa.ua/about`.
		expect(canonicalUrl('/about')).toBe(`${SITE_ORIGIN}/about`);
		expect(canonicalUrl('/')).toBe(`${SITE_ORIGIN}/`);
		expect(canonicalUrl('/about')).not.toContain('//about');
	});

	it('адреса файлу зі static бере КОРІНЬ і додає базу сама', () => {
		expect(assetUrl('/og/og-default-1200x630.jpg')).toBe(
			`${SITE_ROOT}/og/og-default-1200x630.jpg`
		);
		// Приймає шлях і без початкової скісної — інакше виклик без неї давав
		// би склеєну адресу `…uaog/…`, яка виглядає майже правильно.
		expect(assetUrl('og/x.jpg')).toBe(`${SITE_ROOT}/og/x.jpg`);
	});

	it('службовий маршрут визначається за route.id, а не за шляхом', () => {
		for (const route of HIDDEN_ROUTES) expect(isHiddenRoute(route)).toBe(true);
		expect(isHiddenRoute('/about')).toBe(false);
		expect(isHiddenRoute('/')).toBe(false);
		// `null` — це «маршрут не збігся» (404); службовим він не є.
		expect(isHiddenRoute(null)).toBe(false);
	});
});

describe('межа «своє / чуже» на спільному origin (DEBUGGING-v9 § 3.4)', () => {
	it('на власному домені корінь — сам origin', () => {
		expect(siteRootFor(`${SITE_ORIGIN}/about`)).toBe(`${SITE_ORIGIN}/`);
		expect(siteRootFor(`${SITE_ORIGIN}/`)).toBe(`${SITE_ORIGIN}/`);
	});

	it('за запасною адресою корінь — підпапка проєкту, а не origin', () => {
		// Найважливіший рядок файлу: саме тут `base` (порожній) збігся б з усім
		// origin, тобто межа зникла б, а виглядало б це як робочий фільтр.
		expect(siteRootFor(`${SITE_FALLBACK_ROOT}history`)).toBe(SITE_FALLBACK_ROOT);
		expect(siteRootFor(SITE_FALLBACK_ROOT)).toBe(SITE_FALLBACK_ROOT);
	});

	it('сусідній проєкт на тому самому origin у наш корінь не входить', () => {
		const neighbour = new URL('/MindStep/', SITE_FALLBACK_ROOT).href;
		expect(neighbour.startsWith(siteRootFor(`${SITE_FALLBACK_ROOT}history`))).toBe(false);
		// І кореневий scope того самого origin — теж не наш.
		expect(
			new URL('/', SITE_FALLBACK_ROOT).href.startsWith(siteRootFor(SITE_FALLBACK_ROOT))
		).toBe(false);
	});

	it('невідомий хост (dev, preview, порт E2E) — межа за коренем origin', () => {
		expect(siteRootFor('http://localhost:5193/about')).toBe('http://localhost:5193/');
		expect(siteRootFor('http://localhost:5499/')).toBe('http://localhost:5499/');
	});
});
