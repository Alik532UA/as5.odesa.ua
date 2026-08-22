import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ERROR-HANDLING-v8 § 2.4 — гачок неперехоплених помилок клієнта.
 *
 * **Чому цей файл замінив `sentry.test.ts`.** Той читав `src/hooks.client.ts`
 * як РЯДОК і перевіряв, що в ньому трапляються підрядки `beforeSend`,
 * `ignoreErrors`, `authorization`. Такий тест зелений над будь-яким мертвим
 * кодом — він і був зелений над блоком Sentry, який не міг виконатися в
 * принципі (пакета немає в залежностях). Перевірка наявності тексту закриває
 * пункт канону, нічого не перевіривши.
 *
 * Зворотний експеримент: прибрати `if (status === 404) return` — падає перша
 * перевірка.
 */

// Мок типізований під справжню сигнатуру `errorLogger.logError`: інакше
// `mock.calls[0]` має тип порожнього кортежа, і `svelte-check` завертає
// кожне звернення до аргументів.
const logError = vi.fn(
  (_error: Error, _context: Record<string, unknown>): string => "err-1",
);
vi.mock("$lib/services/errorLogger.svelte", () => ({
  errorLogger: { logError },
}));

const event = { url: new URL("https://example.com/history") } as never;

describe("handleError клієнта", () => {
  beforeEach(() => {
    logError.mockClear();
  });

  const call = async (status: number, error: unknown) => {
    const { handleError } = await import("./hooks.client");
    return handleError({ error, event, status, message: String(status) });
  };

  it("404 НЕ потрапляє ні в журнал, ні в лічильник помилок", async () => {
    const result = await call(404, new Error("Not Found"));

    expect(
      logError,
      "помилкова адреса — не збій застосунку",
    ).not.toHaveBeenCalled();
    expect(
      result,
      "повернення значення намалювало б сторінку помилки як збій",
    ).toBeUndefined();
  });

  it("справжня помилка потрапляє в журнал разом зі шляхом", async () => {
    await call(500, new Error("boom"));

    expect(logError).toHaveBeenCalledTimes(1);
    const [normalized, context] = logError.mock.calls[0];
    expect(normalized.message).toBe("boom");
    expect(context.page).toBe("/history");
  });

  it("віддається КЛЮЧ і errorId, а не текст рантайму", async () => {
    const result = await call(
      500,
      new Error("Cannot read properties of undefined"),
    );

    // Ключ, бо сторінка помилки перекладає його сама; `errorId` дає людині
    // що назвати у зверненні, не показуючи нутрощів застосунку.
    expect(result?.message).toBe("unexpected-client-error");
    expect((result as { errorId?: string })?.errorId).toBe("err-1");
  });

  it("не-Error теж переживає нормалізацію, а не падає всередині гачка", async () => {
    await expect(call(500, "рядок замість Error")).resolves.toBeTruthy();
    const [normalized] = logError.mock.calls[0];
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toContain("рядок замість Error");
  });
});
