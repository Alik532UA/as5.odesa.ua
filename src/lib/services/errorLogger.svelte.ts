/**
 * Client-side error logging service.
 * Stores recent errors in memory and optionally sends them to a server endpoint.
 *
 * **Чому `.svelte.ts`, а не звичайний `.ts`.** Кеш став `$state`, бо його довжину
 * тепер показує службове табло (`ui/ServiceBadge.svelte`): без рун лічильник на
 * екрані оновлювався б лише при перемальовуванні з іншої причини, тобто виглядав
 * би як «помилок немає». Модуль лишається придатним для не-Svelte контексту —
 * `hooks.client.ts` імпортує його так само, як імпортував.
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
	/**
	 * `$state`, бо довжину цього масиву читає табло на екрані.
	 *
	 * Масив, а не окремий лічильник: два поля розійшлися б рівно в той момент, коли
	 * кеш обрізається по `MAX_CACHE`, і на екрані лишилося б число, якого в кеші
	 * більше немає.
	 */
	private cache = $state<ErrorEvent[]>([]);
	private readonly MAX_CACHE = 50;

	/** Скільки помилок у кеші. Реактивне — саме це малює табло. */
	get errorCount(): number {
		return this.cache.length;
	}

	/** Версія збірки. Одне джерело для звіту й для табла. */
	readonly appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';

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

	/**
	 * Текстовий звіт для копіювання в буфер (DEBUGGING-v8 § 2.3).
	 *
	 * Шапка тут, а не в компоненті кнопки: копіювати звіт може не одна кнопка, і
	 * друга склала б свою шапку — так у сусідньому проєкті й вийшло, де версія
	 * збігалася, а адреси, пристрою й стану мережі в одному з двох варіантів не було
	 * взагалі.
	 *
	 * `ONLINE` — не прикраса: половина скарг «нічого не працює» пояснюється саме цим
	 * рядком, і дізнатися це заднім числом уже неможливо.
	 *
	 * Час в ISO, а не `toLocaleString()`: звіт читає той, хто розбирає збій, а не
	 * відвідувач, який його скопіював. `toLocaleString()` форматує в локалі СИСТЕМИ
	 * відвідувача — `03.08` чи `08.03` залежно від того, де він живе, і зрозуміти,
	 * що з них день, за самим рядком не можна.
	 */
	getReport(): string {
		const inBrowser = typeof window !== 'undefined';
		const header = [
			'--- LOG REPORT ---',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${this.appVersion}`,
			`URL: ${inBrowser ? window.location.href : 'SSR'}`,
			`DEVICE: ${inBrowser ? navigator.userAgent : 'SSR'}`,
			`ONLINE: ${inBrowser ? navigator.onLine : 'n/a'}`,
			`ERRORS: ${this.cache.length}`,
			'---'
		].join('\n');

		const body = this.cache
			.map(
				(e) =>
					`[${e.context.timestamp}] [${e.severity.toUpperCase()}] ${e.message}` +
					(e.context.component ? ` (${e.context.component})` : '') +
					(e.stack ? `\n${e.stack}` : '')
			)
			.join('\n');

		return `${header}\n${body}`;
	}
}

export const errorLogger = new ErrorLogger();
