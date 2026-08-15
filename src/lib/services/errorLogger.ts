/**
 * Client-side error logging service.
 * Stores recent errors in memory and optionally sends them to a server endpoint.
 */

export interface ErrorEvent {
	id: string;
	message: string;
	stack?: string;
	context: {
		component?: string;
		page?: string;
		timestamp: string;
		userAgent: string;
		/** Версія збірки: без неї звіт неможливо прив'язати до релізу. */
		version: string;
	};
	severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorLogger {
	private cache: ErrorEvent[] = [];
	private readonly MAX_CACHE = 50;

	/**
	 * Log an error. Returns the generated error ID.
	 */
	logError(error: Error, context: Partial<ErrorEvent['context']> = {}): string {
		const id = typeof crypto !== 'undefined'
			? crypto.randomUUID()
			: `err-${Date.now()}`;

		const event: ErrorEvent = {
			id,
			message: error.message,
			stack: error.stack,
			context: {
				timestamp: new Date().toISOString(),
				// Не хардкод: значення підставляє Vite зі package.json
				// (VERSIONING-v8 § 2 — версія у копійованих логах).
				version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
				userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
				...context,
				page: context.page ?? (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
			},
			severity: this.determineSeverity(error.message),
		};

		this.cache.push(event);
		if (this.cache.length > this.MAX_CACHE) {
			this.cache.shift();
		}

		// Рівень консолі йде за severity, а не завжди `error`
		// (CODE-QUALITY-v8 § 3.6, ERROR-HANDLING-v8 § 1.4). `medium` — це
		// `network`/`fetch`/`404`, тобто зниклий wi-fi і скасована навігація:
		// очікувані стани, а не порушений інваріант. Лічильник помилок у
		// DevTools — індикатор, і засмічувати його нормальними станами означає
		// зробити його марним рівно тоді, коли за ним прийдуть.
		const write = event.severity === 'high' || event.severity === 'critical' ? console.error : console.warn;
		write(`[ErrorLogger] ${event.severity.toUpperCase()}:`, error.message, event);
		return id;
	}

	private determineSeverity(message: string): ErrorEvent['severity'] {
		const lower = message.toLowerCase();
		if (lower.includes('memory') || lower.includes('outofmemory')) return 'critical';
		if (lower.includes('500') || lower.includes('database') || lower.includes('server')) return 'high';
		if (lower.includes('network') || lower.includes('fetch') || lower.includes('404')) return 'medium';
		return 'low';
	}

	getCache(): ErrorEvent[] {
		return [...this.cache];
	}

	clearCache(): void {
		this.cache = [];
	}
}

export const errorLogger = new ErrorLogger();
