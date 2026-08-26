import { defineConfig, devices } from '@playwright/test';

/**
 * Окремий порт саме для тестів, і свій у кожному проєкті.
 *
 * Типовий 5173 у всіх сімох проєктах однаковий. Якщо на ньому вже висить
 * dev-сервер ІНШОГО проєкту, Playwright спокійно бере його й перевіряє чужий
 * застосунок: тест зелений, перевірено не те (AI-AGENT-PITFALLS-v8 § 1).
 *
 * Реєстр тестових портів на 2026-08-23: CV 5299, Slovko 5273, MindStep 5373,
 * teatralo4ka 5195, VetCrewGames 5399, as5 5499, DigitalWorkshop 5599.
 * `--strictPort` + `reuseExistingServer: false` роблять зіткнення ГОЛОСНИМ.
 */
const TEST_PORT = 5499;

export default defineConfig({
	testDir: './tests',
	timeout: 60 * 1000,
	expect: { timeout: 10_000 },
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Обмежене число воркерів: axe важкий для процесора, і кілька браузерів разом
	// із прев'ю-сервером не вміщаються — падіння тоді не в коді, а в навантаженні.
	workers: process.env.CI ? 1 : 2,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${TEST_PORT}`,
		trace: 'on-first-retry',
		/*
		 * `reducedMotion: 'reduce'` — умова ДОСТОВІРНОСТІ заміру, не оптимізація.
		 *
		 * axe рахує контраст із обчисленого кольору. Поки йде анімація входу або
		 * перехід кольорів, колір проміжний — і `color-contrast` бачить пару, якої
		 * на екрані немає ні одного кадру після завершення. У `VetCrewGames` це
		 * заміряно: та сама сторінка давала 3 порушення під анімацією і 0 після,
		 * причому результат залежав від навантаження машини. Плаваючий гейт гірший
		 * за відсутній.
		 *
		 * Настройка не штучна: `src/lib/styles/global.css` уже має
		 * `@media (prefers-reduced-motion: reduce)`, тобто перевіряється реальний
		 * шлях реального відвідувача.
		 *
		 * АЛЕ ЦЬОГО РЯДКА САМОГО ПО СОБІ НЕ ВИСТАЧАЄ, і це замір, а не здогад
		 * (Playwright 1.62.1, 2026-08-27). `testInfo.project.use.reducedMotion`
		 * дорівнює `'reduce'`, тобто конфіг розібрано правильно, — а сторінка
		 * при цьому каже
		 * `matchMedia('(prefers-reduced-motion: reduce)').matches === false`, і
		 * `.page-content` лишається з `animation-duration: 0.6s`. Перенесення
		 * налаштування в `use` проєкту (поруч із `devices[…]`) нічого не
		 * змінює. Спрацьовує лише явний `page.emulateMedia({ reducedMotion })`:
		 * після нього `matches === true`, а тривалість стає `1e-05s`.
		 *
		 * Тому рядок лишається (це намір, і він стане чинним, щойно поведінка
		 * виправиться), але покладатися на нього не можна: `tests/a11y.spec.ts`
		 * викликає `emulateMedia` явно й, головне, чекає на ЗАВЕРШЕННЯ анімацій,
		 * а не на зменшену тривалість. Достовірність заміру тримає та умова, а
		 * не цей рядок.
		 */
		reducedMotion: 'reduce'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		/*
		 * ПРЕВ'Ю ЗІБРАНОГО САЙТУ, а не dev-сервер (CODE-QUALITY-v8 § 5.7).
		 *
		 * Dev і збірка — різні застосунки саме там, де живуть найдорожчі дефекти:
		 * CSP у dev приїжджає заголовком із nonce, у збірці — `<meta>` без нього;
		 * dev рендерить на запит, збірка віддає prerender із диску. У
		 * `VetCrewGames` перша редакція гейта впала саме на цьому: локатор існував
		 * лише під `{#if dev}`.
		 *
		 * `--strictPort`: зайнятий порт мусить УПАСТИ, а не тихо з'їхати на
		 * наступний, інакше `port` нижче вказував би на чужий сервер.
		 */
		command: `npm run build && npm run preview -- --port ${TEST_PORT} --strictPort`,
		port: TEST_PORT,
		reuseExistingServer: false,
		// Збірка входить у команду, тож типових 60 с не вистачає.
		timeout: 180_000
	}
});
