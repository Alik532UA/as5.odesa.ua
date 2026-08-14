import type { RequestHandler } from './$types';
import { SITE_ROOT } from '$lib/config/site';

/**
 * `robots.txt` рекламує цю адресу, а в `build/` файлу не було.
 *
 * Дві причини, обидві невидимі в джерелах:
 *
 * 1. Ендпоїнт без `prerender = true` при `adapter-static` не потрапляє у вивід
 *    узагалі — серверного рантайму на GitHub Pages немає, віддавати його нема
 *    кому.
 * 2. `prerender.crawl` знаходить лише те, на що є посилання зі сторінок.
 *    `robots.txt` — статичний файл, краулер його не читає, тож `/sitemap.xml`
 *    не досяжний ні звідки. Тому адреса додана в `prerender.entries`
 *    (`svelte.config.js`) явно.
 *
 * Наслідок був такий: пошуковик читав `robots.txt`, йшов за sitemap і отримував
 * SPA-оболонку `404.html`. `scripts/check-build.mjs` тепер падає, якщо файл
 * знову зникне.
 */
export const prerender = true;

/** Адреси від кореня сайту — базу додає `SITE_ROOT`. */
const ROUTES = ['/', '/about', '/history', '/competitions', '/admission'];

export const GET: RequestHandler = async () => {
	// Дата збірки, а не дата запиту: під час prerender запит один, і всі
	// сторінки однаково отримують момент збірки. Це чесніше за `now` у
	// рантаймі, якого тут не буде.
	const lastmod = new Date().toISOString();

	const urls = ROUTES.map((route) => {
		// SITE_ROOT уже закінчується без слеша, а '/' дав би подвійний.
		const loc = route === '/' ? `${SITE_ROOT}/` : `${SITE_ROOT}${route}`;
		const priority = route === '/' ? '1.0' : '0.8';
		const changefreq = route === '/' ? 'weekly' : 'monthly';

		return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
	}).join('');

	const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
};
