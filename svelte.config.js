import adapter from '@sveltejs/adapter-static';
import { relative, sep } from 'node:path';

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
				'script-src': ['self', 'https://www.googletagmanager.com'],
				// Svelte-переходи ставлять інлайнові `style`-атрибути.
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https:'],
				'font-src': ['self'],
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
				// Не знаходиться краулером: на sitemap посилається лише
				// robots.txt, а це статичний файл, який краулер не читає.
				// Без цього рядка ендпоїнт не потрапляв у build/ зовсім, і
				// пошуковик за адресою з robots.txt отримував 404.html.
				'/sitemap.xml'
			],
			handleHttpError: 'warn'
		}
	}
};

export default config;
