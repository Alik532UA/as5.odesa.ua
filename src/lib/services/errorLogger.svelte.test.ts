import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { errorLogger } from './errorLogger.svelte';

describe('ErrorLogger', () => {
	beforeEach(() => {
		errorLogger.clearCache();
	});

	it('returns an id when logging an error', () => {
		const id = errorLogger.logError(new Error('test'));
		expect(id).toBeTruthy();
		expect(typeof id).toBe('string');
	});

	it('stores error in cache', () => {
		errorLogger.logError(new Error('cached'));
		const cache = errorLogger.getCache();
		expect(cache).toHaveLength(1);
		expect(cache[0].message).toBe('cached');
	});

	it('determines severity for network errors', () => {
		errorLogger.logError(new Error('Network request failed'));
		const event = errorLogger.getCache()[0];
		expect(event.severity).toBe('medium');
	});

	it('determines severity for server errors', () => {
		errorLogger.logError(new Error('500 Internal Server Error'));
		const event = errorLogger.getCache()[0];
		expect(event.severity).toBe('high');
	});

	it('determines severity for memory errors', () => {
		errorLogger.logError(new Error('OutOfMemory exception'));
		const event = errorLogger.getCache()[0];
		expect(event.severity).toBe('critical');
	});

	it('defaults to low severity', () => {
		errorLogger.logError(new Error('some minor issue'));
		expect(errorLogger.getCache()[0].severity).toBe('low');
	});

	it('limits cache to MAX_CACHE entries', () => {
		for (let i = 0; i < 55; i++) {
			errorLogger.logError(new Error(`error ${i}`));
		}
		// MAX_CACHE is 50
		expect(errorLogger.getCache().length).toBeLessThanOrEqual(50);
	});

	it('clearCache empties the cache', () => {
		errorLogger.logError(new Error('x'));
		errorLogger.clearCache();
		expect(errorLogger.getCache()).toHaveLength(0);
	});

	it('accepts optional context', () => {
		errorLogger.logError(new Error('ctx'), { component: 'TestComp', page: '/test' });
		const event = errorLogger.getCache()[0];
		expect(event.context.component).toBe('TestComp');
		expect(event.context.page).toBe('/test');
	});

	// Версія — не косметика: без неї звіт від відвідувача неможливо прив'язати
	// до релізу, а «unknown» означає, що `define` у конфізі відвалився
	// (VERSIONING-v8 § 2).
	it('кожен запис несе версію збірки, а не unknown', () => {
		errorLogger.logError(new Error('boom'));
		const event = errorLogger.getCache()[0];
		expect(event.context.version).toMatch(/^\d+\.\d+\.\d+/);
	});
});

/**
 * Сітка безпеки над помилками поза SvelteKit (ERROR-HANDLING-v8 § 5).
 *
 * Зворотний експеримент: прибрати `window.addEventListener('unhandledrejection')`
 * — червоніє перший тест; прибрати слухач `error` — другий; повернути установку
 * без прапорця `globalHandlersInstalled` — третій (запис зʼявляється двічі).
 */
describe('ErrorLogger: глобальні обробники', () => {
	let uninstall = () => {};

	beforeEach(() => {
		errorLogger.clearCache();
		uninstall = errorLogger.installGlobalHandlers();
	});

	afterEach(() => uninstall());

	/** jsdom не має конструктора `PromiseRejectionEvent`, тож подія збирається руками. */
	function reject(reason: unknown) {
		const event = new Event('unhandledrejection') as Event & { reason?: unknown };
		event.reason = reason;
		window.dispatchEvent(event);
	}

	it('неперехоплене відхилення промісу потрапляє в кеш', () => {
		reject(new Error('промісу ніхто не дав catch'));

		const cache = errorLogger.getCache();
		expect(cache).toHaveLength(1);
		expect(cache[0].message).toBe('промісу ніхто не дав catch');
		expect(cache[0].context.component).toBe('unhandled-rejection');
	});

	it('відхилення НЕ помилкою теж рахується', () => {
		// `Promise.reject('рядок')` — часта форма, і без приведення вона давала б
		// запис без повідомлення взагалі.
		reject('рядок замість Error');

		expect(errorLogger.getCache()[0].message).toBe('рядок замість Error');
	});

	it('виняток із обробника події потрапляє в кеш', () => {
		window.dispatchEvent(
			new window.ErrorEvent('error', {
				error: new Error('впало в onclick'),
				message: 'впало в onclick',
				filename: 'app.js',
				lineno: 42
			})
		);

		const cache = errorLogger.getCache();
		expect(cache).toHaveLength(1);
		expect(cache[0].context.component).toBe('window-error');
	});

	it('повторна установка не подвоює записи', () => {
		const second = errorLogger.installGlobalHandlers();
		reject(new Error('одна помилка'));
		second();

		expect(errorLogger.getCache()).toHaveLength(1);
	});

	it('відписка справді знімає слухачів', () => {
		uninstall();
		uninstall = () => {};

		reject(new Error('після відписки'));

		expect(errorLogger.getCache()).toEqual([]);
	});
});
