/**
 * Підстава `$app/paths` для юніт-тестів — як `app-environment.ts` поруч.
 *
 * `$app/paths` генерує `svelte-kit sync`, і vitest його не резолвить: доти
 * будь-який тест, який хоч транзитивно тягнув `$lib/config/site`, падав на
 * імпорті ще до першого `it`. Саме тому модуль політики адрес — де живуть
 * `canonicalUrl`, `assetUrl` і межа «своє / чуже» на спільному origin — не був
 * покритий нічим.
 *
 * Значення ті самі, що в продакшн-збірці: база порожня, бо сайт на власному
 * домені (`svelte.config.js`, `paths.base: ''`). Підставити тут щось інше
 * означало б перевіряти формули на базі, якої в жодній збірці немає.
 */
export const base = '';
export const assets = '';

/** У збірці повертає шлях під базою; при порожній базі це те саме значення. */
export const asset = (path: string): string => `${base}${path}`;

/** `resolve('/about')` у SvelteKit віддає шлях маршруту з урахуванням бази. */
export const resolve = (path: string): string => `${base}${path}`;
