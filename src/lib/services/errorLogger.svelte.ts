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

/**
 * Запис у кеші помилок.
 *
 * Назва не `ErrorEvent`, як було: під цим іменем у DOM живе подія `window.error`,
 * і саме в цьому файлі вона тепер потрібна по-справжньому — інтерфейс затуляв би
 * її мовчки, а помилка була б у типі обробника, тобто там, де її ніхто не шукає.
 */
export interface LoggedError {
	id: string;
	level?: string;
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

import { session } from './storage';

const SESSION_STORAGE_KEY = 'logs_history';
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const SENSITIVE_PARAM = /^(token|access_token|code|state|key|api_?key|password|email)$/i;

function maskText(str: string): string {
	return str.replace(EMAIL_REGEX, '***@***.***');
}

function scrubUrl(raw: string): string {
	try {
		const url = new URL(raw);
		for (const name of [...url.searchParams.keys()]) {
			if (SENSITIVE_PARAM.test(name)) url.searchParams.set(name, '[REDACTED]');
		}
		return url.toString();
	} catch {
		return maskText(raw);
	}
}

class ErrorLogger {
	/**
	 * `$state`, бо довжину цього масиву читає табло на екрані.
	 */
	private cache = $state<LoggedError[]>([]);
	private readonly MAX_CACHE = 1000;
	private mirrorEnabled = true;

	constructor() {
		try {
			const saved = session.get(SESSION_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) this.cache = parsed;
			}
		} catch {
			// Ignore storage failure on init
		}
	}

	private mirror(): void {
		if (!this.mirrorEnabled) return;
		try {
			const ok = session.set(SESSION_STORAGE_KEY, JSON.stringify(this.cache));
			if (!ok) this.mirrorEnabled = false;
		} catch {
			this.mirrorEnabled = false;
		}
	}

	/** Слухачі вікна ставляться один раз: два комплекти писали б кожну помилку двічі. */
	private globalHandlersInstalled = false;

	/** Скільки помилок у кеші. Реактивне — саме це малює табло. */
	get errorCount(): number {
		return this.cache.filter(e => e.severity === 'high' || e.severity === 'critical' || !e.level || e.level === 'error').length;
	}

	/** Версія збірки. Одне джерело для звіту й для табла. */
	readonly appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';

	warn(component: string, message: string, cause?: unknown): void {
		const detail = cause instanceof Error ? cause.message : cause != null ? String(cause) : '';
		const msg = detail ? `${message}: ${detail}` : message;
		this.recordEntry('warn', 'medium', component, msg);
	}

	info(component: string, message: string): void {
		this.recordEntry('info', 'low', component, message);
	}

	private recordEntry(level: string, severity: LoggedError['severity'], component: string, rawMessage: string) {
		const event: LoggedError = {
			id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `log-${Date.now()}`,
			level,
			message: maskText(rawMessage),
			context: {
				timestamp: new Date().toISOString(),
				version: this.appVersion,
				userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
				component,
				page: typeof window !== 'undefined' ? scrubUrl(window.location.pathname) : 'unknown',
			},
			severity,
		};

		this.cache.push(event);
		if (this.cache.length > this.MAX_CACHE) this.cache.shift();
		this.mirror();
	}

	/**
	 * Log an error. Returns the generated error ID.
	 */
	logError(error: Error, context: Partial<LoggedError['context']> = {}): string {
		if (error.message && error.message.includes('ResizeObserver loop')) return '';
		const id = typeof crypto !== 'undefined'
			? crypto.randomUUID()
			: `err-${Date.now()}`;

		const event: LoggedError = {
			id,
			message: maskText(error.message),
			stack: error.stack ? maskText(error.stack) : undefined,
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

	private determineSeverity(message: string): LoggedError['severity'] {
		const lower = message.toLowerCase();
		if (lower.includes('memory') || lower.includes('outofmemory')) return 'critical';
		if (lower.includes('500') || lower.includes('database') || lower.includes('server')) return 'high';
		if (lower.includes('network') || lower.includes('fetch') || lower.includes('404')) return 'medium';
		return 'low';
	}

	getCache(): LoggedError[] {
		return [...this.cache];
	}

	/**
	 * Сітка безпеки для того, що не проходить через SvelteKit (ERROR-HANDLING-v8 § 5).
	 *
	 * **Що саме не проходило.** `hooks.client.ts` ловить лише помилки, які
	 * SvelteKit сам і веде: рендер, навігація, `load`. Виняток із обробника
	 * `onclick`, із `setTimeout` і БУДЬ-ЯКЕ неперехоплене відхилення промісу летять
	 * повз нього. Тобто найзвичайніші помилки браузера не потрапляли в кеш
	 * взагалі — а на екрані стоїть табло, яке показує його довжину. Нуль на ньому
	 * читався як «помилок немає», хоча в консолі їх могло бути скільки завгодно,
	 * і зібраний звіт приходив порожнім рівно тоді, коли був потрібен.
	 *
	 * Повертає функцію відписки, а не має пари `uninstall()`: її можна віддати
	 * прямо в cleanup ефекту, і забути про звільнення важче. Повторний виклик
	 * нічого не додає — слухачі ставляться один раз, бо два комплекти писали б
	 * кожну помилку двічі, а лічильник на таблі саме тому й реактивний.
	 */
	installGlobalHandlers(): () => void {
		if (typeof window === 'undefined' || this.globalHandlersInstalled) return () => {};
		this.globalHandlersInstalled = true;

		const onRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			this.logError(reason instanceof Error ? reason : new Error(String(reason)), {
				component: 'unhandled-rejection'
			});
		};

		// `WindowEventMap['error']` — саме подія DOM, а не запис кеша вище.
		const onError = (event: WindowEventMap['error']) => {
			if (event.message && event.message.includes('ResizeObserver loop')) return;
			// `event.error` буває порожнім: так приходять помилки зі стороннього
			// скрипта (`Script error.`). Тоді лишається хоч місце й повідомлення.
			const error =
				event.error instanceof Error
					? event.error
					: new Error(`${event.message} @ ${event.filename}:${event.lineno}`);
			this.logError(error, { component: 'window-error' });
		};

		window.addEventListener('unhandledrejection', onRejection);
		window.addEventListener('error', onError);

		return () => {
			window.removeEventListener('unhandledrejection', onRejection);
			window.removeEventListener('error', onError);
			this.globalHandlersInstalled = false;
		};
	}

	clearCache(): void {
		this.cache = [];
		this.mirror();
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
			`URL: ${inBrowser ? scrubUrl(window.location.href) : 'SSR'}`,
			`DEVICE: ${inBrowser ? navigator.userAgent : 'SSR'}`,
			`ONLINE: ${inBrowser ? navigator.onLine : 'n/a'}`,
			`ERRORS: ${this.errorCount}`,
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

export const logService = {
	get errorCount(): number {
		return errorLogger.errorCount;
	},
	get appVersion(): string {
		return errorLogger.appVersion;
	},
	info(category: string, message: string): void {
		errorLogger.info(category, message);
	},
	warn(category: string, message: string, cause?: unknown): void {
		errorLogger.warn(category, message, cause);
	},
	error(category: string, message: string, ...args: unknown[]): string {
		const err = args[0] instanceof Error ? args[0] : new Error(message);
		return errorLogger.logError(err, { component: category });
	},
	getReport(): string {
		return errorLogger.getReport();
	}
};
