import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '$lib/config/storage';

/**
 * Тема: збережений вибір проти системного налаштування (UI-UX-v8 § 1).
 *
 * ## Що саме тут перевіряється і чому
 *
 * `UIState` розрізняє два джерела теми, і різниця між ними невидима в коді:
 * «користувач обрав» зберігається, «взяли з системи» — ні. Ознакою вибору
 * служить сама наявність ключа `theme` у сховищі, тому будь-який зайвий запис
 * не просто дублює дані — він перетворює системне значення на вибір і назавжди
 * вимикає стеження за системною темою.
 *
 * Саме це й було. Конструктор ішов через `setTheme`, який пише у сховище
 * ЗАВЖДИ. У світлій системі це не спливало: `setTheme('light')` виходив
 * достроково по `this.theme === t` ще до запису. У темній — виходило, що
 * відвідувач, який ніколи не торкався перемикача, отримував `theme=dark` у
 * сховищі при першому ж заході, і подальші зміни системної теми на нього не
 * впливали ЖОДНОГО разу.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1)
 *
 * Прогнано перед комітом: повернути в конструкторі виклик
 * `this.setTheme(initialTheme, { withBlur: false })` замість прямого
 * присвоєння — і «системна темна не рахується вибором» та «стеження за
 * системою живе» стають червоними, решта лишається зеленою.
 */

type MediaListener = (e: { matches: boolean }) => void;

/**
 * Сховище в пам'яті — той самий підхід, що у `services/storage.test.ts`:
 * `localStorage` у цьому jsdom не функціональний (`getItem is not a function`),
 * а тесту потрібне саме читання ключа, а не його імітація.
 */
function makeMemoryStorage(): Storage {
	const m = new Map<string, string>();
	return {
		get length() {
			return m.size;
		},
		key: (i: number) => Array.from(m.keys())[i] ?? null,
		getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
		setItem: (k: string, v: string) => {
			m.set(k, String(v));
		},
		removeItem: (k: string) => {
			m.delete(k);
		},
		clear: () => {
			m.clear();
		}
	} as Storage;
}

/**
 * jsdom не має `matchMedia` зовсім, тож без заглушки конструктор не
 * добирається до перевірки. Заглушка повертає ОДИН обʼєкт запиту на всі
 * виклики — інакше слухач вішався б на інший екземпляр, ніж той, який тест
 * потім смикає, і тест був би зеленим із неправильної причини.
 */
function stubMatchMedia(prefersDark: boolean) {
	const listeners: MediaListener[] = [];
	const query = {
		matches: prefersDark,
		addEventListener: (_type: string, listener: MediaListener) => listeners.push(listener),
		removeEventListener: () => {}
	};
	vi.stubGlobal('matchMedia', () => query);
	return {
		/** Імітує перемикання системної теми користувачем. */
		change(matches: boolean) {
			query.matches = matches;
			listeners.forEach((listener) => listener({ matches }));
		},
		get listenerCount() {
			return listeners.length;
		}
	};
}

/**
 * `ui` — module-level синглтон, тобто конструктор виконується під час імпорту.
 * Щоб перевірити РІЗНІ стартові умови, кожен тест бере свій екземпляр модуля.
 */
async function freshUi(store: Storage) {
	vi.resetModules();
	vi.stubGlobal('localStorage', store);
	return (await import('./ui.svelte')).ui;
}

const THEME_KEY = `${STORAGE_PREFIX}theme`;

afterEach(() => {
	vi.unstubAllGlobals();
	document.documentElement.removeAttribute('data-theme');
	document.documentElement.classList.remove('dark-theme');
});

describe('UIState: тема', () => {
	it('темна системна тема НЕ рахується вибором користувача', async () => {
		const store = makeMemoryStorage();
		stubMatchMedia(true);

		const ui = await freshUi(store);

		expect(ui.theme).toBe('dark');
		// Головне твердження файлу: сховище лишається порожнім.
		expect(store.getItem(THEME_KEY)).toBeNull();
	});

	it('світла системна тема так само не пишеться у сховище', async () => {
		const store = makeMemoryStorage();
		stubMatchMedia(false);

		const ui = await freshUi(store);

		expect(ui.theme).toBe('light');
		expect(store.getItem(THEME_KEY)).toBeNull();
	});

	it('стеження за системною темою живе після старту в темній', async () => {
		const store = makeMemoryStorage();
		const media = stubMatchMedia(true);
		const ui = await freshUi(store);
		expect(media.listenerCount).toBe(1);

		media.change(false);

		// `setTheme` чекає на анімацію блюру, тому не миттєво.
		await vi.waitFor(() => expect(ui.theme).toBe('light'), { timeout: 2000 });
		expect(store.getItem(THEME_KEY)).toBeNull();
	});

	it('явний вибір користувача зберігається й вимикає стеження', async () => {
		const store = makeMemoryStorage();
		const media = stubMatchMedia(false);
		const ui = await freshUi(store);

		await ui.setTheme('dark', { withBlur: false });
		expect(store.getItem(THEME_KEY)).toBe('dark');

		media.change(false);
		await new Promise((r) => setTimeout(r, 50));
		expect(ui.theme).toBe('dark');
	});

	it('збережений вибір перемагає системне налаштування', async () => {
		const store = makeMemoryStorage();
		store.setItem(THEME_KEY, 'light');
		stubMatchMedia(true);

		const ui = await freshUi(store);

		expect(ui.theme).toBe('light');
	});

	it('DOM синхронізується конструктором, а не лише скриптом з app.html', async () => {
		stubMatchMedia(true);

		await freshUi(makeMemoryStorage());

		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
	});

	it('без matchMedia конструктор не кидає — модуль імпортує весь layout', async () => {
		vi.stubGlobal('matchMedia', undefined);

		const ui = await freshUi(makeMemoryStorage());

		expect(ui.theme).toBe('light');
	});
});
