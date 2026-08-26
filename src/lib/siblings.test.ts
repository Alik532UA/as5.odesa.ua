// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolveSiblingLocale, SIBLINGS, siblingUrl } from './siblings';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n/locale';

/**
 * `siblings.ts` — ОДНА таблиця, скопійована у вісім репозиторіїв, і кожен із них
 * знає правду лише про свій рядок.
 *
 * Сусідні сайти будують посилання сюди з рядка `as5`: дві мови, українська на
 * голій адресі, мовного сегмента немає. Додана тут мова робить сім чужих копій
 * застарілими мовчки; прибрана — веде чужі посилання в мову, якої вже немає.
 * Симптом зʼявляється на ЧУЖОМУ сайті й через місяці, тож перевірка стоїть тут:
 * розходження червоніє в тому репозиторії й на тому коміті, що його спричинив.
 *
 * `config/site.ts` читається як ТЕКСТ: він імпортує `$app/paths`, а в
 * `vitest.config.ts` стоїть лише плагін `svelte`, не `sveltekit()` — імпорт упав
 * би ще на розборі залежностей. Той самий висновок, що вже записаний у
 * `i18n/locale.test.ts`.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати `en` із
 * `SUPPORTED_LOCALES` — червоніє звірка мов і, окремо, звірка англійського
 * мосту; поміняти `transport` на `'path'` — червоніє перевірка маршрутів;
 * дописати базу в `svelte.config.js` — червоніє звірка бази.
 */

const ROW = SIBLINGS.as5;

describe('рядок цього сайту в таблиці сусідів', () => {
	it('перелічує ті самі мови, що сайт справді віддає', () => {
		expect([...ROW.locales].sort()).toEqual([...SUPPORTED_LOCALES].sort());
	});

	it('називає ту саму мову на голій адресі', () => {
		expect(ROW.defaultLocale).toBe(DEFAULT_LOCALE);
	});

	it('несе той самий origin, що й конфіг сайту', () => {
		const source = readFileSync('src/lib/config/site.ts', 'utf8');
		const declared = /SITE_ORIGIN = '([^']+)'/.exec(source)?.[1];
		expect(declared, 'site.ts більше не оголошує SITE_ORIGIN').toBeTruthy();
		expect(ROW.origin).toBe(declared);
	});

	/*
	 * База порожня, і це не дрібниця: сайт живе на ВЛАСНОМУ домені, а не як
	 * project page. Той самий рядок у сусідів дав би тут
	 * `as5.odesa.ua/as5.odesa.ua/…` — помилку, яку цей проєкт уже одного разу
	 * робив (`config/site.ts`, докблок про подвійну базу).
	 */
	it('несе порожню базу, як і конфіг збірки', () => {
		const config = readFileSync('svelte.config.js', 'utf8');
		const declared = /^\s*base: "([^"]*)"/m.exec(config)?.[1];
		expect(declared, 'svelte.config.js більше не оголошує базу').toBeDefined();
		expect(ROW.base).toBe(declared);
	});

	it('каже «параметром», бо мовного сегмента тут немає', () => {
		const language = readdirSync('src/routes', { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.filter((name) => /^\[+lang/.test(name));

		expect(language, 'мовний сегмент зʼявився — транспорт має стати path').toEqual([]);
		expect(ROW.transport).toBe('query');
	});
});

describe('«замовити сайт» веде в DigitalWorkshop мовою, якою читають тут', () => {
	const order = (locale: string) =>
		siblingUrl('digitalworkshop', locale, { tab: 'promo', theme: 'colorful' });

	/*
	 * Вкладка й тема їхали в цій адресі й доти. Мова — ні, і саме тому сторінка
	 * «замовити сайт» відкривалася українською й для того, хто читав цей сайт
	 * англійською.
	 */
	it('не губить вкладку й тему, які посилання вже несло', () => {
		expect(order('en')).toBe(
			'https://alik532ua.github.io/DigitalWorkshop/en/?tab=promo&theme=colorful'
		);
	});

	it('називає українську параметром, бо в сусіда вона на голій адресі', () => {
		expect(order('uk')).toBe(
			'https://alik532ua.github.io/DigitalWorkshop/?tab=promo&theme=colorful&lang=uk'
		);
	});

	it('не лишає жодної тутешньої мови без адреси в сусіда', () => {
		for (const locale of SUPPORTED_LOCALES) {
			const url = new URL(order(locale));
			const named = url.searchParams.get('lang') ?? url.pathname.split('/')[2];
			expect(named, `DigitalWorkshop не відкривається мовою ${locale}`).toBe(locale);
		}
	});
});

describe('що дістається цьому сайту від сусідів', () => {
	/*
	 * Тут лише дві мови, а сусіди мають до сорока однієї. Німець із adoptananimal
	 * прийде англійською, а не українською: фолбек мусить бути ЧИТНИМ, а не просто
	 * дійсним.
	 */
	it('містить англійською тих, чиєї мови тут немає', () => {
		expect(resolveSiblingLocale('as5', 'de')).toBe('en');
		expect(resolveSiblingLocale('as5', 'nl')).toBe('en');
		expect(resolveSiblingLocale('as5', 'ja')).toBe('en');
	});

	it('лишає мову як є, коли вона тут є', () => {
		expect(resolveSiblingLocale('as5', 'uk')).toBe('uk');
		expect(resolveSiblingLocale('as5', 'en-US')).toBe('en');
	});

	it('шле параметр, бо шляхом мову тут не назвати', () => {
		expect(siblingUrl('as5', 'en')).toBe('https://as5.odesa.ua/?lang=en');
		expect(siblingUrl('as5', 'uk')).toBe('https://as5.odesa.ua/?lang=uk');
	});
});
