import { register, init, getLocaleFromNavigator, locale as i18nLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import { storage } from '$lib/services/storage';
import { DEFAULT_LOCALE, applyDocumentLanguage, matchLocale, resolveLocale } from './locale';

register('uk', () => import('./locales/uk.json'));
register('en', () => import('./locales/en.json'));

/**
 * МОВА З АДРЕСИ — `?lang=`, і це свідоме відхилення від I18N-v8 § 3.1.
 *
 * Сусідні сайти автора (таблиця — `src/lib/siblings.ts`, той самий файл у восьми
 * репозиторіях) передають мову, якою відвідувач читав ТАМ: перехід між сайтами
 * однієї мережі не мусить скидати обрану мову. Де мова живе в шляху, її називає
 * шлях, як канон і приписує; тут мовного сегмента немає взагалі, тож параметр —
 * єдина ручка в адресі, яка існує.
 *
 * `matchLocale`, а не `resolveLocale`: невідомий тег має означати «адреса мови не
 * називала», а не «українська». Інакше чужий `?lang=fr` в адресі скидав би
 * збережений вибір відвідувача на типову мову.
 */
function localeFromUrl(): string | null {
	return browser ? matchLocale(new URLSearchParams(window.location.search).get('lang')) : null;
}

/*
 * Зведення до підтримуваної мови — не косметика: `$locale` читає півпроєкту,
 * і сирий тег браузера (`en-US`) розходився з усіма порівняннями (`./locale.ts`).
 *
 * Порядок джерел: адреса → збережений вибір → мова браузера. Адреса перша, бо
 * вона єдина каже щось про ЦЕЙ перехід, а не про попередні візити.
 */
let initialLocale: string = DEFAULT_LOCALE;
if (browser) {
	initialLocale = resolveLocale(localeFromUrl() ?? storage.get('lang') ?? getLocaleFromNavigator());
}

init({
	fallbackLocale: DEFAULT_LOCALE,
	initialLocale
});

let currentLocale = initialLocale;

if (browser) {
	// На СТАРТІ теж, а не лише на зміні: підписка нижче віддає перше значення
	// рівним `currentLocale`, тож ця гілка — єдина, що працює для того, хто
	// повернувся на сайт з уже обраною мовою.
	applyDocumentLanguage(initialLocale);

	/*
	 * Мова з адреси НЕ потрапляє у сховище, і це навмисно.
	 *
	 * Підписка пише лише тоді, коли значення відрізняється від `currentLocale`, а
	 * той дорівнює `initialLocale` — тобто перший (початковий) виклик мовчить, і
	 * записує лише СВІДОМИЙ перемикач. Прихід із сусіднього сайту показує його
	 * мову на цей візит; наступний прямий захід вертає власний вибір відвідувача.
	 *
	 * Тут це вдається, бо мову, яку видно, тримає `$locale`, а сховище — окремо.
	 * У сусідніх `MindStep` і `Slovko` місце одне на двох, і там вхідна мова
	 * таки зберігається; різниця записана в їхніх PROJECT-CONTEXT.
	 */
	i18nLocale.subscribe((newLocale) => {
		if (newLocale && newLocale !== currentLocale) {
			currentLocale = newLocale;
			storage.set('lang', newLocale);
			applyDocumentLanguage(newLocale);
		}
	});
}

// Export locale as a named export for convenience
export { i18nLocale as locale };
