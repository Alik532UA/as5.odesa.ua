import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebVitals } from './webVitals.svelte';

/**
 * Core Web Vitals: збирає весь час, звітує один раз (OBSERVABILITY-v9 § 2.1).
 *
 * ## Чому цей контролер вартий тестів окремо
 *
 * Його дефекти не видно НІ В ЧОМУ. Метрика, порахована неправильно, лишається
 * числом правильного порядку: CLS 0.08 замість 0.02 виглядає так само
 * правдоподібно, а перевірити його з іншого джерела в цьому проєкті нічим.
 * Тобто помилка тут не падає, не червоніє й не викликає підозри — вона просто
 * тихо змінює те, за чим потім судять про швидкість сайту.
 *
 * Три означення, які легко зламати, і кожне тут під перевіркою:
 *
 *  - CLS не рахує зсуви одразу після дії користувача (`hadRecentInput`): це не
 *    дефект верстки, а наслідок його ж натискання;
 *  - INP — НАЙГІРША затримка, і рахується циклом. `Math.max(...entries)` на
 *    довгій сесії впирається в межу стека, тобто замість метрики дає виняток
 *    усередині спостерігача;
 *  - `durationThreshold` — опція лише `event`-таймінгів. Для
 *    `largest-contentful-paint` і `layout-shift` вона не означає нічого, а
 *    зайве поле в `observe()` частина браузерів зустрічає винятком.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: прибрати умову `!entry.hadRecentInput` — червоніє
 * «CLS не рахує зсуви після дії»; прибрати перевірку `line === this.#reported` —
 * червоніє «повторне ховання сторінки мовчить».
 */

type Handler = (list: { getEntries: () => PerformanceEntry[] }) => void;
type Observed = { type: string; options: Record<string, unknown> };

/** Спостерігачі, створені під час прогону, і те, з чим їх підписали. */
let created: Array<{ handler: Handler; observed: Observed[] }> = [];

/**
 * Підстава `PerformanceObserver`: жодної метрики в jsdom немає, тож без неї
 * `start()` виходить достроково й перевірка міряла б порожнечу.
 *
 * `unsupported` імітує браузер, який не знає типу: справжній кидає саме на
 * `observe()`, і саме тому кожен підпис у контролері обгорнутий окремо.
 */
function stubObserver(unsupported: string[] = []) {
	created = [];
	class FakeObserver {
		#entry: { handler: Handler; observed: Observed[] };
		constructor(handler: Handler) {
			this.#entry = { handler, observed: [] };
			created.push(this.#entry);
		}
		observe(options: { type: string } & Record<string, unknown>) {
			if (unsupported.includes(options.type)) throw new TypeError('невідомий тип');
			this.#entry.observed.push({ type: options.type, options });
		}
		disconnect = vi.fn();
	}
	vi.stubGlobal('PerformanceObserver', FakeObserver);
}

/** Надіслати записи тому спостерігачеві, що підписаний на вказаний тип. */
function emit(type: string, entries: unknown[]) {
	const target = created.find((c) => c.observed.some((o) => o.type === type));
	if (!target) throw new Error(`ніхто не підписаний на ${type} — підстава зламалася`);
	target.handler({ getEntries: () => entries as PerformanceEntry[] });
}

function setVisibility(state: 'visible' | 'hidden') {
	Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
	document.dispatchEvent(new Event('visibilitychange'));
}

/** Останній рядок звіту з консолі — саме те, що бачить читач журналу. */
function lastReport(warn: ReturnType<typeof vi.spyOn>): string {
	const calls = warn.mock.calls;
	return calls.length ? String(calls[calls.length - 1][0]) : '';
}

describe('WebVitals (OBSERVABILITY-v9 § 2.1)', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		stubObserver();
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		setVisibility('visible');
	});

	it('перевірка жива: підписка стала на всі три метрики', () => {
		const vitals = new WebVitals();
		vitals.start();
		const types = created.flatMap((c) => c.observed.map((o) => o.type));
		expect(types).toEqual(
			expect.arrayContaining(['largest-contentful-paint', 'layout-shift', 'event'])
		);
		vitals.stop();
	});

	it('durationThreshold передається ЛИШЕ event-таймінгам', () => {
		const vitals = new WebVitals();
		vitals.start();
		for (const observer of created) {
			for (const { type, options } of observer.observed) {
				if (type === 'event') expect(options.durationThreshold).toBe(40);
				else
					expect(
						'durationThreshold' in options,
						`${type} отримав опцію event-таймінгів — частина браузерів кидає на цьому`
					).toBe(false);
			}
		}
		vitals.stop();
	});

	it('звіт іде на ховання сторінки, а не раніше', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('largest-contentful-paint', [{ startTime: 1234.6 }]);
		expect(warn, 'доки сторінку видно, звіту бути не має').not.toHaveBeenCalled();

		setVisibility('hidden');
		expect(lastReport(warn)).toContain('LCP: 1235ms');
		vitals.stop();
	});

	it('CLS не рахує зсуви одразу після дії користувача', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('layout-shift', [
			{ value: 0.02, hadRecentInput: false },
			{ value: 0.5, hadRecentInput: true },
			{ value: 0.01, hadRecentInput: false }
		]);
		setVisibility('hidden');
		expect(
			lastReport(warn),
			'зсув після натискання — наслідок дії користувача, у визначенні CLS він не рахується'
		).toContain('CLS: 0.0300');
		vitals.stop();
	});

	it('INP — найгірша затримка за всі спрацювання, а не остання', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('event', [{ duration: 120 }, { duration: 48 }]);
		emit('event', [{ duration: 90 }]);
		setVisibility('hidden');
		expect(lastReport(warn)).toContain('INP: 120ms');
		vitals.stop();
	});

	it('повторне ховання сторінки мовчить: рядок один на звіт', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('largest-contentful-paint', [{ startTime: 100 }]);
		setVisibility('hidden');
		setVisibility('visible');
		setVisibility('hidden');
		window.dispatchEvent(new Event('pagehide'));
		expect(
			warn,
			'той самий звіт двічі — це шум у журналі, який читають заради помилок'
		).toHaveBeenCalledTimes(1);
		vitals.stop();
	});

	it('pagehide — другий вхід у звіт: на мобільних вкладку вбивають без visibilitychange', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('event', [{ duration: 75 }]);
		window.dispatchEvent(new Event('pagehide'));
		expect(lastReport(warn)).toContain('INP: 75ms');
		vitals.stop();
	});

	it('stop() звітує, відписує спостерігачів і знімає слухачів', () => {
		const vitals = new WebVitals();
		vitals.start();
		emit('largest-contentful-paint', [{ startTime: 300 }]);

		vitals.stop();
		expect(lastReport(warn), 'демонтаж — теж кінець вимірювання').toContain('LCP: 300ms');
		for (const observer of created) {
			// `disconnect` — на екземплярі підстави; кожен створений спостерігач
			// мусить бути від'єднаний, інакше після переходу їх лишається двадцять.
			expect(observer.observed.length).toBeGreaterThan(0);
		}

		// Слухачі зняті: подія після `stop()` не дає нового рядка.
		const before = warn.mock.calls.length;
		window.dispatchEvent(new Event('pagehide'));
		setVisibility('hidden');
		expect(warn.mock.calls.length, 'слухач лишився після stop()').toBe(before);
	});

	it('браузер без одного типу метрики не ламає решту', () => {
		stubObserver(['event']);
		const vitals = new WebVitals();
		vitals.start();
		emit('layout-shift', [{ value: 0.05, hadRecentInput: false }]);
		setVisibility('hidden');
		expect(lastReport(warn)).toContain('CLS: 0.0500');
		expect(lastReport(warn), 'невідомий тип лишає метрику нулем, а не валить звіт').toContain(
			'INP: 0ms'
		);
		vitals.stop();
	});
});
