import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: true
}));

describe('as5 analytics service (dev guard)', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('мовчить у dev-режимі (ANALYTICS-v8 § 2.1, § 5)', async () => {
		const { track, trackPageView, initAnalytics } = await import('./analytics');
		const gtag = vi.fn();
		vi.stubGlobal('gtag', gtag);

		initAnalytics();
		track('contact_click', { channel: 'phone' });
		trackPageView();

		expect(gtag, 'у dev-режимі не повинно надсилатися жодної події').not.toHaveBeenCalled();
	});
});
