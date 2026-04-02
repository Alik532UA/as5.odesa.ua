import { register, init, getLocaleFromNavigator, locale } from 'svelte-i18n';
import { browser } from '$app/environment';

register('uk', () => import('./locales/uk.json'));
register('en', () => import('./locales/en.json'));

let initialLocale = 'uk';
if (browser) {
	const savedLocale = window.localStorage.getItem('lang');
	initialLocale = savedLocale || getLocaleFromNavigator() || 'uk';
}

init({
	fallbackLocale: 'uk',
	initialLocale,
});

if (browser) {
	locale.subscribe((newLocale) => {
		if (newLocale) {
			window.localStorage.setItem('lang', newLocale);
			document.documentElement.lang = newLocale;
		}
	});
}
