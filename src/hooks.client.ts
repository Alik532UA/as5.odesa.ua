import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import type { HandleClientError } from '@sveltejs/kit';
import { errorLogger } from '$lib/services/errorLogger.svelte';

/**
 * Telemetry endpoint for CSP validation (OBSERVABILITY-v8 § 1.5):
 * - https://*.sentry.io
 * - https://*.ingest.sentry.io
 */
const DSN = env.PUBLIC_SENTRY_DSN || '';
const sentryPkg = '@sentry/sveltekit';

interface SentryClient {
	init: (options: Record<string, unknown>) => void;
	captureException: (error: unknown, context?: Record<string, unknown>) => void;
}

const tracker: Promise<SentryClient | null> | null =
	DSN && !dev
		? import(/* @vite-ignore */ sentryPkg)
				.then((module: unknown) => {
					const Sentry = module as SentryClient;
					Sentry.init({
						dsn: DSN,
						enabled: !dev,
						tracesSampleRate: 0.1,
						replaysSessionSampleRate: 0.0,
						replaysOnErrorSampleRate: 1.0,
						environment: import.meta.env.MODE,
						ignoreErrors: ['AbortError', 'Failed to fetch', 'ResizeObserver loop limit exceeded'],
						beforeSend(event: Record<string, unknown>) {
							const req = event.request as Record<string, Record<string, unknown>> | undefined;
							if (req?.headers) {
								delete req.headers['authorization'];
								delete req.headers['cookie'];
							}
							return event;
						}
					});
					return Sentry;
				})
				.catch(() => null)
		: null;

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
	if (status === 404) return;

	const normalized = error instanceof Error ? error : new Error(String(error));
	const errorId = errorLogger.logError(normalized, {
		component: 'client-unhandled',
		page: event?.url?.pathname
	});

	if (tracker) {
		const Sentry = await tracker;
		Sentry?.captureException(error, { extra: { route: event?.url?.pathname, status, message, errorId } });
	}

	return { message: 'unexpected-client-error', errorId };
};
