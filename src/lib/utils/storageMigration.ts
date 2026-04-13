/**
 * Storage isolation prefix for as5.odesa.ua
 */
export const STORAGE_PREFIX = 'as5.odesa.ua_';

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

    for (const key of LEGACY_KEYS) {
        const oldValue = localStorage.getItem(key);
        const newKey = STORAGE_PREFIX + key;
        
        // If old value exists and new one doesn't yet, migrate it
        if (oldValue !== null && localStorage.getItem(newKey) === null) {
            localStorage.setItem(newKey, oldValue);
            // We don't remove the old key immediately to be safe, 
            // but the instructions suggested removal. 
            // Given it's a shared domain, removal is better to clean up.
            localStorage.removeItem(key);
            console.log(`[StorageMigration] Migrated ${key} -> ${newKey}`);
        }
    }
}
