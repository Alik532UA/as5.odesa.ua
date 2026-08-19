// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** Підставляється Vite зі `package.json` під час збірки (див. vite.config.ts). */
	const __APP_VERSION__: string;

	namespace App {
		/**
		 * Форма `page.error`. `errorId` кладе `hooks.client.ts`, показує
		 * `+error.svelte` — за ним запис знаходиться в `errorLogger.getCache()`.
		 *
		 * Доти інтерфейс був закоментований, тобто `errorId` існував лише як
		 * властивість, яку ніхто не оголошував: типи про нього не знали, і
		 * сторінка помилки не мала як його прочитати.
		 */
		interface Error {
			message: string;
			errorId?: string;
		}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
