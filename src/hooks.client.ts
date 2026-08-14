import type { HandleClientError } from '@sveltejs/kit';
import { errorLogger } from '$lib/services/errorLogger';

/**
 * Неперехоплені помилки клієнта (ERROR-HANDLING-v8 § 2.4).
 *
 * ## Чому цей файл узагалі знадобився
 *
 * `errorLogger` у проєкті був: написаний, з кешем на 50 записів і дев'ятьма
 * зеленими тестами. Але його не імпортував ЖОДЕН файл. Тобто логування помилок
 * існувало як код і не існувало як поведінка — рівно випадок «існування ≠
 * досяжність» з AI-AGENT-PITFALLS-v8 § 3, і найгірший його різновид: зелені
 * тести створювали враження, що все працює.
 *
 * Тепер сервіс має точку входу. Будь-яка помилка, яку не спіймали в місці
 * виникнення, потрапляє в кеш і має свій `errorId`.
 *
 * ## Що повертається відвідувачу
 *
 * Узагальнене повідомлення, а не `error.message`. Текст від рантайму
 * («Cannot read properties of undefined») відвідувачу сайту школи нічого не
 * пояснює, зате показує нутрощі застосунку. `errorId` лишається в об'єкті:
 * його видно на сторінці помилки, його можна назвати в листі, і за ним запис
 * знаходиться в `errorLogger.getCache()`.
 *
 * Гачок спрацьовує лише на НЕОЧІКУВАНІ помилки: `error()` і `redirect()` через
 * нього не проходять, тож 404 сюди не потрапляє. Перевірка статусу нижче —
 * дешева перестраховка, щоб у кеші не з'явився шум.
 */
export const handleError: HandleClientError = ({ error, event, status }) => {
	if (status === 404) return;

	const normalized = error instanceof Error ? error : new Error(String(error));
	const errorId = errorLogger.logError(normalized, {
		component: 'client-unhandled',
		page: event?.url?.pathname
	});

	return { message: 'Сталася помилка. Спробуйте оновити сторінку.', errorId };
};
