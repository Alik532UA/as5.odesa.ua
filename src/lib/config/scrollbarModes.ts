/**
 * Перелік режимів смуги прокрутки — один на всі місця (SCROLLBAR § 2.2).
 *
 * Споживачів двоє: контекстне меню самої смуги й панель налаштувань. Дві копії
 * розійшлися б при додаванні режиму, і в одному з місць його забули б.
 *
 * ## Чому режимів два
 *
 * Мінімапа — окремий опційний файл канону (`MINIMAP.md`), який потребує цього,
 * а не навпаки. Вона коштує шістсот рядків із клоном DOM і власними пастками, а
 * сенс має на довгих сторінках із багатьма блоками; тут сторінки короткі.
 * Додати її можна будь-коли: `active` у `states/scrollbar.svelte.ts` — єдине
 * місце, яке про це знає.
 */
export type ScrollbarMode = 'standard' | 'custom';

export const SCROLLBAR_MODE_IDS = ['standard', 'custom'] as const satisfies readonly ScrollbarMode[];

/** Порядок — від звичного до власного: нативна, потім накладка. */
export const SCROLLBAR_MODES: { id: ScrollbarMode; key: string }[] = [
	{ id: 'standard', key: 'settings.scrollbarStandard' },
	{ id: 'custom', key: 'settings.scrollbarCustom' }
];

export function isScrollbarMode(value: unknown): value is ScrollbarMode {
	return typeof value === 'string' && (SCROLLBAR_MODE_IDS as readonly string[]).includes(value);
}
