import { resolve } from '$app/paths';

/**
 * Пункти головного меню: дані, а не розмітка (PROJECT-STRUCTURE-v8 § 4.1).
 *
 * ## Чому `key` і `routeId` окремі поля, а не виведені з адреси
 *
 * Доти пункти жили масивом усередині `HeaderSection.svelte`, а локатор і
 * підсвітка активного пункта виводилися з РЯДКА адреси:
 *
 *     data-testid="nav-{item.href.replace('/', '') || 'home'}-link"
 *     class:active={page.url.pathname === item.href}
 *
 * Обидва спиралися на припущення, що `href` — це `/about`. Він ним не є.
 * `paths.relative` у SvelteKit типово `true`, тож під час prerender і `base`,
 * і `resolve()` віддають ВІДНОСНИЙ префікс. У `build/about.html` виходило:
 *
 *     id="nav-."  data-testid="nav-.about-link"
 *
 * і жодного `active` на жодній сторінці, бо `/about` ніколи не дорівнює
 * `./about`. Після гідратації значення ставали правильними — саме тому дефект
 * і був невидимий: у браузері з відкритим DevTools усе виглядало як слід.
 * Неправильним лишався зібраний HTML, тобто те, що бачить пошуковик, читалка
 * до гідратації й перший кадр у відвідувача.
 *
 * `routeId` замість `pathname` — той самий висновок, що вже записаний у
 * `+layout.svelte` для SEO-ключів: `route.id` не містить бази, якою б вона не
 * була, і не має кінцевого слеша. `key` — стабільний сегмент для `id` та
 * `data-testid`: він не залежить ні від бази, ні від мови.
 *
 * Підписи тут не лежать навмисно: вони мовні, а мова змінюється в браузері.
 * У конфізі — ключ словника, `$t` над ним викликає компонент.
 */
export interface NavItem {
	/** Стабільний сегмент для `id` та `data-testid`. Не залежить від адреси. */
	key: string;
	/** `route.id` сторінки — ним і тільки ним визначається активний пункт. */
	routeId: '/' | '/about' | '/history' | '/competitions';
	/** Ключ у словнику; переклад бере компонент. */
	labelKey: string;
	/** Готова адреса. `resolve()` типізований проти реальних маршрутів. */
	href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
	{ key: 'home', routeId: '/', labelKey: 'nav.home', href: resolve('/') },
	{ key: 'about', routeId: '/about', labelKey: 'nav.about', href: resolve('/about') },
	{ key: 'history', routeId: '/history', labelKey: 'nav.history', href: resolve('/history') },
	{
		key: 'competitions',
		routeId: '/competitions',
		labelKey: 'nav.contests',
		href: resolve('/competitions')
	}
];
