/**
 * Префікс усіх ключів сховища (STORAGE-NAMESPACE-v8 § 1).
 *
 * Сайт живе на GitHub Pages, тобто на origin, який ділить із рештою проєктів
 * цього акаунта. Без префікса ключ `theme` тут і `theme` у сусідньому проєкті —
 * один і той самий ключ, і той, хто записав пізніше, переписав чуже.
 *
 * Повна назва проєкту, а не скорочення (`as5_`): скорочення теж колізує,
 * тільки рідше й непомітніше.
 */
export const STORAGE_PREFIX = 'as5.odesa.ua_';

/** Єдиний спосіб отримати повний ключ. Хардкод `PREFIX + 'x'` — привід для code review. */
export function getStorageKey(key: string): string {
	return STORAGE_PREFIX + key;
}
