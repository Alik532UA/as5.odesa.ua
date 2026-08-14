import { base } from '$app/paths';

/**
 * Єдине джерело публічної адреси сайту (SEO-v8 § 1).
 *
 * До появи цього файлу origin був продубльований у чотирьох місцях
 * (`+layout.ts`, `+layout.svelte` двічі, `sitemap.xml/+server.ts`) і в кожному
 * складався з `pathname` по-своєму. Результат був видно лише в `build/`:
 *
 *     <link rel="canonical" href="https://as5.odesa.ua/as5.odesa.ua/about"/>
 *
 * `paths.base` тут дорівнює `/as5.odesa.ua`, тобто `url.pathname` УЖЕ містить
 * базу. Origin `https://as5.odesa.ua` додавав її вдруге — і кожна сторінка
 * оголошувала canonical на адресу, якої не існує. Зворотний бік тієї самої
 * помилки: `og:image` збирався як `origin + '/og/...'` БЕЗ бази, тобто теж
 * вказував не туди.
 *
 * ЧОМУ ORIGIN САМЕ ТАКИЙ. Сайт живе на GitHub Pages як project page акаунта:
 * `paths.base` виставлено в `/as5.odesa.ua`, файлу `static/CNAME` немає, а
 * `global.css` зашиває шляхи до шрифтів як `/as5.odesa.ua/fonts/...`. За
 * власним доменом ці шляхи давали б 404. Сусідній проєкт (CV) у своєму
 * `scripts/check-build.mjs` користується тим самим origin.
 *
 * ЯК ПЕРЕЇХАТИ НА ВЛАСНИЙ ДОМЕН. Змінюються рівно дві речі, і разом:
 * `SITE_ORIGIN` тут → `https://as5.odesa.ua`, `paths.base` у
 * `svelte.config.js` → `''`. Плюс `static/CNAME`. Формули нижче лишаються
 * правильними в обох випадках — саме тому вони тут, а не по місцях виклику.
 */
export const SITE_ORIGIN = 'https://alik532ua.github.io';

/** Корінь сайту з базою: `https://alik532ua.github.io/as5.odesa.ua`. */
export const SITE_ROOT = `${SITE_ORIGIN}${base}`;

/**
 * Канонічна адреса сторінки з її `url.pathname`.
 *
 * `pathname` уже містить базу — саме тому тут `SITE_ORIGIN`, а не `SITE_ROOT`.
 */
export function canonicalUrl(pathname: string): string {
	return `${SITE_ORIGIN}${pathname}`;
}

/**
 * Абсолютна адреса файлу зі `static/`.
 *
 * Приймає шлях від кореня сайту (`/og/og-default-1200x630.jpg`) — тобто такий,
 * яким його бачить відвідувач, без бази. Базу додає сама функція.
 */
export function assetUrl(path: string): string {
	return `${SITE_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
}
