import { expect, test as setup } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * GATE-E2E-IDENTITY — на порту саме цей проєкт і саме щойно зібрана збірка
 * (CI-CD-AND-TOOLS-v9 § 1.11, `CI-E2E-TARGET-IDENTITY`).
 *
 * ## Чому `--strictPort` і `reuseExistingServer: false` цього не ловлять
 *
 * Обидва дивляться на порт ОДИН раз — перед запуском команди `webServer`. А
 * команда тут починається зі збірки (`npm run build && npm run preview`), тобто
 * від перевірки порту до появи власного сервера минають десятки секунд. У це
 * вікно сусідній проєкт встигає підняти на тому самому порті свій dev-сервер, і
 * прогін іде на ЧУЖИЙ застосунок.
 *
 * Заміряно у `VetCrewGames` 2026-08-27: на тестовому порті 5399 піднявся
 * `vite dev` сусіднього `MindStep`. Найдорожче тут не саме падіння, а його
 * вигляд: «element(s) not found» читається як помилка коду, і шукати починають
 * у локаторах. GEMINI.md екосистеми описував цю пастку словами з 2026-08-09;
 * словами вона й лишалася.
 *
 * ## Дві звірки, і кожна ловить своє
 *
 * `application-name` — це «чий сайт». Маркер лежить в `app.html` і їде в кожну
 * сторінку; значення звіряється з `name` у `package.json`, тобто дублікатом
 * факту не є.
 *
 * `_app/version.json` — це «яка збірка». Маркер ідентичності мовчить, коли на
 * порту лишився ЖИВИЙ ПОПЕРЕДНІЙ прев'ю цього ж проєкту: сайт той самий, а
 * перевіряється код, якого вже немає в дереві. SvelteKit кладе в цей файл
 * штамп збірки, і він змінюється щоразу, тож достатньо порівняти те, що
 * віддає сервер, із тим, що лежить у `build/` після щойно виконаної збірки.
 *
 * Проєкт-сетап, а не перший тест у файлі: `dependencies: ['identity']` у
 * `playwright.config.ts` зупиняє ВЕСЬ прогін, а не одну специфікацію. Гейт,
 * який дізнався, що міряє чужий сайт, і продовжив міряти, нічого не вартий.
 */

const PROJECT_NAME = (JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }).name;
const BUILD_VERSION = 'build/_app/version.json';

setup('на порту саме цей проєкт і саме щойно зібрана збірка', async ({ page, baseURL }) => {
	const response = await page.goto('/');
	expect(response?.status(), `сервер на ${baseURL} не віддав головну сторінку`).toBe(200);

	const marker = await page
		.locator('meta[name="application-name"]')
		.getAttribute('content', { timeout: 5_000 })
		.catch(() => null);

	expect(
		marker,
		`на ${baseURL} немає маркера <meta name="application-name"> — або порт зайняв ` +
			'інший застосунок, або маркер прибрали з app.html разом із цією перевіркою'
	).not.toBeNull();

	expect(
		marker,
		`на ${baseURL} відповідає «${marker}», а цей проєкт — «${PROJECT_NAME}». ` +
			'Порт зайняв сусідній застосунок: усе, що впаде далі, буде про ЧУЖИЙ сайт'
	).toBe(PROJECT_NAME);

	// Штамп збірки: сервер і дерево мусять показувати ту саму збірку.
	expect(
		existsSync(BUILD_VERSION),
		`${BUILD_VERSION} немає — збірка не виконалася, а сервер на порту звідкись узявся`
	).toBe(true);

	const onDisk = JSON.parse(readFileSync(BUILD_VERSION, 'utf8')) as { version: string };
	const served = (await (await page.request.get('/_app/version.json')).json()) as {
		version: string;
	};

	expect(
		served.version,
		`сервер віддає збірку ${served.version}, а в build/ лежить ${onDisk.version}. ` +
			'На порту живе попередній прев’ю: перевірятиметься код, якого вже немає в дереві'
	).toBe(onDisk.version);
});
