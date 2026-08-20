/**
 * Генерація `build/sitemap.xml` (SEO-v8 § 5). Запускається ПІСЛЯ `vite build`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = 'build';

if (!existsSync(BUILD)) {
	console.error('generate-sitemap: build/ не існує');
	process.exit(0);
}

function htmlFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) htmlFiles(full, out);
		else if (entry === 'index.html' || entry.endsWith('.html')) out.push(full.replace(/\\/g, '/'));
	}
	return out;
}

const pages = [];
for (const file of htmlFiles(BUILD)) {
	if (file.endsWith('404.html')) continue;
	const html = readFileSync(file, 'utf8');
	const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
	if (!canonical) continue;

	const alternates = [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"/g)]
		.map((m) => ({ lang: m[1], href: m[2] }))
		.filter((alt) => alt.lang !== 'x-default');

	const isHome = canonical === 'https://as5.odesa.ua/' || canonical === 'https://as5.odesa.ua/uk/';
	pages.push({ canonical, alternates, isHome });
}

if (pages.length === 0) {
	console.log('generate-sitemap: немає сторінок з canonical');
} else {
	pages.sort((a, b) => a.canonical.localeCompare(b.canonical));

	const urls = pages
		.map(({ canonical, alternates, isHome }) => {
			const links = alternates
				.map((alt) => `\t\t<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`)
				.join('\n');
			const priority = isHome ? '1.0' : '0.8';
			return `\t<url>\n\t\t<loc>${canonical}</loc>\n${links ? links + '\n' : ''}\t\t<priority>${priority}</priority>\n\t</url>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

	writeFileSync(join(BUILD, 'sitemap.xml'), xml);
	console.log(`generate-sitemap: ${pages.length} адрес записано в ${BUILD}/sitemap.xml`);
}
