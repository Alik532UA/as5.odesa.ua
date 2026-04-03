import { describe, it, expect, beforeEach } from 'vitest';
import { errorLogger, type ErrorEvent } from './errorLogger';

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
});
