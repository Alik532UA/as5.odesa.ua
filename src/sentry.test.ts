import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('as5 Sentry & Observability configuration (OBSERVABILITY-v8)', () => {
	const hooksClient = readFileSync('src/hooks.client.ts', 'utf8');

	it('DSN перевіряється перед ініціалізацією', () => {
		expect(hooksClient).toContain('PUBLIC_SENTRY_DSN');
	});

	it('передбачено фільтрацію очікуваних помилок (OBSERVABILITY-v8 § 1.6)', () => {
		expect(hooksClient).toContain('ignoreErrors');
		expect(hooksClient).toContain('AbortError');
		expect(hooksClient).toContain('Failed to fetch');
		expect(hooksClient).toContain('ResizeObserver loop limit exceeded');
	});

	it('передбачено маскування PII у beforeSend (OBSERVABILITY-v8 § 1.4)', () => {
		expect(hooksClient).toContain('beforeSend');
		expect(hooksClient).toContain('authorization');
		expect(hooksClient).toContain('cookie');
	});
});
