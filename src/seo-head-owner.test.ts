// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GATE-HEAD-OWNER — у кожного тега `<head>` рівно один власник
 * (SEO-v9 § 4.4, `SEO-HEAD-SINGLE-OWNER`, рівень HIGH).
 *
 * ## Чому інваріант по ДЖЕРЕЛАХ, коли є гейт над `build/`
 *
 * `<svelte:head>` дописує в `<head>`, а не заміщує його, тож два власники
 * одного тега дають два теги в документі — це `check:build` тепер і ловить.
 * Але рівно для `<title>` він сліпий за визначенням: Svelte із двох `<title>`
 * лишає в зібраному HTML один. Дефекту в `build/` не видно ВЗАГАЛІ.
 *
 * Саме так тут і було, і саме тому потрібні обидві перевірки:
 *
 *  - `/beta-test-checklists` ставив власний `<title>{$t('beta.title')}</title>`,
 *    а макет поруч ставив свій. У HTML лишався один — сторінковий, — тобто
 *    `<title>` казав «Чеклист бета-тестування», а `og:title` того самого
 *    документа — «Одеська школа мистецтв №5»: макет брав ключ `home`, бо
 *    службові маршрути падали в `default` карти ключів;
 *  - `+error.svelte` ставив `<meta name="robots" content="noindex">` поруч із
 *    `index, follow…` від макета. Тут дублікат у DOM був — але на сторінці, якої
 *    у `build/` немає: `404.html` — порожня SPA-оболонка.
 *
 * ## Що перевіряється
 *
 * 1. Власник — рівно `+layout.svelte`. Жоден інший файл маршрутів не пише тег
 *    зі списку нижче.
 * 2. Кожен HTML-маршрут має власний ключ SEO. Без цього нова сторінка тихо
 *    успадковує заголовок і опис ГОЛОВНОЇ — це вже траплялося двічі: спершу
 *    через базу в `pathname` (жоден `case` не збігався), потім через
 *    `default: 'home'` для службових маршрутів.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: повернути `<svelte:head><title>` у
 * `beta-test-checklists/+page.svelte` — червоніє перший інваріант із назвою
 * файлу й тега; прибрати `case '/test'` із `routeToSeoKey` — червоніє другий,
 * називаючи саме `/test`.
 */

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const LAYOUT = 'src/routes/+layout.svelte';
const layoutSource = read(LAYOUT);

/** Усі `.svelte` під `src/routes` — сторінки, макети, сторінка помилки. */
function routeSources(dir = 'src/routes', out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) routeSources(rel, out);
		else if (entry.endsWith('.svelte')) out.push(rel);
	}
	return out;
}

/**
 * Теги, власником яких у цьому проєкті є макет.
 *
 * Перелік свідомо той самий, що в `scripts/check-build.mjs`: одна вимога, дві
 * половини перевірки — над джерелами й над зібраним HTML.
 */
const OWNED: Array<[string, RegExp]> = [
	['<title>', /<title[\s>]/],
	['<meta name="description">', /<meta[^>]+name=["']description["']/],
	['<meta name="robots">', /<meta[^>]+name=["']robots["']/],
	['<link rel="canonical">', /<link[^>]+rel=["']canonical["']/],
	['<meta property="og:*">', /<meta[^>]+property=["']og:/],
	['<meta name="twitter:*">', /<meta[^>]+name=["']twitter:/],
	['<script type="application/ld+json">', /ld\+json/]
];

describe('GATE-HEAD-OWNER: тег <head> має одного власника (SEO-v9 § 4.4)', () => {
	const sources = routeSources();

	it('перевірка жива: макет знайдено, і він справді пише теги', () => {
		expect(sources, 'жодного .svelte під src/routes — перевірка міряла б порожнечу').toContain(
			LAYOUT
		);
		const written = OWNED.filter(([, re]) => re.test(layoutSource)).map(([what]) => what);
		expect(written, 'макет не пише жодного тега зі списку — список застарів').toHaveLength(
			OWNED.length
		);
	});

	it('жоден файл маршрутів, крім макета, не пише тег зі списку', () => {
		const offenders: string[] = [];
		for (const file of sources) {
			if (file === LAYOUT) continue;
			const source = read(file);
			// Розмітка без коментарів: у цих файлах саме в коментарях і записано,
			// ЧОМУ тега тут більше немає, і назви тегів там згадуються дослівно.
			const markup = source.replace(/<!--[\s\S]*?-->/g, '');
			if (!/<svelte:head/.test(markup)) continue;
			for (const [what, re] of OWNED) {
				if (re.test(markup)) offenders.push(`${file}: ${what}`);
			}
		}
		expect(
			offenders,
			'тег пише і макет, і сторінка — у документі їх буде два (а `<title>` ' +
				'Svelte лишить один, і який саме, з джерел не видно):\n' +
				offenders.join('\n')
		).toEqual([]);
	});

	it('кожен HTML-маршрут має власний ключ SEO, а не успадковує головну', () => {
		// Ключі беруться з тієї самої карти, якою користується макет: другий
		// перелік розійшовся б із першим саме тоді, коли з'явиться новий маршрут.
		const mapped = new Set(
			[...layoutSource.matchAll(/case '([^']+)':\s*\n\s*return '([^']+)';/g)].map((m) => m[1])
		);
		expect(mapped.size, 'карта `routeToSeoKey` не розібрана — змінилася її форма').toBeGreaterThan(
			0
		);

		const routes = readdirSync(join(ROOT, 'src/routes'), { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && !entry.name.includes('.'))
			.map((entry) => `/${entry.name}`);
		expect(routes.length, 'маршрутів не знайдено — перевірка міряла б порожнечу').toBeGreaterThan(
			0
		);

		const missing = [...routes, '/'].filter((route) => !mapped.has(route));
		expect(
			missing,
			'маршрут без власного ключа SEO падає в `default` і оголошує заголовок ' +
				'та опис ГОЛОВНОЇ сторінки:\n' + missing.join('\n')
		).toEqual([]);
	});
});
