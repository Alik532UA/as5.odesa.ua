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
