import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from './storage';
import { STORAGE_PREFIX } from '$lib/config/storage';

/** Мінімальне сховище в пам'яті — обходить особливості localStorage у jsdom. */
function makeMemoryStorage(overrides: Partial<Storage> = {}): Storage {
	const m = new Map<string, string>();
	return {
		get length() {
			return m.size;
		},
		key: (i: number) => Array.from(m.keys())[i] ?? null,
		getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
		setItem: (k: string, v: string) => {
			m.set(k, String(v));
		},
		removeItem: (k: string) => {
			m.delete(k);
		},
		clear: () => {
			m.clear();
		},
		...overrides
	} as Storage;
}

/**
 * Прапорець «сховище відмовило» живе в модулі й не скидається між тестами.
 * Тому кожен тест на відмову бере СВІЙ екземпляр модуля — інакше перший із
 * них вимкнув би сховище для решти, і ті проходили б з неправильної причини.
 */
async function freshStorage(localStorageStub: unknown) {
	vi.resetModules();
	vi.stubGlobal('localStorage', localStorageStub);
	return (await import('./storage')).storage;
}

describe('фасад сховища', () => {
	beforeEach(() => vi.stubGlobal('localStorage', makeMemoryStorage()));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('додає префікс до кожного ключа', () => {
		storage.set('theme', 'dark');
		expect(localStorage.getItem(STORAGE_PREFIX + 'theme')).toBe('dark');
		// Ключ без префікса лишається чужим і незайманим.
		expect(localStorage.getItem('theme')).toBeNull();
		expect(storage.get('theme')).toBe('dark');
	});

	it('remove() видаляє саме префіксований ключ', () => {
		storage.set('lang', 'uk');
		storage.remove('lang');
		expect(storage.get('lang')).toBeNull();
	});

	it('get() повертає null для відсутнього ключа', () => {
		expect(storage.get('missing')).toBeNull();
	});

	it('clear() чистить лише свої ключі, а чужі не чіпає', () => {
		storage.set('theme', 'dark');
		storage.set('lang', 'uk');
		// Сусідній проєкт на тому самому origin:
		localStorage.setItem('other-project_theme', 'light');
		localStorage.setItem('theme', 'light');

		storage.clear();

		expect(storage.get('theme')).toBeNull();
		expect(storage.get('lang')).toBeNull();
		expect(localStorage.getItem('other-project_theme')).toBe('light');
		expect(localStorage.getItem('theme')).toBe('light');
	});

	// --- Далі — те, через що фасад узагалі існує: він не кидає. ---

	it('set() повертає false, а не кидає, коли скінчилася квота', async () => {
		const s = await freshStorage(
			makeMemoryStorage({
				setItem: () => {
					throw new DOMException('quota', 'QuotaExceededError');
				}
			})
		);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(() => s.set('theme', 'dark')).not.toThrow();
		expect(s.set('theme', 'dark')).toBe(false);
	});

	it('get() повертає null, а не кидає, коли читання падає', async () => {
		const s = await freshStorage(
			makeMemoryStorage({
				getItem: () => {
					throw new DOMException('denied', 'SecurityError');
				}
			})
		);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(s.get('theme')).toBeNull();
	});

	it('виживає, коли кидає сам доступ до localStorage (iframe без прав)', async () => {
		vi.resetModules();
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get() {
				throw new DOMException('blocked', 'SecurityError');
			}
		});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const s = (await import('./storage')).storage;
		expect(s.get('theme')).toBeNull();
		expect(s.set('theme', 'dark')).toBe(false);
		expect(() => s.clear()).not.toThrow();
	});

	it('попереджає в консоль один раз, а не на кожен виклик', async () => {
		const s = await freshStorage(
			makeMemoryStorage({
				setItem: () => {
					throw new DOMException('quota', 'QuotaExceededError');
				}
			})
		);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		s.set('a', '1');
		s.set('b', '2');
		s.set('c', '3');
		expect(warn).toHaveBeenCalledTimes(1);
	});
});

/**
 * PRERENDER: фасад не торкається `localStorage` ЗОВСІМ.
 *
 * Не «повертає null» — саме не торкається. Раніше єдиним захистом був
 * `typeof localStorage !== 'undefined'`, і сучасний Node його проходить:
 * глобальний `localStorage` там є, а `getItem` у нього `undefined` (заміряно
 * на 25.4.0). Тому кожна збірка друкувала «[storage] сховище недоступне (get
 * «betaChecklist»)» — попередження, що читається як дефект сайту й ним не є.
 *
 * Гірше за шум: `available` живе в модулі, а prerender виконує всі сторінки в
 * ОДНОМУ процесі, тож одна відмова вимикала фасад до кінця збірки.
 *
 * Стенд відтворює саме ту форму — обʼєкт БЕЗ методів, а не `undefined`, — бо
 * стенд із `undefined` проходив би й зі старим кодом.
 *
 * ПЕРЕВІРЯЄТЬСЯ ДОТИК, а не результат, і це не педантизм. Старий код теж
 * віддавав `null`: `getItem` кидав `TypeError`, і його ловив власний
 * `try/catch` фасаду. Тобто правильна відповідь досягалася шляхом помилки — з
 * попередженням у консоль і зі спаленим `available`. Перевірка на `null`
 * такої різниці не бачить, тому стенд рахує звернення до властивостей.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1), прогнано: прибрати
 * `!browser` із `ls()` — червоніють обидві перевірки, перша з переліком
 * зачеплених властивостей, друга із зайвим попередженням.
 */
describe('фасад під prerender (browser === false)', () => {
	/** Що саме фасад спробував прочитати з глобального обʼєкта. */
	let touched: string[] = [];

	/**
	 * Те, що бачить SvelteKit під час prerender на Node ≥ 22: обʼєкт є, методів
	 * у нього немає. `Proxy` записує кожне звернення, тож «не торкався» стає
	 * перевірним твердженням.
	 */
	function nodeStub(): Storage {
		return new Proxy(
			{ length: 0 },
			{
				get(target, prop) {
					touched.push(String(prop));
					return Reflect.get(target, prop);
				}
			}
		) as unknown as Storage;
	}

	async function ssrStorage() {
		vi.resetModules();
		touched = [];
		vi.doMock('$app/environment', () => ({ browser: false, dev: false, building: true }));
		vi.stubGlobal('localStorage', nodeStub());
		return (await import('./storage')).storage;
	}

	afterEach(() => {
		vi.doUnmock('$app/environment');
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('не торкається localStorage жодною операцією', async () => {
		const s = await ssrStorage();
		expect(s.get('betaChecklist')).toBeNull();
		expect(s.set('theme', 'dark')).toBe(false);
		s.remove('lang');
		s.clear();
		expect(touched, `фасад звернувся до localStorage: ${touched.join(', ')}`).toEqual([]);
	});

	it('мовчить: жодного попередження в консоль під час збірки', async () => {
		const s = await ssrStorage();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		s.get('betaChecklist');
		s.set('theme', 'dark');
		s.remove('lang');
		s.clear();
		expect(warn, 'збірка не мусить друкувати попереджень про сховище').not.toHaveBeenCalled();
	});
});
