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
 * ПЕРЕЇЗД НА ВЛАСНИЙ ДОМЕН (2026-08-15). Доти тут стояв
 * `https://alik532ua.github.io`, а `paths.base` дорівнював `/as5.odesa.ua`:
 * код вважав сайт project page акаунта. Домен `as5.odesa.ua` був куплений і
 * налаштований у Pages, але код за ним не пішов.
 *
 * Ціна розходження була не теоретичною. Зібраний CSS просив шрифт за
 * `/as5.odesa.ua/fonts/e-Ukraine-Regular.woff2` — на власному домені це
 * `as5.odesa.ua/as5.odesa.ua/fonts/…`, тобто 404. Сайт за основною адресою
 * показувався системними шрифтами, і в коді цього не видно ніяк: шлях
 * складається з бази, а база була «правильна» для запасної адреси.
 * Побачити можна було лише в `build/` або в мережевій панелі браузера.
 *
 * Змінено рівно дві речі, і разом — саме так, як описував попередній варіант
 * цього коментаря: `SITE_ORIGIN` тут і `paths.base` у `svelte.config.js` → `''`.
 * Формули нижче лишилися без правок: вони й писалися так, щоб пережити переїзд.
 *
 * `static/CNAME` НЕ потрібен: деплой іде офіційним `actions/deploy-pages`,
 * який зберігає прив'язку домену з налаштувань Pages. Перевірено на сусідньому
 * teatralo4ka.odesa.ua — власний домен, база '', CNAME немає ніде.
 *
 * `alik532ua.github.io/as5.odesa.ua/` лишається робочою запасною адресою, але
 * canonical веде на основну — інакше пошуковик тримає в індексі два дублі.
 */
export const SITE_ORIGIN = 'https://as5.odesa.ua';

/** Корінь сайту: база порожня, тож це той самий origin. */
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
