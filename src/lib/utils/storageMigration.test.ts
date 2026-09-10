import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '$lib/config/storage';

/**
 * Міграція ключів без префікса (STORAGE-NAMESPACE-v9 § Крок 4).
 *
 * ## Що тут насправді перевіряється
 *
 * Не «значення переїхало» — це видно й з коду. Перевіряється МЕЖА: міграція
 * читає ключі БЕЗ префікса, тобто на спільному origin читає нічиї ключі, і
 * видаляє їх. Ключі `theme`, `lang`, `backgroundType`, `enableBlurEffect`,
 * `enableDynamicBackground` — рівно ті, які на `alik532ua.github.io` пише кожен
 * застосунок із того самого шаблону; саме тому реєстр префіксів і з'явився.
 *
 * Зразок канону має позначку «міграцію виконано» першим рядком, і тут її не
 * було: міграція виконувалася на КОЖНОМУ завантаженні сторінки назавжди, а не
 * один раз після переїзду на префікси. Сусід, який ще не переїхав, писав `theme`
 * без префікса — і кожен захід на нашу сторінку забирав його ключ.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: прибрати ранній вихід по `DONE_KEY` — червоніє
 * «повторний запуск не чіпає чужого ключа»; поставити позначку ДО циклу —
 * червоніє «відмова сховища не позначає міграцію виконаною».
 */

const DONE_KEY = `${STORAGE_PREFIX}__migrated`;

function makeMemoryStorage(seed: Record<string, string> = {}, overrides: Partial<Storage> = {}) {
	const m = new Map<string, string>(Object.entries(seed));
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
		},
		...overrides
	} as Storage;
}

/**
 * Фасад сховища тримає прапорець «сховище відмовило» в модулі, тож кожен
 * сценарій бере свій екземпляр — як у `services/storage.test.ts`.
 */
async function freshMigration(store: Storage) {
	vi.resetModules();
	vi.stubGlobal('localStorage', store);
	return (await import('./storageMigration')).migrateStorageKeys;
}

describe('міграція ключів під префікс (§ Крок 4)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('значення переїжджає під префікс, старий ключ прибирається', async () => {
		const store = makeMemoryStorage({ theme: 'dark', lang: 'en' });
		const migrate = await freshMigration(store);
		migrate();

		expect(store.getItem(`${STORAGE_PREFIX}theme`)).toBe('dark');
		expect(store.getItem(`${STORAGE_PREFIX}lang`)).toBe('en');
		expect(store.getItem('theme')).toBeNull();
		expect(store.getItem('lang')).toBeNull();
	});

	it('уже перенесене значення не перезаписується старим', async () => {
		const store = makeMemoryStorage({ theme: 'light', [`${STORAGE_PREFIX}theme`]: 'dark' });
		const migrate = await freshMigration(store);
		migrate();

		expect(store.getItem(`${STORAGE_PREFIX}theme`), 'свіжий вибір користувача').toBe('dark');
	});

	it('після успішної міграції ставиться позначка', async () => {
		const store = makeMemoryStorage({ theme: 'dark' });
		const migrate = await freshMigration(store);
		migrate();

		expect(store.getItem(DONE_KEY)).toBe('true');
	});

	it('повторний запуск не чіпає ключа, який з’явився після міграції', async () => {
		// Найчастіший стан відвідувача, і саме він робив дірку живою: переносити
		// нічого (легасі-ключів немає), і НАШОГО префіксованого ключа теж немає —
		// він пишеться лише тоді, коли людина сама обрала тему чи мову.
		const store = makeMemoryStorage();
		const migrate = await freshMigration(store);
		migrate();
		expect(store.getItem(DONE_KEY), 'перший запуск мусить позначитися').toBe('true');

		// Так виглядає сусідній застосунок на спільному origin, який ще не
		// переїхав на префікси: він пише `theme` без префікса просто зараз.
		store.setItem('theme', 'сусідське значення');
		migrate();

		expect(
			store.getItem('theme'),
			'міграція виконується один раз; інакше кожен захід на нашу сторінку ' +
				'копіював би чуже значення собі й видаляв чужий ключ — назавжди'
		).toBe('сусідське значення');
		expect(
			store.getItem(`${STORAGE_PREFIX}theme`),
			'чуже значення не має ставати нашим налаштуванням'
		).toBeNull();
	});

	it('відмова сховища не позначає міграцію виконаною', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = makeMemoryStorage(
			{ theme: 'dark' },
			{
				getItem: (k: string) => {
					// Фасад читає префіксований ключ (позначку) — це має працювати,
					// інакше сценарій перевіряв би не те. Кидає саме читання
					// ЛЕГАСІ-ключа, тобто рівно те, що робить сама міграція.
					if (k.startsWith(STORAGE_PREFIX)) return null;
					throw new Error('сховище недоступне');
				}
			}
		);
		const migrate = await freshMigration(store);
		migrate();

		expect(warn).toHaveBeenCalled();
		expect(
			store.getItem(DONE_KEY),
			'позначка при відмові означала б, що дані лишилися під старими ключами ' +
				'назавжди: наступний захід уже не спробував би'
		).toBeNull();
	});

	it('поза браузером не робить нічого', async () => {
		const store = makeMemoryStorage({ theme: 'dark' });
		const migrate = await freshMigration(store);
		vi.stubGlobal('window', undefined);
		migrate();

		expect(store.getItem('theme')).toBe('dark');
		expect(store.getItem(DONE_KEY)).toBeNull();
	});
});
