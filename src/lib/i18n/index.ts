import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
import { browser } from '$app/environment';

register('uk', () => import('./locales/uk.json'));
register('en', () => import('./locales/en.json'));

init({
	fallbackLocale: 'uk',
	initialLocale: browser ? getLocaleFromNavigator() : 'uk',
});
