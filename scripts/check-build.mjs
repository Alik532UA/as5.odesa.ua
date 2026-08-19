/**
 * Перевірка ЗІБРАНОГО сайту (SEO-v8 § 6.1, SVELTEKIT-DATA-v8 § 6.1).
 *
 * Усе тут читає `build/`, а не `src/`, і в цьому сенс: обидва дефекти, через
 * які цей файл з'явився, у джерелах виглядали правильно.
 *
 *  - `canonical` збирався як origin + `url.pathname`, а `pathname` уже містить
 *    `paths.base`. Кожна сторінка оголошувала адресу
 *    `https://as5.odesa.ua/as5.odesa.ua/about`, якої не існує;
 *  - `robots.txt` рекламував `sitemap.xml`, якого збірка не створювала:
 *    ендпоїнт без `prerender` при adapter-static не потрапляє у вивід, а
 *    краулер його не знаходить, бо на нього ніхто не посилається.
 *
 * Запускається після `npm run build` (`npm run check:build`). Вихід ≠ 0 —
 * помилка збірки.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = 'build';

/**
 * Origin і база ЧИТАЮТЬСЯ з джерел істини, а не дублюються тут.
 *
 * Доти обидва були вписані константами з приміткою «мусить збігатися з…». При
 * переїзді на власний домен 2026-08-15 вони не збіглися: код уже віддавав
 * `https://as5.odesa.ua/…`, а гейт іще чекав `alik532ua.github.io` — і оголосив
 * кожну адресу сайту чужою. Тобто перевірка, написана проти розходження, сама
 * стала його жертвою.
 *
 * Регулярка навмисно строга: якщо значення не знайдено, скрипт падає з
 * поясненням, а не мовчки бере порожній рядок і пропускає геть усе.
 */
function readConst(file, re, what) {
	const m = re.exec(readFileSync(file, 'utf8'));
	if (!m) {
		console.error(`check-build: не знайдено ${what} у ${file}. Гейт зупинено — без цього він перевіряв би не те.`);
		process.exit(1);
	}
	return m[1];
}

/** Те саме для масиву рядкових літералів. Порожній список — помилка, не «нічого». */
function readList(file, re, what) {
	const m = re.exec(readFileSync(file, 'utf8'));
	if (!m) {
		console.error(`check-build: не знайдено ${what} у ${file}. Гейт зупинено — без цього він перевіряв би не те.`);
		process.exit(1);
	}
	const items = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
	if (items.length === 0) {
		console.error(`check-build: ${what} у ${file} порожній — перевірка службових сторінок була б мертвою.`);
		process.exit(1);
	}
	return items;
}

const SITE_ORIGIN = readConst(
	'src/lib/config/site.ts',
	/export const SITE_ORIGIN\s*=\s*['"]([^'"]+)['"]/,
	'SITE_ORIGIN'
);
const BASE = readConst('svelte.config.js', /base:\s*['"]([^'"]*)['"]/, 'paths.base');
const SITE_ROOT = `${SITE_ORIGIN}${BASE}`;

/** Сторінки, які зобов'язані бути в збірці. Порожній список = мертва перевірка. */
const REQUIRED_PAGES = ['index.html', 'about.html', 'history.html', 'competitions.html', 'admission.html'];

/** Мінімум видимого тексту. Порожнє тіло в індексі — AI-AGENT-PITFALLS § 2. */
const MIN_BODY_TEXT = 200;

/**
 * Блоки вмісту, які зобовʼязані бути в PRERENDERED HTML (SEO-v8 § 1.1).
 *
 * `MIN_BODY_TEXT` вище ловить порожню сторінку, і не ловить сторінку, у якої
 * зник ОДИН блок: тексту лишається вдосталь, і гейт мовчить. Саме так і
 * сталося: секція відділів стояла під `{#if showDepartments}`, який вмикався
 * лише після `onMount` + IntersectionObserver. Ні того, ні іншого під час
 * prerender не буває, тож у `build/index.html` замість шести відділів школи
 * лежав рядок «Завантаження...» — а решта сторінки була на місці, і всі
 * перевірки лишалися зеленими.
 *
 * Клас дефекту загальний: вміст, схований за клієнтським прапорцем, для
 * індексу не існує. Тому перевіряється якір, який ставить сама секція, а не
 * її текст — текст міняється, `data-testid` живе за конвенцією
 * (TESTID-AND-NAMING-v8).
 */
const REQUIRED_CONTENT = {
	// Лише те, що справді перевірено в `build/`. Список із вигаданих якорів
	// зробив би гейт червоним від народження — і його вимкнули б цілком.
	'index.html': ['departments-section', 'department-card-piano', 'gallery-bento']
};

/**
 * Службові сторінки: prerender-яться, але в індексі їм не місце (SEO-v8 § 4.3,
 * BETA-CHECKLIST-v8 § 4.1).
 *
 * Перелік ЧИТАЄТЬСЯ з `src/lib/config/site.ts`, а не дублюється тут. Доти він
 * був вписаний константою, і це рівно та помилка, через яку цей файл колись
 * оголосив кожну адресу сайту чужою: два списки, які тримають узгодженими
 * руками, розходяться на першій же новій сторінці.
 */
const HIDDEN_ROUTES = readList(
	'src/lib/config/site.ts',
	/export const HIDDEN_ROUTES[^=]*=\s*\[([^\]]*)\]/,
	'HIDDEN_ROUTES'
);

/** `/beta-test-checklists` → `beta-test-checklists.html`. */
const hiddenFile = (route) => `${route.replace(/^\//, '')}.html`;
const HIDDEN_PAGES = new Set(HIDDEN_ROUTES.map(hiddenFile));

const problems = [];
const fail = (msg) => problems.push(msg);

if (!existsSync(BUILD)) {
	console.error(`Немає каталогу ${BUILD}/ — спершу \`npm run build\`.`);
	process.exit(1);
}

function htmlFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) htmlFiles(full, out);
		else if (entry.endsWith('.html')) out.push(full.replace(/\\/g, '/'));
	}
	return out;
}

const files = htmlFiles(BUILD);

// Захист самої перевірки: порожній список дав би «проблем немає» на зламаній
// збірці (AI-AGENT-PITFALLS-v8 § 1).
if (files.length < 6) {
	console.error(`Знайдено лише ${files.length} HTML — перевірка мертва, очікується 7+.`);
	process.exit(1);
}

/**
 * Кожен інлайн-скрипт зібраної сторінки покритий політикою (SECURITY-v8 § 6.3).
 *
 * Дві незалежні умови, і забути можна кожну:
 *
 *  1. **Позиція.** SvelteKit ставить `<meta http-equiv="Content-Security-Policy">`
 *     на місце `%sveltekit.head%`, а мета-політика діє лише на те, що йде ПІСЛЯ
 *     неї. Скрипт вище неї не покритий узагалі — і хеш для нього декоративний.
 *     Саме так тут і було: анти-FOUC стояв першим у `<head>`.
 *  2. **Хеш.** `mode: 'hash'` хешує лише те, що згенерував сам SvelteKit.
 *     Власний скрипт треба додати в `script-src` руками, і зробити це з файлу
 *     під час збірки — вписаний рядком хеш розходиться при першій правці.
 *
 * Перевірка живе тут, а не в юніт-тесті, бо обидва дефекти видно лише в
 * зібраному HTML: у джерелах `app.html` виглядає правильно в обох випадках, а в
 * dev CSP узагалі приходить заголовком із nonce й проблеми не існує (§ 6.4).
 */
function checkInlineScripts(file, html) {
	const cspTag = html.match(/<meta[^>]+http-equiv="content-security-policy"[^>]*>/i);
	if (!cspTag) {
		fail(`${file}: у зібраному HTML немає мета-політики CSP`);
		return;
	}
	const policy = cspTag[0].match(/content="([^"]+)"/i)?.[1] ?? '';
	const cspAt = cspTag.index;

	// Без `src`, і не JSON-LD: структуровані дані — це дані, а не код, і CSP
	// їх не стосується.
	const INLINE = /<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;
	let found = 0;
	for (const match of html.matchAll(INLINE)) {
		found++;
		if (match.index < cspAt) {
			fail(`${file}: інлайн-скрипт стоїть ВИЩЕ мета-політики — вона його не покриває`);
			continue;
		}
		const hash = `sha256-${createHash('sha256').update(match[1]).digest('base64')}`;
		if (!policy.includes(hash)) {
			fail(`${file}: інлайн-скрипт без хеша в script-src — браузер його заблокує (${hash})`);
		}
	}

	// Захист самої перевірки: нуль інлайн-скриптів означав би, що регулярка
	// перестала їх бачити, а не що їх немає — SvelteKit завжди кладе свій.
	if (found === 0) fail(`${file}: жодного інлайн-скрипта не знайдено — перевірка CSP мертва`);
}

for (const file of files) {
	const html = readFileSync(file, 'utf8');

	checkInlineScripts(file, html);

	// 404.html — оболонка SPA для GitHub Pages: свідомо порожня, без canonical.
	const isShell = file.endsWith('/404.html');

	if (!isShell) {
		const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '';
		const text = body
			.replace(/<script[\s\S]*?<\/script>/g, '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (text.length < MIN_BODY_TEXT) {
			fail(`${file}: видимого тексту ${text.length} символів (мінімум ${MIN_BODY_TEXT})`);
		}
	}

	// Плейсхолдер prerender просочився в адреси.
	if (html.includes('sveltekit-prerender')) {
		fail(`${file}: у розмітці лишився sveltekit-prerender`);
	}

	// Абсолютний URL, склеєний із відносним base: `https://host./images/...`.
	for (const m of html.matchAll(/https?:\/\/[^"'\s]*\.\/[^"'\s]*/g)) {
		fail(`${file}: зламаний абсолютний URL — ${m[0].slice(0, 80)}`);
	}

	// База, підставлена двічі — той самий дефект, через який файл написаний.
	// Шукається в усіх абсолютних адресах сторінки, не лише в canonical.
	//
	// Пропускається при порожній базі, і це не послаблення: `startsWith('')`
	// істинне ЗАВЖДИ, тож без цього виходу перевірка після переїзду на власний
	// домен оголосила б подвоєнням кожну адресу сайту. Подвоїти порожній рядок
	// неможливо — перевіряти нема чого.
	if (BASE) {
		for (const m of html.matchAll(/https?:\/\/[^"'\s]+/g)) {
			const url = m[0];
			if (!url.startsWith(SITE_ORIGIN)) continue;
			const tail = url.slice(SITE_ORIGIN.length);
			if (tail.startsWith(`${BASE}${BASE}`)) {
				fail(`${file}: база підставлена двічі — ${url.slice(0, 90)}`);
			}
		}
	}

	if (!isShell) {
		// § 4.1 — заголовок формується сторінкою. Порожній чи однослівний
		// `<title>` означає, що дані до нього не доїхали: у джерелах вираз
		// виглядає правильно, а під час prerender словник міг бути ще не
		// готовим (саме такий дефект тут уже був).
		const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
		if (title.length < 5) fail(`${file}: title відсутній або надто короткий — «${title}»`);
		// `$t` віддає сам ключ, коли перекладу немає: у HTML це виглядає як
		// звичайний текст, і жоден інший гейт цього не побачить.
		if (/^[a-z][\w.]*\.[\w.]+$/.test(title)) {
			fail(`${file}: у title потрапив КЛЮЧ перекладу, а не переклад — «${title}»`);
		}

		// § 3.2 — Svelte не обчислює вирази всередині <script>, тож JSON-LD,
		// написаний без {@html}, їде в HTML літералом «{JSON.stringify(…)}».
		if (/ld\+json"[^>]*>\s*\{\s*JSON/.test(html)) {
			fail(`${file}: JSON-LD не обчислено — потрібен {@html} (SEO-v8 § 3.2)`);
		}

		// § 4.3 — технічні сторінки не в індексі. Перевіряються обидві сторони:
		// у чернетки має бути noindex, у решти — не має.
		const robotsTags = html.match(/<meta[^>]+name="robots"[^>]*>/g) ?? [];
		if (robotsTags.length !== 1) {
			// Дві директиви в одному `<head>` — це не подвоєння, а суперечність:
			// саме так тут і було, layout казав `index, follow`, а сторінка
			// поруч — `noindex`.
			fail(`${file}: <meta name="robots"> знайдено ${robotsTags.length} разів, очікується 1`);
		}
		const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/)?.[1] ?? '';
		const name = file.slice(BUILD.length + 1);
		const shouldHide = HIDDEN_PAGES.has(name);
		if (shouldHide && !robots.includes('noindex')) {
			fail(`${file}: службова сторінка без noindex — вона піде в індекс`);
		}
		if (!shouldHide && robots.includes('noindex')) {
			fail(`${file}: справжня сторінка сайту оголошена noindex`);
		}

		const canonicals = html.match(/<link[^>]+rel="canonical"[^>]*>/g) ?? [];
		// Службова сторінка не оголошує canonical: разом із `noindex` це два
		// суперечливі сигнали — «не індексуй» і «канонічна адреса ось ця»
		// (BETA-CHECKLIST-v8 § 5.5). Решту перевірок вона проходить нарівні з
		// усіма: прирівняти її до 404-оболонки було б дешевше на два рядки й
		// неправильно — найслабше покритою стала б саме та сторінка, якою
		// користуються тестувальники.
		if (shouldHide) {
			if (canonicals.length !== 0) {
				fail(`${file}: службова сторінка оголошує canonical (${canonicals.length}) — разом із noindex це суперечливі сигнали`);
			}
		} else if (canonicals.length !== 1) {
			fail(`${file}: canonical знайдено ${canonicals.length} разів, очікується 1`);
		} else {
			const href = canonicals[0].match(/href="([^"]+)"/)?.[1] ?? '';
			if (!href.startsWith(`${SITE_ROOT}/`) && href !== SITE_ROOT) {
				fail(`${file}: canonical не з цього сайту — ${href}`);
			}
		}

		// og:image мусить існувати на диску, а не лише в розмітці.
		const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1] ?? '';
		if (!ogImage) fail(`${file}: немає og:image`);
		else if (!ogImage.startsWith(`${SITE_ROOT}/`)) {
			fail(`${file}: og:image не з цього сайту — ${ogImage}`);
		} else {
			const asset = join(BUILD, ogImage.slice(SITE_ROOT.length));
			if (!existsSync(asset)) fail(`${file}: og:image вказує на ${ogImage}, а файлу немає`);
		}
	}
}

for (const page of REQUIRED_PAGES) {
	if (!existsSync(join(BUILD, page))) fail(`немає build/${page} — сторінка не згенерована`);
}

/**
 * Службові сторінки перевіряються на ПРОТИЛЕЖНЕ, і насамперед — на існування
 * (BETA-CHECKLIST-v8 § 5.5). Сторінка, якої немає в `build/`, віддає
 * `404.html`, і чеклист, надісланий тестувальникові посиланням, просто не
 * відкриється. Це трапляється мовчки: досить зникнути рядку в
 * `prerender.entries`, бо краулер на неї не виходить — посилань немає ніде.
 */
for (const route of HIDDEN_ROUTES) {
	const page = hiddenFile(route);
	if (!existsSync(join(BUILD, page))) {
		fail(`немає build/${page} — службова сторінка не згенерована (перевір prerender.entries)`);
	}
	// § 4.2: кириличні гомогліфи в слазі дають адресу, яка виглядає правильною
	// й не працює — у шляху вона percent-кодується, а в diff різниці не видно.
	if (!/^\/[a-z0-9-]+$/.test(route)) {
		fail(`${route}: слаг службової сторінки мусить бути ASCII-kebab-case`);
	}
}

for (const [page, markers] of Object.entries(REQUIRED_CONTENT)) {
	const path = join(BUILD, page);
	if (!existsSync(path)) continue; // про відсутність сторінки скаже перевірка вище
	const html = readFileSync(path, 'utf8');
	for (const marker of markers) {
		if (!html.includes(marker)) {
			fail(`build/${page}: у prerendered HTML немає «${marker}» — блок сховано за клієнтським станом`);
		}
	}
}

// Головне, заради чого писався другий коміт: robots.txt обіцяє sitemap, і той
// мусить існувати саме за обіцяною адресою.
const robotsPath = join(BUILD, 'robots.txt');
if (!existsSync(robotsPath)) {
	fail('немає build/robots.txt');
} else {
	const robots = readFileSync(robotsPath, 'utf8');
	const advertised = robots.match(/^\s*Sitemap:\s*(\S+)/mi)?.[1];
	if (!advertised) {
		fail('robots.txt не оголошує Sitemap');
	} else if (!advertised.startsWith(`${SITE_ROOT}/`)) {
		fail(`robots.txt оголошує sitemap із чужого хоста — ${advertised}`);
	} else {
		const local = join(BUILD, advertised.slice(SITE_ROOT.length));
		if (!existsSync(local)) {
			fail(`robots.txt оголошує ${advertised}, а файлу в build/ немає`);
		} else {
			const sitemap = readFileSync(local, 'utf8');
			const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
			if (locs.length === 0) fail('sitemap порожній — жодного <loc>');
			for (const loc of locs) {
				if (!loc.startsWith(`${SITE_ROOT}/`)) fail(`sitemap: адреса не з цього сайту — ${loc}`);
				// § 4.3 — друга половина того самого правила: сторінка з noindex
				// не має бути в sitemap. Кожен зі списків окремо виглядає
				// правильно; суперечність між ними видно лише при звірці.
				const path = loc.slice(SITE_ROOT.length).replace(/^\//, '').replace(/\/$/, '');
				const asFile = path === '' ? 'index.html' : `${path}.html`;
				if (HIDDEN_PAGES.has(asFile)) {
					fail(`sitemap оголошує ${loc}, а сторінка позначена noindex — списки суперечать`);
				}
			}

			/*
			 * ЗВОРОТНИЙ напрямок, якого доти не було: сторінка є, індексується — а
			 * в sitemap її немає (SEO-v8 § 5).
			 *
			 * Перелік адрес у `sitemap.xml/+server.ts` написаний РУКАМИ, тобто
			 * розходження з реальними маршрутами — питання часу, і воно мовчазне:
			 * зайвої адреси в sitemap не з’являється, суперечності з noindex теж,
			 * тож жодна з наявних перевірок нової сторінки не бачить. Ціна —
			 * сторінка, яку пошуковик знайде хіба випадково.
			 *
			 * `404.html` виключений: це оболонка SPA для GitHub Pages, не сторінка.
			 */
			const inSitemap = new Set(locs);
			for (const file of files) {
				const name = file.slice(BUILD.length + 1);
				if (name === '404.html' || HIDDEN_PAGES.has(name)) continue;

				const html = readFileSync(file, 'utf8');
				if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) continue;

				const expected =
					name === 'index.html' ? `${SITE_ROOT}/` : `${SITE_ROOT}/${name.replace(/\.html$/, '')}`;
				if (!inSitemap.has(expected)) {
					fail(`${name}: сторінка індексується, а в sitemap її немає — очікувався ${expected}`);
				}
			}
		}
	}
}

if (problems.length > 0) {
	console.error(`\nПеревірка збірки не пройдена — ${problems.length} проблем:\n`);
	for (const p of problems) console.error(`  • ${p}`);
	process.exit(1);
}

console.log(`Збірка перевірена: ${files.length} HTML, sitemap на місці, проблем немає.`);
