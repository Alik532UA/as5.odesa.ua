import type { HandleClientError } from "@sveltejs/kit";
import { errorLogger } from "$lib/services/errorLogger.svelte";

/**
 * Неперехоплені помилки клієнта (ERROR-HANDLING-v8 § 2.4).
 *
 * Гачок спрацьовує лише на НЕОЧІКУВАНІ помилки: `error()` і `redirect()` через
 * нього не проходять, тож 404 сюди не потрапляє. Перевірка статусу нижче —
 * дешева перестраховка, щоб у журналі не з'явився шум.
 *
 * **Тут НЕМАЄ Sentry, і це рішення, а не пропуск.** Блок ініціалізації
 * `@sentry/sveltekit` тут стояв і не працював жодного разу: пакета немає в
 * залежностях, тож імпорт писався через змінну з `@vite-ignore`, аби збірка не
 * впала на нерозв'язному модулі. У браузері голий специфікатор не резолвиться
 * в принципі, а `.catch(() => null)` ковтав це мовчки. DSN при цьому не
 * заданий ніде. OBSERVABILITY-v8 має «Пріоритет: optional» і «Скіп-якщо:
 * хобі-проєкт без активних користувачів», тож правильна відповідь — не
 * імітувати трекінг, а не мати його. Збір звітів робить `errorLogger` і кнопка
 * копіювання на службовому таблі.
 */
export const handleError: HandleClientError = ({ error, event, status }) => {
  if (status === 404) return;

  const normalized = error instanceof Error ? error : new Error(String(error));
  const errorId = errorLogger.logError(normalized, {
    component: "client-unhandled",
    page: event?.url?.pathname,
  });

  // Ключ, а не текст: сторінка помилки перекладає його сама. `errorId`
  // дає людині що назвати у зверненні, не показуючи нутрощів застосунку.
  return { message: "unexpected-client-error", errorId };
};
