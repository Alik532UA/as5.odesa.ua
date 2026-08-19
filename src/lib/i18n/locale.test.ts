import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	DEFAULT_LOCALE,
	SUPPORTED_LOCALES,
	applyDocumentLanguage,
	resolveLocale
} from './locale';

/**
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1):
 *
 *  - повернути `resolveLocale` до «як прийшло, так і взяли» (`return candidate`)
 *    — червоніє випадок `en-US`;
 *  - прибрати виклик `applyDocumentLanguage(initialLocale)` зі старту
 *    `index.ts` — червоніє останній тест файлу.
 *
 * Останній тест читає ДЖЕРЕЛО, а не поведінку, і це не ліньки: `index.ts`
 * імпортує `$app/environment`, якого в цьому раннері не існує (у
 * `vitest.config.ts` стоїть плагін `svelte`, не `sveltekit()`), тож завантажити
 * модуль і подивитися на результат тут неможливо в принципі. Перевірка джерела
 * ловить рівно той регрес, який стався: виклик на старті прибрали, і атрибут
 * лишився таким, як в `app.html`.
 */

describe('resolveLocale', () => {
	it('лишає мову, яка в проєкті є', () => {
		for (const locale of SUPPORTED_LOCALES) {
			expect(resolveLocale(locale)).toBe(locale);
		}
	});

	it('зводить регіональний тег до мови: en-US — це англійська', () => {
		// Саме це віддає `getLocaleFromNavigator()` у більшості браузерів.
		expect(resolveLocale('en-US')).toBe('en');
		expect(resolveLocale('uk-UA')).toBe('uk');
	});

	it('не зважає на регістр і на підкреслення', () => {
		expect(resolveLocale('EN_us')).toBe('en');
	});

	it('невідому мову зводить до типової, а не лишає як є', () => {
		// Інакше `$locale === 'de'` дало б інтерфейс без жодного активного
		// перемикача й словник із fallback — тобто розходження стану й вигляду.
		expect(resolveLocale('de')).toBe(DEFAULT_LOCALE);
		expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
		expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
		expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
	});
});

describe('<html lang>', () => {
	beforeEach(() => {
		document.documentElement.lang = 'uk';
	});

	it('оголошує ту мову, якою сторінку видно', () => {
		applyDocumentLanguage('en');
		expect(document.documentElement.lang).toBe('en');
	});

	it('повертається назад разом із мовою', () => {
		applyDocumentLanguage('en');
		applyDocumentLanguage('uk');
		expect(document.documentElement.lang).toBe('uk');
	});
});

describe('мова виставляється на старті, а не лише на зміні', () => {
	it('index.ts кличе applyDocumentLanguage початковою мовою', () => {
		const source = readFileSync(join(process.cwd(), 'src/lib/i18n/index.ts'), 'utf8');
		// Без цього рядка `<html lang>` лишається тим, що в `app.html`, тобто `uk`,
		// і англійська сторінка оголошує себе українською при кожному заході.
		expect(source).toMatch(/applyDocumentLanguage\(initialLocale\)/);
	});
});
