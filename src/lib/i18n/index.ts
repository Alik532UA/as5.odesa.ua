import { register, init, getLocaleFromNavigator, locale as i18nLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import { storage } from '$lib/services/storage';
import { DEFAULT_LOCALE, applyDocumentLanguage, resolveLocale } from './locale';

register('uk', () => import('./locales/uk.json'));
register('en', () => import('./locales/en.json'));

// Зведення до підтримуваної мови — не косметика: `$locale` читає півпроєкту,
// і сирий тег браузера (`en-US`) розходився з усіма порівняннями (`./locale.ts`).
let initialLocale: string = DEFAULT_LOCALE;
if (browser) {
	initialLocale = resolveLocale(storage.get('lang') ?? getLocaleFromNavigator());
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
