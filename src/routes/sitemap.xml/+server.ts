import type { RequestHandler } from './$types';

const SITE_URL = 'https://as5.odesa.ua';

const routes = ['/', '/about', '/history', '/competitions', '/admission'];

export const GET: RequestHandler = async () => {
	const now = new Date().toISOString();

	const urls = routes
		.map((route) => {
			const loc = `${SITE_URL}${route}`;
			const priority = route === '/' ? '1.0' : '0.8';
			const changefreq = route === '/' ? 'weekly' : 'monthly';

			return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
		})
		.join('');

	const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
};
