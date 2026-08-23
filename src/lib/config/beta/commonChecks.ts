import type { BetaCheck } from './types';

/**
 * Наскрізна вкладка: шапка, підвал, теми, мова, шрифти.
 *
 * Кожен пункт написаний ПІСЛЯ читання коду, а не замість (BETA-CHECKLIST-v8
 * § 7.2). У джерелі канону з дев'яноста пунктів вісім описували неправду, і три
 * з них були просто вигадані — тестувальник поставив би «не працює» справному
 * коду, і кожен такий пункт коштує двічі.
 *
 * Кілька пунктів нижче — `covered`. Вони лишаються в списку саме тому, що
 * покриті: це контрольна група. Якщо людина знайде тут поломку, новина гірша за
 * звичайний баг — вона означає дефект ТЕСТА, і знецінює зелені прогони.
 */
export const COMMON_CHECKS: readonly BetaCheck[] = [
	{
		id: 'common_1',
		tab: 'common',
		coverage: 'manual',
		text: {
			uk: 'Подивіться на заголовок «Одеська школа мистецтв №5» у шапці. Літери мусять бути вузькі й рівні (шрифт e-Ukraine), а не звичайні системні як у Word.',
			en: 'Look at the "Odesa School of Arts №5" heading in the header. The letters must be narrow and even (the e-Ukraine font), not the default system font you see in Word.'
		}
	},
	{
		id: 'common_2',
		tab: 'common',
		coverage: 'manual',
		negative: true,
		text: {
			uk: 'Відкрийте консоль браузера (F12, вкладка Console) і перезавантажте сторінку. Червоних рядків, що починаються зі слова «Refused», бути НЕ мусить.',
			en: 'Open the browser console (F12, Console tab) and reload the page. There must be NO red lines starting with the word "Refused".'
		}
	},
	{
		id: 'common_3',
		tab: 'common',
		coverage: 'manual',
		testid: 'header-settings-btn',
		text: {
			uk: 'Натисніть шестерню в шапці, оберіть темну тему й перезавантажте сторінку. Сайт мусить одразу відкритися темним — світлого спалаху на початку завантаження бути не мусить.',
			en: 'Press the gear icon in the header, pick the dark theme and reload the page. The site must come up dark right away, with no flash of light colours while it loads.'
		}
	},
	{
		id: 'common_4',
		tab: 'common',
		coverage: 'covered',
		test: 'src/lib/states/ui.svelte.test.ts',
		text: {
			uk: 'Не торкаючись шестерні на сайті, перемкніть тему в налаштуваннях системи (світла ↔ темна). Кольори сайту мусять змінитися разом із нею.',
			en: 'Without touching the gear on the site, switch the theme in your system settings (light ↔ dark). The site colours must change along with it.'
		}
	},
	{
		id: 'common_5',
		tab: 'common',
		coverage: 'covered',
		test: 'src/lib/states/ui.svelte.test.ts',
		negative: true,
		testid: 'header-settings-btn',
		text: {
			uk: 'Оберіть тему шестернею в шапці, а потім перемкніть тему системи. Тепер сайт перемикатися НЕ мусить — ваш власний вибір головніший за системний.',
			en: 'Pick a theme with the gear in the header, then switch your system theme. Now the site must NOT follow it — your own choice outranks the system one.'
		}
	},
	{
		id: 'common_6',
		tab: 'common',
		coverage: 'manual',
		testid: 'header-burger-btn',
		text: {
			uk: 'На телефоні натисніть кнопку меню в шапці. Меню мусить розкритися на весь екран, а поточна сторінка в ньому — бути підкресленою.',
			en: 'On a phone, press the menu button in the header. The menu must open full-screen, and the page you are on must be underlined in it.'
		}
	},
	{
		id: 'common_7',
		tab: 'common',
		coverage: 'manual',
		negative: true,
		testid: 'header-burger-btn',
		text: {
			uk: 'Відкрийте меню кнопкою в шапці й натискайте Tab. Рамка фокуса мусить ходити по пунктах меню й повертатися на хрестик; вийти на сторінку під меню вона НЕ мусить.',
			en: 'Open the menu with the header button and press Tab repeatedly. The focus ring must cycle through the menu items and return to the close button; it must NOT escape to the page behind the menu.'
		}
	},
	{
		id: 'common_8',
		tab: 'common',
		coverage: 'manual',
		negative: true,
		// Пункт питає про три елементи, а локатор називає один — той, з якого
		// починається перевірка. Інваріант § 5.3 вимагає саме назвати вхід, а не
		// перелічити все; прибрати поле, не знайшовши локатора, було б рівно тією
		// помилкою, проти якої він написаний.
		testid: 'header-settings-btn',
		text: {
			uk: 'На телефоні натисніть пальцем шестерню, кнопку меню й посилання в підвалі. Жодне з них НЕ мусить вимагати цілитися — влучати треба з першого разу.',
			en: 'On a phone, tap the gear, the menu button and the footer links with your finger. None of them must require aiming — each should hit on the first try.'
		}
	},
	{
		id: 'common_9',
		tab: 'common',
		coverage: 'testable',
		text: {
			uk: 'Перемкніть мову на English у шестерні. Написи мусять стати англійськими, і сторінка не мусить смикнутися чи втратити прокрутку.',
			en: 'Switch the language to English with the gear. All labels must become English, and the page must not jump or lose its scroll position.'
		}
	},
	{
		id: 'common_10',
		tab: 'common',
		coverage: 'testable',
		testid: 'skip-to-content-link',
		text: {
			uk: 'Клацніть у порожнє місце сторінки й натисніть Tab один раз. Угорі мусить з’явитися напис «Перейти до основного контенту», який працює як посилання.',
			en: 'Click an empty spot on the page and press Tab once. A "Skip to main content" link must appear at the top and must work as a link.'
		}
	},
	{
		id: 'common_11',
		tab: 'common',
		coverage: 'testable',
		text: {
			uk: 'Пройдіть сторінку очима в темній темі. Жоден напис не мусить зникати, зливаючись із тлом, і жодна кнопка не мусить ставати нечитною.',
			en: 'Look through the page in the dark theme. No text must disappear into its background, and no button must become unreadable.'
		}
	},
	/*
	 * Два пункти нижче — єдиний спосіб підтвердити WCAG SC 2.1.4 (HOTKEYS-v8 § 6).
	 * Машина бачить, що перемикач є й що обробник його читає; що він СПРАВДІ
	 * відрізає клавіші — різне твердження, і перевіряється лише прогоном.
	 */
	{
		id: 'common_12',
		tab: 'common',
		coverage: 'manual',
		testid: 'settings-hotkeys-on-btn',
		text: {
			uk: 'Клацніть у порожнє місце сторінки й натисніть клавішу T. Тема мусить перемкнутися. Так само L перемикає мову, а B — тло за спиною сторінки.',
			en: 'Click an empty spot on the page and press the T key. The theme must switch. In the same way L switches the language and B switches the background behind the page.'
		}
	},
	{
		id: 'common_14',
		tab: 'common',
		coverage: 'manual',
		testid: 'debug-background-2-btn',
		text: {
			uk: 'Увімкніть у налаштуваннях системи «зменшити рух» (Windows: Спеціальні можливості → Візуальні ефекти; iOS: Доступність → Рух) і поверніться на сайт. Тло за спиною сторінки мусить завмерти й не рухатися при прокрутці.',
			en: 'Turn on "reduce motion" in your system settings (Windows: Accessibility → Visual effects; iOS: Accessibility → Motion) and return to the site. The background behind the page must freeze and stop moving as you scroll.'
		}
	},
	{
		id: 'common_13',
		tab: 'common',
		coverage: 'manual',
		negative: true,
		testid: 'settings-hotkeys-off-btn',
		text: {
			uk: 'У шестерні знайдіть «Гарячі клавіші» й натисніть «Вимк». Тепер клавіші T, L і B змінювати НІЧОГО не мусять, а Esc мусить і далі закривати меню.',
			en: 'In the gear menu find "Keyboard shortcuts" and press "Off". Now the T, L and B keys must change NOTHING, while Esc must still close the menu.'
		}
	},

	/*
	 * ─── ДОСТУПНІСТЬ: РІВНО ТЕ, ЧОГО axe НЕ БАЧИТЬ ───────────────────────────
	 *
	 * З 2026-08-23 у проєкті є `tests/a11y.spec.ts` — axe над зібраним сайтом,
	 * головна й чеклист, у світлій і темній темі. Він ловить приблизно третину
	 * проблем доступності: те, що видно з атрибутів і обчислених кольорів.
	 *
	 * Пункти нижче — друга половина, і кожен названий саме тому, що машина його
	 * не побачить у принципі: порядок фокуса — це послідовність, а не атрибут;
	 * осмисленість підпису — це мова, а не наявність рядка; утримання фокуса —
	 * це поведінка при натисканні.
	 */
	{
		id: 'common_15',
		tab: 'common',
		coverage: 'manual',
		text: {
			uk: 'Не торкаючись мишки, пройдіть головну лише клавішею Tab від початку до кінця. Рамка фокуса мусить бути видною на КОЖНОМУ кроці, а порядок — іти зверху вниз, як читається сторінка, без стрибків назад.',
			en: 'Without touching the mouse, walk the home page with Tab alone from start to finish. The focus ring must be visible at EVERY step, and the order must go top to bottom the way the page reads, without jumping back.'
		}
	},
	{
		id: 'common_16',
		tab: 'common',
		coverage: 'manual',
		text: {
			uk: 'Відкрийте меню шестерні й пройдіть Tab-ом п’ять-шість кроків. Фокус мусить лишатися ВСЕРЕДИНІ меню й не виходити на сторінку під ним; Esc мусить закривати меню й повертати фокус на саму шестерню.',
			en: 'Open the gear menu and walk five or six Tab steps. Focus must stay INSIDE the menu and never reach the page behind it; Esc must close it and return focus to the gear itself.'
		}
	},
	{
		id: 'common_17',
		tab: 'common',
		coverage: 'manual',
		text: {
			uk: 'Увімкніть екранний читач (Windows: Ctrl+Win+Enter) і пройдіть шапку. Кожна кнопка мусить називатися тим, що вона робить — «Тема», «Мова», «Налаштування». Назви виду «кнопка», «зображення» або сам символ іконки означають дефект.',
			en: 'Turn on a screen reader (Windows: Ctrl+Win+Enter) and go through the header. Each button must be announced by what it does — «Theme», «Language», «Settings». Announcements like «button», «image» or the icon character itself mean a defect.'
		}
	},
	{
		id: 'common_18',
		tab: 'common',
		coverage: 'manual',
		negative: true,
		text: {
			uk: 'Пройдіть Tab-ом по головній і подивіться, чи фокус НЕ потрапляє на декоративні елементи: тло, розділювачі, іконки без дії. Кожна зупинка фокуса мусить щось робити — інакше на шляху до вмісту з’являються порожні кроки.',
			en: 'Tab through the home page and check that focus does NOT land on decorative elements: background, dividers, icons without an action. Every focus stop must do something — otherwise there are empty steps on the way to the content.'
		}
	}
];
