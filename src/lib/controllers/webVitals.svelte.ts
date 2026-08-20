import { browser } from '$app/environment';

/**
 * Core Web Vitals collection (OBSERVABILITY-v8 § 2.1).
 *
 * Tracks LCP, CLS, and INP via PerformanceObserver.
 */
export class WebVitals {
	#observers: PerformanceObserver[] = [];
	#cls = 0;

	start(): () => void {
		if (!browser || !('PerformanceObserver' in window)) {
			return () => {};
		}

		this.#observe('largest-contentful-paint', (entries) => {
			const last = entries.at(-1);
			if (last) console.info(`[Performance] LCP: ${last.startTime.toFixed(0)}ms`);
		});

		this.#observe('layout-shift', (entries) => {
			const shiftEntries = entries as unknown as Array<
				PerformanceEntry & { value: number; hadRecentInput: boolean }
			>;
			for (const entry of shiftEntries) {
				if (!entry.hadRecentInput) this.#cls += entry.value;
			}
			console.info(`[Performance] CLS: ${this.#cls.toFixed(4)}`);
		});

		this.#observe('event', (entries) => {
			const worst = Math.max(...entries.map((e) => e.duration));
			if (worst > 0) console.info(`[Performance] INP: ${worst.toFixed(0)}ms`);
		});

		return () => this.stop();
	}

	stop() {
		for (const observer of this.#observers) observer.disconnect();
		this.#observers = [];
	}

	#observe(type: string, handler: (entries: PerformanceEntry[]) => void) {
		try {
			const observer = new PerformanceObserver((list) => handler(list.getEntries()));
			observer.observe({
				type,
				buffered: true,
				durationThreshold: 40
			} as unknown as PerformanceObserverInit);
			this.#observers.push(observer);
		} catch {
			console.warn(`PerformanceObserver does not support "${type}"`);
		}
	}
}

export const webVitals = new WebVitals();
