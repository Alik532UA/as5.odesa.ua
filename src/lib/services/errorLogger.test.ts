import { describe, it, expect, beforeEach } from 'vitest';
import { errorLogger, logService } from './errorLogger.svelte';

describe('as5 errorLogger and logService', () => {
	beforeEach(() => {
		errorLogger.clearCache();
	});

	it('tracks errorCount correctly for error, warn, and info', () => {
		expect(errorLogger.errorCount).toBe(0);

		logService.info('app', 'system started');
		expect(errorLogger.errorCount).toBe(0);

		logService.warn('network', 'slow connection');
		expect(errorLogger.errorCount).toBe(0);

		logService.error('app', 'something went wrong');
		expect(errorLogger.errorCount).toBe(1);
	});

	it('scrubs email addresses from messages', () => {
		logService.error('app', 'Failed for test.user@example.com');
		const cache = errorLogger.getCache();
		expect(cache[0].message).not.toContain('test.user@example.com');
		expect(cache[0].message).toContain('***@***.***');
	});

	it('generates report containing required fields', () => {
		logService.error('app', 'test failure');
		const report = errorLogger.getReport();
		expect(report).toContain('--- LOG REPORT ---');
		expect(report).toContain('VERSION:');
		expect(report).toContain('test failure');
	});
});
