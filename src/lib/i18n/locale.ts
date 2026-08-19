/**
 * Мова як дані: перелік, зведення до підтримуваної та `<html lang>`.
 *
 * **Чому окремим модулем, а не в `index.ts` поруч із `init()`.** Той файл
 * імпортує `$app/environment`, а його в юніт-тестах не існує: у
 * `vitest.config.ts` стоїть лише плагін `svelte`, не `sveltekit()`, тож
 * будь-який тест, що торкнувся б `index.ts`, падає ще на розборі імпортів.
 * Тобто вся логіка вибору мови була б неперевірною там, де вона й помилялася
 * (CODE-QUALITY-v8 § 3.1: логіка виноситься з місця, де її не запустити).
 */

/** Мови, словники яких у проєкті справді є. Типова — першою. */
export const SUPPORTED_LOCALES = ['uk', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'uk';

/**
 * Зводить будь-який мовний тег до тієї мови, словник якої тут є.
 *
 * **Навіщо, якщо `svelte-i18n` і сам має fallback.** Він підбирає СЛОВНИК за
 * ланцюжком (`en-US` → `en`), але `$locale` лишає рівно тим рядком, який йому
 * дали. А `$locale` читає півпроєкту: `ServiceLayer` вирішує, куди перемикати
 * клавішею `L`; шапка підсвічує активну кнопку через `$locale === 'en'`;
 * `+layout.svelte` обирає мову мета-тегів. Браузер, який каже `en-US`, давав
 * інтерфейс англійською, жодної підсвіченої кнопки в перемикачі мов і
 * УКРАЇНСЬКІ мета-теги на англійській сторінці.
 *
 * Регістр і роздільник зводяться теж: `EN_us` — валідний тег, і порівняння з
 * `'en'` його не бачило б.
 */
export function resolveLocale(candidate: string | null | undefined): SupportedLocale {
	if (!candidate) return DEFAULT_LOCALE;
	const primary = candidate.toLowerCase().replace(/_/g, '-').split('-')[0];
	return (SUPPORTED_LOCALES as readonly string[]).includes(primary)
		? (primary as SupportedLocale)
		: DEFAULT_LOCALE;
}

/**
 * `<html lang>` мусить відповідати мові, якою сторінку ВИДНО (I18N-v8 § 5.2,
 * ACCESSIBILITY-v8 § 10.4): за цим атрибутом читалка обирає голос і правила
 * вимови, а пошуковик — мову сторінки.
 *
 * Функція, а не рядок усередині підписки: атрибут треба виставити ще й на
 * СТАРТІ, а не лише на зміні. Доти цього не було, і наслідок бачив кожен, хто
 * колись обрав англійську: `app.html` віддає `lang="uk"` (сторінки
 * pre-render'яться українською), підписка на першому значенні виходила по
 * `newLocale !== currentLocale`, і англійська сторінка оголошувала себе
 * українською при КОЖНОМУ наступному заході. Перемикання мови туди-й-назад це
 * «лікувало» — саме тому дефект не трапляється, коли його шукають руками.
 */
export function applyDocumentLanguage(lang: string): void {
	if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
