import adapter from '@sveltejs/adapter-static';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

/**
 * Хеш власного інлайн-скрипта з `app.html` (SECURITY-v8 § 6.3, § 16).
 *
 * `mode: 'hash'` хешує лише ті інлайн-скрипти, які генерує САМ SvelteKit.
 * Анти-FOUC у `app.html` до них не належить, тож без цього рядка політика його
 * не дозволяє — а в `app.html` він до того ж стояв ВИЩЕ `%sveltekit.head%`,
 * тобто вище самої мети, і не покривався політикою в принципі.
 *
 * Хеш береться з файлу під час збірки, а не вписується рядком у конфіг:
 * вписаний розходиться зі скриптом при першій же правці, і сайт ламається лише
 * у збірці — у dev CSP приходить заголовком із nonce, і там усе працює (§ 6.4).
 *
 * Кількість перевіряється навмисно: якщо в `app.html` з'явиться другий скрипт,
 * збірка впаде з поясненням замість того, щоб мовчки лишити його без хеша.
 */
function inlineScriptHash() {
	const html = readFileSync('src/app.html', 'utf8');
	const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
	if (scripts.length !== 1) {
		throw new Error(
			`app.html: очікується рівно один інлайн <script>, знайдено ${scripts.length}. ` +
				'Хеш у CSP покриває лише один — інакше решта мовчки заблокується.'
		);
	}
	return `sha256-${createHash('sha256').update(scripts[0][1]).digest('base64')}`;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: true,
			strict: true
		}),
		paths: {
			// Порожня база, бо основна адреса сайту — власний домен
			// https://as5.odesa.ua/, де сторінки лежать у корені.
			//
			// Доти тут стояло '/as5.odesa.ua' — код виходив із того, що сайт є
			// project page акаунта. Домен був куплений і налаштований у Pages, але
			// код за ним не пішов, і наслідок був живий: зібраний CSS просив шрифт
			// за `/as5.odesa.ua/fonts/e-Ukraine-Regular.woff2`, що на власному
			// домені розгортається в `as5.odesa.ua/as5.odesa.ua/fonts/…` — 404.
			// Сайт показувався системними шрифтами, і в коді цього не видно ніяк.
			//
			// Файл `static/CNAME` не потрібен: деплой іде офіційним
			// `actions/deploy-pages`, який зберігає прив'язку домену з налаштувань
			// Pages. Сусідній teatralo4ka.odesa.ua працює саме так — власний домен,
			// база '', CNAME немає ніде.
			base: ''
		},
		// Політика взята з DigitalWorkshop: той самий adapter-static, той самий
		// runtime-інжект gtag.js. `hash` — бо всі сторінки prerendered, тобто
		// nonce генерувати нема кому (SECURITY-v8 § 4).
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				// gtag.js додається в `<head>` уже в браузері (analytics.ts).
				// Без цього хоста браузер його блокує, а сервіс виглядає робочим.
				// Третій елемент — хеш анти-FOUC зі `app.html`: він тепер стоїть
				// ПІСЛЯ мети, тобто політика на нього справді діє, і без хеша
				// тема блимала б при кожному завантаженні (SECURITY-v8 § 6.3).
				'script-src': ['self', 'https://www.googletagmanager.com', inlineScriptHash()],
				// Svelte-переходи ставлять інлайнові `style`-атрибути.
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https:'],
				'font-src': ['self'],
				// SECURITY-v8 § 6.2, HIGH. Директиви не було зовсім, тож
				// `<audio>` у `PianoModal` падав під `default-src 'self'` і
				// БЛОКУВАВСЯ: клавіші натискалися, підсвітка працювала, звуку
				// не було. Симптому, за яким це знайти, немає ніде — розкладка
				// ціла, збірка зелена, тести зелені; лише `Refused to load the
				// media` в консолі, якщо туди подивитися.
				//
				// Хост сторонній: файли .wav лежать на демо-сайті
				// carolinegabriel.com. Тримати звук школи на чужому демо —
				// окрема крихкість (записана в PROJECT-CONTEXT.md); правильне
				// рішення — перенести файли в `static/audio/`, і тоді ця
				// директива згорнеться до `'self'`.
				'media-src': ['self', 'https://carolinegabriel.com'],
				// ...а без цього скрипт завантажиться і не зможе нічого
				// відправити: маяки GA4 йдуть окремими запитами.
				'connect-src': [
					'self',
					'https://www.googletagmanager.com',
					'https://*.google-analytics.com',
					'https://*.analytics.google.com'
				],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
				// `frame-ancestors` тут свідомо НЕМА. Політика доїжджає до
				// браузера в `<meta http-equiv>` (GitHub Pages не дає ставити
				// заголовки), а в meta-варіанті специфікація велить браузеру
				// цю директиву ігнорувати. SvelteKit її просто викидає зі
				// зібраного HTML — перевірено в `build/index.html`. Тримати її
				// в конфізі означало б вважати захист від clickjacking
				// наявним, коли його немає.
			}
		},
		prerender: {
			crawl: true,
			entries: [
				'/',
				'/about',
				'/history',
				'/competitions',
				'/admission',
				'/test',
				// Чеклист бета-тестування. Краулер його не знайде: у меню й у
				// sitemap його немає навмисно (BETA-CHECKLIST-v8 § 4), тож без
				// цього рядка сторінка просто не потрапила б у `build/`.
				'/beta-test-checklists',
				// Не знаходиться краулером: на sitemap посилається лише
				// robots.txt, а це статичний файл, який краулер не читає.
				// Без цього рядка ендпоїнт не потрапляв у build/ зовсім, і
				// пошуковик за адресою з robots.txt отримував 404.html.
				'/sitemap.xml'
			],
			/*
			 * НЕ `'warn'`, як було. Рядок `'warn'` вимикає перевірку биття посилань
			 * УСЬОГО сайту, а знадобився він через одну чернетку: `/test` посилається
			 * на `/news/1…6`, яких немає. Ціна була несиметрична — заради шести відомих
			 * адрес мовчки пропускалося будь-яке інше биття, зокрема в живому меню, і
			 * дізнатися про нього не було звідки: збірка зелена, гейти зелені.
			 *
			 * Тепер відома пара «звідки → куди» названа явно, а решта валить збірку.
			 * Це та сама форма, що `SIZE_DEBT` і `EXCEPTIONS` у перевірках: борг
			 * лишається виміряним замість того, щоб зникнути разом із вимкненим гейтом.
			 */
			handleHttpError: ({ path, referrer, message }) => {
				if (referrer === '/test' && /^\/news\/\d+$/.test(path)) {
					console.warn(`[prerender] відоме биття чернетки: ${path} (з ${referrer})`);
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
