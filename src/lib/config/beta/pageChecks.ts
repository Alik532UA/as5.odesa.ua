import type { BetaCheck } from './types';

/**
 * Головна та внутрішні сторінки.
 *
 * `covered`-пункти називають `scripts/check-build.mjs`, а не файл із `*.test.ts`:
 * гейт над `build/` — така сама машинна перевірка, і саме він доводить те, чого
 * жоден юніт-тест довести не може — що потрібне доїхало в зібраний HTML.
 * Інваріант § 5.2 вимагає лише, щоб названий файл існував.
 */
export const PAGE_CHECKS: readonly BetaCheck[] = [
	{
		id: 'home_1',
		tab: 'home',
		coverage: 'covered',
		test: 'scripts/check-build.mjs',
		text: {
			uk: 'На головній прокрутіть до відділів. Мусить бути шість карток: фортепіано, струнні, вокал, естрада, теорія, народні.',
			en: 'On the home page scroll down to the departments. There must be six cards: piano, strings, vocal, pop, theory, folk.'
		}
	},
	{
		id: 'home_2',
		tab: 'home',
		coverage: 'manual',
		testid: 'footer-piano-btn',
		text: {
			uk: 'Натисніть кнопку з клавішами піаніно в підвалі, тоді клавішу на екрані. Мусить бути чути ноту, а сама клавіша — підсвітитися синім.',
			en: 'Press the piano-keys button in the footer, then a key on the screen. You must hear a note, and the key itself must light up blue.'
		}
	},
	{
		id: 'home_3',
		tab: 'home',
		coverage: 'manual',
		testid: 'piano-key-*-btn',
		text: {
			uk: 'У відкритому піаніно натискайте Tab, доки рамка не стане на клавішу, і натисніть Enter. Нота мусить прозвучати так само, як від миші.',
			en: 'With the piano open, press Tab until the focus ring lands on a key, then press Enter. The note must sound exactly as it does from a mouse click.'
		}
	},
	{
		id: 'home_4',
		tab: 'home',
		coverage: 'manual',
		negative: true,
		testid: 'piano-modal',
		text: {
			uk: 'У відкритому піаніно натисніть на клавіатурі Q, а тоді Escape. Q НЕ мусить давати звуку, а Escape мусить закрити вікно.',
			en: 'With the piano open, press Q on your keyboard, then Escape. Q must produce NO sound, and Escape must close the window.'
		}
	},
	{
		id: 'home_5',
		tab: 'home',
		coverage: 'testable',
		text: {
			uk: 'Прокрутіть галерею на головній до кінця. Кожна з шести світлин мусить показатися; порожніх сірих прямокутників лишатися не мусить.',
			en: 'Scroll the gallery on the home page to the end. All six photos must appear; no empty grey rectangles may remain.'
		}
	},
	{
		id: 'pages_1',
		tab: 'pages',
		coverage: 'covered',
		test: 'scripts/check-build.mjs',
		text: {
			uk: 'Відкрийте по черзі «Про Школу», «Історія», «Конкурси», «Для вступу». У кожної вкладки браузера мусить бути свій заголовок, а не однаковий на всіх.',
			en: 'Open "About School", "History", "Competitions" and "Admission" one by one. Each browser tab must have its own title, not the same one everywhere.'
		}
	},
	{
		id: 'pages_2',
		tab: 'pages',
		coverage: 'manual',
		testid: 'nav-*-link',
		text: {
			uk: 'Натисніть у меню «Історія». Саме цей пункт мусить лишитися підкресленим синім, поки ви на цій сторінці.',
			en: 'Press "History" in the menu. That item must stay underlined in blue for as long as you are on that page.'
		}
	},
	{
		id: 'pages_3',
		tab: 'pages',
		coverage: 'manual',
		negative: true,
		text: {
			uk: 'Звузьте вікно браузера до ширини телефона й пройдіть усі сторінки. Горизонтальної смуги прокрутки внизу з’явитися НЕ мусить на жодній.',
			en: 'Narrow the browser window to phone width and walk through every page. A horizontal scrollbar must NOT appear at the bottom on any of them.'
		}
	},
	{
		id: 'pages_4',
		tab: 'pages',
		coverage: 'manual',
		testid: 'competitions-modern-view-link',
		text: {
			uk: 'На сторінці «Конкурси» натисніть синю кнопку «Сучасний погляд». Мусить відкритися нова вкладка з сайтом конкурсу, а сторінка школи — лишитися на місці.',
			en: 'On the "Competitions" page press the blue "Modern View" button. A new tab with the competition site must open, and the school page must stay where it was.'
		}
	},
	{
		id: 'pages_5',
		tab: 'pages',
		coverage: 'manual',
		testid: 'header-admission-btn',
		text: {
			uk: 'Натисніть «Для вступу» в шапці й наберіть з телефона номер, вказаний у підвалі. Дзвінок мусить піти на школу.',
			en: 'Press "Admission" in the header and dial the phone number shown in the footer from a mobile. The call must reach the school.'
		}
	},
	{
		id: 'pages_6',
		tab: 'pages',
		coverage: 'testable',
		negative: true,
		text: {
			uk: 'Відкрийте адресу, якої немає, наприклад /nema-takoi. Мусить показатися сторінка «Сторінку не знайдено» з шапкою та підвалом; порожньої білої сторінки бути НЕ мусить.',
			en: 'Open a URL that does not exist, for example /nema-takoi. A "Page not found" page with the header and footer must appear; a blank white page must NOT.'
		}
	}
];
