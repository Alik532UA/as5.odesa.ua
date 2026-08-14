import { describe, it, expect } from 'vitest';
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
});
