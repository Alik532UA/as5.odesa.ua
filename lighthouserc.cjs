const { lighthouseUrls } = require('./scripts/lhci-urls.cjs');

module.exports = {
	ci: {
		collect: {
			staticDistDir: './build',

			/*
			 * Адреси вказані ЯВНО, і це не уточнення, а виправлення.
			 *
			 * Без них LHCI сам шукає HTML у `staticDistDir`, а в `build/` лежить
			 * і `404.html` — SPA-фолбек без пререндереного вмісту, який до того ж
			 * не вміє завантажитися з кореня сервера, коли застосунок живе за
			 * префіксом base. Разом із `maxAutodiscoverIsolate: 1` вибір падав
			 * саме на нього: Chrome не малював жодного кадру, Lighthouse падав із
			 * `NO_FCP`, а крок стоїть ПЕРЕД викладенням артефакту — тобто гейт,
			 * який жодного разу не проходив, блокував увесь деплой.
			 *
			 * Але доти тут стояла ОДНА вписана рядком адреса, `index.html`.
			 * Шість сторінок із семи не міряв ніхто, і нова сторінка не
			 * потрапила б у замір ніколи (OBSERVABILITY-v9 § 2.2.1,
			 * `OBS-LHCI-REAL-PAGES`). Тепер перелік генерується з маршрутів —
			 * той самий набір, що йде в `sitemap.xml`; службові сторінки з
			 * `noindex` виключені з причиною, записаною в `scripts/lhci-urls.cjs`.
			 * Узгодженість стереже `src/lighthouse-urls.test.ts`.
			 */
			url: lighthouseUrls(),
			numberOfRuns: 1
		},
		assert: {
			assertions: {
				'categories:performance': ['warn', { minScore: 0.8 }],
				'categories:accessibility': ['error', { minScore: 0.95 }],
				'categories:best-practices': ['error', { minScore: 0.9 }],
				'categories:seo': ['error', { minScore: 0.9 }]
			}
		},
		upload: {
			target: 'temporary-public-storage'
		}
	}
};
