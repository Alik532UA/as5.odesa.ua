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

		console.error(`[ErrorLogger] ${event.severity.toUpperCase()}:`, error.message, event);
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
