import { STORAGE_PREFIX } from '$lib/config/storage';

// Реекспорт: префікс переїхав у `$lib/config/storage`, поряд із `getStorageKey`.
// Місце для константи конфігурації — конфіг, а не утиліта міграції.
export { STORAGE_PREFIX };

const LEGACY_KEYS = [
    'theme',
    'backgroundType',
    'enableDynamicBackground',
    'enableBlurEffect',
    'lang'
];

/**
 * Migrates old localStorage keys to the new prefixed version.
 * Run this on application startup.
 */
export function migrateStorageKeys() {
    if (typeof window === 'undefined') return;

    // Єдине місце, якому фасад `$lib/services/storage` не підходить: міграція
    // читає ключі БЕЗ префікса, а фасад префікс додає завжди — на те він і є.
    // Тому тут прямий доступ, але обгорнутий: у приватному режимі й у чужому
    // iframe кидає вже сам `localStorage`, а міграція виконується на старті —
    // тобто виняток звідси поклав би сайт цілком.
    try {
        for (const key of LEGACY_KEYS) {
            const oldValue = localStorage.getItem(key);
            const newKey = STORAGE_PREFIX + key;

            // Переносимо, лише якщо старе значення є, а нового ще немає.
            if (oldValue !== null && localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, oldValue);
                // Origin спільний, тому старий ключ без префікса прибираємо:
                // інакше він лишається пасткою для сусіднього проєкту.
                localStorage.removeItem(key);
            }
        }
    } catch (e) {
        console.warn('[storageMigration] сховище недоступне — міграцію пропущено', e);
    }
}
