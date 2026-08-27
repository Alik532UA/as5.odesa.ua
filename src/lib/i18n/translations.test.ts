import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import en from './locales/en.json';
import uk from './locales/uk.json';

/**
 * Інваріант паритету ключів словників (I18N-v8 § 7.1).
 *
 * Словники тут — JSON, тобто TypeScript їх не зіставляє: у CV і
 * DigitalWorkshop локалі оголошені як `const x: Translations`, і забутий ключ
 * там ловить `svelte-check`. Тут такого захисту немає — забутий ключ у `uk`
 * означав би, що відвідувач бачить `about.mission` замість тексту, і дізнатися
 * про це можна було б лише випадково, зайшовши на потрібну сторінку потрібною
 * мовою.
 *
 * Наявність ключа перевіряється разом із непорожністю значення: `""` для
 * `svelte-i18n` — валідний переклад, а для читача — порожнє місце.
 */

type Dict = Record<string, unknown>;

/** Плоскі шляхи всіх листків: `about.title`, `nav.items.0`. */
function flatten(value: unknown, prefix = ''): string[] {
	if (value === null || typeof value !== 'object') return [prefix];
	return Object.entries(value as Dict).flatMap(([key, child]) =>
		flatten(child, prefix ? `${prefix}.${key}` : key)
	);
}

function leafValues(value: unknown, prefix = ''): [string, unknown][] {
	if (value === null || typeof value !== 'object') return [[prefix, value]];
	return Object.entries(value as Dict).flatMap(([key, child]) =>
		leafValues(child, prefix ? `${prefix}.${key}` : key)
	);
}

const LOCALES = { en, uk } as Record<string, unknown>;
const REFERENCE = 'uk';

describe('словники i18n', () => {
	const referenceKeys = flatten(LOCALES[REFERENCE]).sort();

	it('еталонна мова не порожня', () => {
		expect(referenceKeys.length).toBeGreaterThan(50);
	});

	for (const locale of Object.keys(LOCALES).filter((l) => l !== REFERENCE)) {
		it(`«${locale}» має рівно ті самі ключі, що «${REFERENCE}»`, () => {
			const keys = flatten(LOCALES[locale]).sort();
			const missing = referenceKeys.filter((k) => !keys.includes(k));
			const extra = keys.filter((k) => !referenceKeys.includes(k));
			// Обидва напрямки: зайвий ключ — це або опечатка, або мертвий
			// переклад, і те й те варте уваги так само, як забутий.
			expect({ missing, extra }).toEqual({ missing: [], extra: [] });
		});
	}

	for (const locale of Object.keys(LOCALES)) {
		it(`«${locale}» не має порожніх значень`, () => {
			const empty = leafValues(LOCALES[locale])
				.filter(([, v]) => typeof v === 'string' && v.trim() === '')
				.map(([k]) => k);
			expect(empty).toEqual([]);
		});
	}

	/**
	 * Ключ, якого не читає ніхто (PROJECT-STRUCTURE-v8 § 4.3: «те саме стосується
	 * ключів локалізації: наявність ≠ використання»).
	 *
	 * Паритет вище звіряє словники ОДИН З ОДНИМ, тобто мертвий переклад, охайно
	 * доданий в обидві мови, проходив його завжди. Заміряно 2026-08-28: чотири
	 * такі ключі — пункт меню «Оголошення», якого немає в маршрутах, і три
	 * підписи випадайки налаштувань, замінені іншими. Кожен виглядав як
	 * готова функція: у словнику лежить і переклад, і англійська пара.
	 *
	 * Ключ вважається живим, якщо в джерелах є літерал із його повним шляхом
	 * АБО зі шляхом предка. Друга умова обов'язкова через дві форми, що інакше
	 * давали б хибні знахідки:
	 *
	 *   $t(`piano.notes.${key.note}`)   — динамічний хвіст
	 *   $json('competitions.l2')        — читається цілий вузол
	 *
	 * Без неї перша ж редакція оголосила б сиротами чотири `competitions.l2.*`,
	 * які насправді читаються цілим об'єктом.
	 *
	 * ## Дві помилки цієї перевірки, знайдені зворотним експериментом
	 *
	 * Обидві робили її зеленою на всіх чотирьох сиротах, тобто рівно
	 * марною — і жодна не була б помітна без спроби перевірити, що вона ловить.
	 *
	 * *Предок з одного сегмента.* Умова «згадано предка» приймала й `settings`
	 * — а такий літерал є в кожному другому файлі. Тому предок рахується від
	 * ДВОХ сегментів (`competitions.l2`); один сегмент — це слово, а не шлях.
	 *
	 * *Перевірка знаходила саму себе.* Джерела — це весь `src/`, разом із
	 * файлами перевірок; `settings` у backticks у ЦЬОМУ докблоці й `"nav"` у
	 * переліку `testid-conventions.test.ts` рахувалися згадками. Тому
	 * `*.test.ts` з пошуку виключені: ключ, який називає лише тест, для
	 * застосунку все одно сирота.
	 */
	it('кожен ключ словника хтось читає', () => {
		const root = resolve(__dirname, '../../..');
		const sources: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(join(root, dir))) {
				const rel = `${dir}/${entry}`;
				if (statSync(join(root, rel)).isDirectory()) walk(rel);
				else if (
					/\.(svelte|ts)$/.test(entry) &&
					!entry.endsWith('.test.ts') &&
					!rel.includes('/i18n/locales/')
				) {
					sources.push(rel);
				}
			}
		};
		walk('src');

		const code = sources.map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
		expect(code.length, 'джерела не прочиталися — усе виглядало б живим').toBeGreaterThan(10_000);

		/**
		 * Літерал ЗАКІНЧУЄТЬСЯ цим шляхом (`'settings.blur'`) або продовжується
		 * підстановкою (`` `piano.notes.${…}` ``). Перша редакція перевіряла
		 * просто «рядок починається з шляху» — і на предку `settings` збігалася
		 * з будь-яким `'settings.dynamicBg'`, тобто оголошувала живими всі
		 * ключі гілки. Перевірка була зелена й не бачила жодної з чотирьох сиріт.
		 */
		const mentions = (path: string) => {
			const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			return new RegExp(`['"\`]${escaped}(?:['"\`]|\\.\\$\\{)`).test(code);
		};

		const orphans = referenceKeys.filter((key) => {
			const parts = key.split('.');
			// Від повного шляху вниз до ДВОХ сегментів: один — це слово, а не шлях.
			for (let i = parts.length; i >= 2; i--) {
				if (mentions(parts.slice(0, i).join('.'))) return false;
			}
			// Динамічний хвіст одразу від кореня: `` `nav.${key}` ``.
			return !new RegExp('`' + parts[0] + '\\.\\$\\{').test(code);
		});

		expect(
			orphans,
			`ключ у словнику є, а читати його нікому — підключити або прибрати:\n${orphans.join('\n')}`
		).toEqual([]);
	});
});
