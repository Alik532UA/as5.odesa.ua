import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Гарди аналітики (ANALYTICS-v9 § 2.1, § 4.2, § 5).
 *
 * ## Чому гарди, а не «події надсилаються»
 *
 * Канон називає це прямо: перевіряти треба те, що найлегше зламати МОВЧКИ.
 * Зламаний гард не падає й не червоніє — він просто починає надсилати те, чого
 * надсилати не мусив: локальні кліки розробника в ту саму властивість, що
 * справжній трафік, або маяки відвідувача, який попросив його не відстежувати.
 *
 * `vi.doMock`, а не `vi.mock`: другий піднімається на початок файлу й діє на
 * весь файл, тобто `dev: true` і `dev: false` в одному файлі так не поставити —
 * а без `dev: false` половина перевірок нижче була б зеленою з неправильної
 * причини (мовчить не тому, що поважає сигнал, а тому, що dev).
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: прибрати `!optedOut()` з `enabled()` — червоніють усі
 * три перевірки сигналу; лишити його й прибрати `!dev` — червоніє перевірка
 * dev-режиму.
 */

type Env = { browser: boolean; dev: boolean };

/**
 * Свіжий екземпляр модуля з підставним оточенням і навігатором.
 *
 * Прапорець `started` живе в модулі, тож без `resetModules()` другий сценарій
 * бачив би вже проініціалізований сервіс.
 */
async function freshAnalytics(env: Env, navigatorStub: Record<string, unknown> = {}) {
	vi.resetModules();
	vi.doMock('$app/environment', () => env);
	vi.stubGlobal('navigator', { userAgent: 'test', ...navigatorStub });
	// `dataLayer`, а не шпигун на `gtag`: сервіс СТАВИТЬ власний `window.gtag`
	// (gtag.js читає з черги сирий `arguments`, тому інакше не можна), тобто
	// шпигун був би затертий і кожна перевірка «нічого не надіслано» проходила
	// б із неправильної причини. Черга — те саме, що поїде в мережу.
	vi.stubGlobal('dataLayer', undefined);
	vi.stubGlobal('gtag', undefined);
	for (const script of document.querySelectorAll('script[src*="googletagmanager"]')) {
		script.remove();
	}
	const module = await import('./analytics');
	const sent = () =>
		((window.dataLayer ?? []) as unknown[]).map((entry) => Array.from(entry as ArrayLike<unknown>));
	return { module, sent };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.doUnmock('$app/environment');
});

describe('аналітика мовчить там, де мусить (§ 2.1, § 4.2)', () => {
	it('у dev-режимі не надсилає нічого', async () => {
		const { module, sent } = await freshAnalytics({ browser: true, dev: true });
		module.initAnalytics();
		module.track('contact_click', { channel: 'phone' });
		module.trackPageView();
		expect(sent(), 'локальні кліки не мають потрапляти в ту саму властивість').toEqual([]);
	});

	it('поза браузером не надсилає нічого', async () => {
		// Prerender: модуль виконується в Node, `document` немає взагалі.
		const { module, sent } = await freshAnalytics({ browser: false, dev: false });
		module.initAnalytics();
		module.track('language_change');
		expect(sent()).toEqual([]);
	});

	it('Do Not Track = 1 — жодного маяка', async () => {
		const { module, sent } = await freshAnalytics(
			{ browser: true, dev: false },
			{ doNotTrack: '1' }
		);
		module.initAnalytics();
		module.track('theme_change');
		module.trackPageView();
		expect(sent()).toEqual([]);
		expect(
			document.querySelector('script[src*="googletagmanager"]'),
			'скрипт gtag.js не має навіть завантажуватися'
		).toBeNull();
	});

	it('Do Not Track = yes (Safari, старий Firefox) — так само', async () => {
		const { module, sent } = await freshAnalytics(
			{ browser: true, dev: false },
			{ doNotTrack: 'yes' }
		);
		module.track('section_view');
		expect(sent()).toEqual([]);
	});

	it('Global Privacy Control — теж сигнал, і чинний', async () => {
		const { module, sent } = await freshAnalytics(
			{ browser: true, dev: false },
			{ globalPrivacyControl: true }
		);
		module.track('department_view');
		expect(sent()).toEqual([]);
	});
});

describe('без сигналу відмови аналітика працює (§ 5)', () => {
	it('doNotTrack = 0 не вважається відмовою', async () => {
		// `'0'` означає «відстежувати можна», а `'unspecified'` — «не сказано».
		// Читати будь-яке значення як відмову означало б вимкнути аналітику
		// всюди — і виглядало б це як «гард працює».
		const { module, sent } = await freshAnalytics(
			{ browser: true, dev: false },
			{ doNotTrack: '0', globalPrivacyControl: false }
		);
		module.track('contact_click', { channel: 'email' });
		expect(sent()).toContainEqual(['event', 'contact_click', { channel: 'email' }]);
	});

	it('перегляд сторінки шлеться вручну, без автоматичного page_view', async () => {
		const { module, sent } = await freshAnalytics({ browser: true, dev: false });
		module.trackPageView();

		// `send_page_view: false` у config — інакше автоматичний перегляд іде до
		// того, як роутер устоявся, і більше не повторюється на клієнтських
		// переходах, якими тут іде майже вся навігація (§ 2.4).
		expect(sent()).toContainEqual([
			'config',
			expect.stringMatching(/^G-/),
			{ send_page_view: false }
		]);
		expect(sent()).toContainEqual(['event', 'page_view', expect.anything()]);
	});

	it('initAnalytics ідемпотентний: другий виклик не дублює config', async () => {
		const { module, sent } = await freshAnalytics({ browser: true, dev: false });
		module.initAnalytics();
		module.initAnalytics();
		module.track('service_badge_click');

		const configs = sent().filter((call) => call[0] === 'config');
		expect(configs, 'два config означали б подвійний облік кожної події').toHaveLength(1);
	});
});
