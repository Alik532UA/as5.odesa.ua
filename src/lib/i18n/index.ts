import { register, init, getLocaleFromNavigator, locale as i18nLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import { ui } from '$lib/states/ui.svelte';
import { storage } from '$lib/services/storage';

register('uk', () => import('./locales/uk.json'));
register('en', () => import('./locales/en.json'));

let initialLocale = 'uk';
if (browser) {
	const savedLocale = storage.get('lang');
	initialLocale = savedLocale || getLocaleFromNavigator() || 'uk';
}

init({
	fallbackLocale: 'uk',
	initialLocale,
});

let currentLocale = initialLocale;

if (browser) {
	i18nLocale.subscribe((newLocale) => {
		if (newLocale && newLocale !== currentLocale) {
			currentLocale = newLocale;
			storage.set('lang', newLocale);
			document.documentElement.lang = newLocale;
		}
	});
}

// Export locale as a named export for convenience
export { i18nLocale as locale };
