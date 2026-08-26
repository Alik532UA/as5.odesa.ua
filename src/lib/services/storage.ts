import { browser } from '$app/environment';
import { STORAGE_PREFIX, getStorageKey } from '$lib/config/storage';

/**
 * Фасад над `localStorage` (STORAGE-NAMESPACE-v8).
 *
 * Єдина точка входу до сховища. Він:
 *  - додає префікс проєкту до КОЖНОГО ключа (ізоляція на спільному origin),
 *  - безпечний під SSR/prerender (повертає `null`, нічого не кидає),
 *  - у `clear()` видаляє лише СВОЇ ключі — дані сусідніх проєктів не чіпає,
 *  - **ніколи не кидає**, що б не робив браузер.
 *
 * ## Чому «не кидає» — це головне, а не дрібниця
 *
 * Перевірити `typeof localStorage !== 'undefined'` (як було в `ui.svelte.ts`)
 * не досить НІ для SSR, ні для браузера — сховище може бути на місці й кидати,
 * а під Node воно на місці й несправне (див. `ls()` нижче).
 *
 * - `setItem` кидає `QuotaExceededError` при переповненні;
 * - у приватному режимі частини браузерів запис кидає завжди;
 * - у сторінці, відкритій у чужому iframe із заблокованим стороннім сховищем,
 *   кидає вже сам ДОСТУП до `localStorage` — `SecurityError` летить із
 *   `typeof`-перевірки, тобто до будь-якого try/catch у місці виклику.
 *
 * Тут це коштувало б перемиканням теми, мови й тла: усі вони писали в сховище
 * голим `setItem`. Достатньо одного забутого місця, щоб збій сховища став
 * збоєм сайту, тому обробка живе у фасаді, а не в місцях виклику.
 *
 * Виняток один і свідомий: інлайновий скрипт у `app.html`. Він мусить
 * виконатися до гідратації, щоб тема не блимала, тому читає повний ключ
 * `as5.odesa.ua_theme` напряму.
 */

/**
 * Вимикається назавжди після першої відмови. У приватному режимі відмова не
 * тимчасова, і без цього прапорця кожен наступний виклик знову йшов би у те
 * саме виключення — сотні спроб за сесію і засмічена консоль.
 */
let available = true;

function fail(operation: string, key: string, error: unknown): void {
	if (available) {
		// Одне попередження на сесію, не на виклик.
		console.warn(`[storage] сховище недоступне (${operation} «${key}») — працюємо без нього`, error);
	}
	available = false;
}

/**
 * Сховище або `null`. Порядок перевірок тут — не смак.
 *
 * `browser` СТОЇТЬ ПЕРШИМ і замінює собою `typeof localStorage`, який тут був.
 * Докблок вище стверджував, що `typeof` «досить для SSR», і з Node 22 це
 * перестало бути правдою: сучасний Node оголошує глобальний `localStorage` як
 * обʼєкт, у якого `getItem` — `undefined`. Заміряно на Node 25.4.0:
 *
 *     typeof localStorage === 'object'
 *     localStorage.getItem === undefined
 *
 * Тобто перевірка проходила, а перший же виклик кидав
 * `TypeError: t.getItem is not a function`. Симптом було видно в КОЖНІЙ
 * збірці: prerender сторінки чеклиста друкував «[storage] сховище недоступне
 * (get «betaChecklist»)» — попередження, що читається як справжній дефект
 * сайту й ним не є.
 *
 * Гірша половина — прапорець `available`. Prerender виконує всі сторінки в
 * ОДНОМУ процесі, тож одна відмова вимикала фасад до кінця збірки. Наслідку
 * для виводу не було лише тому, що під prerender сховище й мусить мовчати, —
 * але правильна відповідь досягалася через шлях помилки.
 *
 * `!browser` НЕ палить `available`: це не відмова сховища, а середовище без
 * нього. Інакше перший же серверний виклик вимикав би фасад назавжди.
 */
function ls(): Storage | null {
	if (!available || !browser) return null;
	try {
		return typeof localStorage !== 'undefined' ? localStorage : null;
	} catch (e) {
		// Кидає сам доступ до властивості: iframe без прав на стороннє сховище.
		fail('access', '—', e);
		return null;
	}
}

export const storage = {
	get(key: string): string | null {
		const store = ls();
		if (!store) return null;
		try {
			return store.getItem(getStorageKey(key)) ?? null;
		} catch (e) {
			fail('get', key, e);
			return null;
		}
	},
	/** `false` означає, що значення НЕ збережено — квота, приватний режим або SSR. */
	set(key: string, value: string): boolean {
		const store = ls();
		if (!store) return false;
		try {
			store.setItem(getStorageKey(key), value);
			return true;
		} catch (e) {
			// Втратити збереження прийнятно; втратити сайт — ні.
			fail('set', key, e);
			return false;
		}
	},
	remove(key: string): void {
		const store = ls();
		if (!store) return;
		try {
			store.removeItem(getStorageKey(key));
		} catch (e) {
			fail('remove', key, e);
		}
	},
	/** Видаляє лише ключі цього проєкту. Безпечно на спільному origin. */
	clear(): void {
		const store = ls();
		if (!store) return;
		try {
			const toRemove: string[] = [];
			for (let i = 0; i < store.length; i++) {
				const k = store.key(i);
				if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k);
			}
			toRemove.forEach((k) => store.removeItem(k));
		} catch (e) {
			fail('clear', '*', e);
		}
	}
};
