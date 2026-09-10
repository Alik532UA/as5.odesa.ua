import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '$lib/config/storage';
import { hardReset, RESET_PRESSES_DEV, RESET_PRESSES_PROD } from './resetService';

/**
 * Аварійне скидання (DEBUGGING-v9 § 3.4, `DBG-HARD-RESET`, рівень CRITICAL).
 *
 * ## Чому цей файл з'явився
 *
 * `resetService.ts` був написаний ретельно й не перевірявся НІЧИМ. Це не те
 * саме, що недописаний тест: правило тут CRITICAL, бо ціна помилки — чужі дані.
 * За запасною адресою `alik532ua.github.io/as5.odesa.ua/` origin спільний із
 * сімома сусідніми проєктами, і три з чотирьох складників скидання за
 * замовчуванням межі не мають: `localStorage.clear()` стирає весь origin,
 * `caches.keys()` віддає імена всього origin, `getRegistrations()` віддає
 * реєстрації всього origin.
 *
 * Канон називає обидва боки помилки живими випадками: `Slovko` знімав
 * реєстрацію ВСІХ service worker на origin (кеші при цьому фільтрувалися
 * правильно — саме тому дефекту не було видно), `MindStep` фільтрував кеші й не
 * знімав реєстрацію взагалі. Половина функції поводилася як треба в обох.
 *
 * ## Чому перевірка поведінкою, а не грепом по джерелах
 *
 * Греп «немає `localStorage.clear()`» пройшов би й тоді, коли межу знято іншим
 * способом — наприклад, фільтром, який на запасній адресі збігається з усім.
 * Тому тут підставні сховище, `caches` і `getRegistrations` із СУСІДСЬКИМИ
 * записами: перевіряється, що після скидання чуже лишилося на місці.
 */

/** Мінімальне сховище в пам'яті — як у `storage.test.ts`. */
function makeMemoryStorage(overrides: Partial<Storage> = {}): Storage {
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
		},
		...overrides
	} as Storage;
}

/** Імена кешів: два свої, два чужі. */
const OWN_CACHES = [`${STORAGE_PREFIX}assets-v1`, `${STORAGE_PREFIX}pages`];
const NEIGHBOUR_CACHES = ['mindstep_assets', 'workbox-precache-v2', 'slovko_words'];

/**
 * Прогін іде з ЗАПАСНОЇ адреси, і це не деталь оформлення.
 *
 * На власному домені origin ексклюзивний, тобто там будь-який фільтр виглядає
 * правильним. Уся межа «своє / чуже» перевіряється лише за адресою на спільному
 * origin — саме там її можна помилитися й не побачити цього ніколи.
 */
const HERE = 'https://alik532ua.github.io/as5.odesa.ua/about';
/** Реєстрації service worker: своя й дві чужі, усі на одному origin. */
const OWN_SCOPE = 'https://alik532ua.github.io/as5.odesa.ua/';
const NEIGHBOUR_SCOPE = 'https://alik532ua.github.io/MindStep/';
/**
 * Кореневий scope сусіда — user-site акаунта.
 *
 * Він керує і НАШОЮ сторінкою за запасною адресою, тож умова «керує цією
 * сторінкою» його не відсіює. Саме через це в `Slovko` скидання знімало
 * реєстрації сусідів (DEBUGGING-v9 § 3.4).
 */
const ROOT_SCOPE = 'https://alik532ua.github.io/';

type Deleted = { caches: string[]; unregistered: string[] };

/**
 * Оточення одного прогону: підставні сховище, кеші, реєстрації та `location`.
 *
 * `location` у jsdom не дає підмінити `reload`, тому вікно підставляється
 * цілком через `vi.stubGlobal` — заодно це робить видимим, що функція читає з
 * нього рівно дві речі: адресу сторінки й перезавантаження.
 */
function setupEnvironment(
	options: {
		confirm?: boolean;
		storage?: Partial<Storage>;
		cachesThrows?: boolean;
		registrationsThrow?: boolean;
		here?: string;
		scopes?: string[];
	} = {}
) {
	const deleted: Deleted = { caches: [], unregistered: [] };
	const reload = vi.fn();
	const confirmed = options.confirm ?? true;
	const here = options.here ?? HERE;
	const scopes = options.scopes ?? [OWN_SCOPE, NEIGHBOUR_SCOPE, ROOT_SCOPE];

	const localStorageStub = makeMemoryStorage(options.storage);
	localStorageStub.setItem(`${STORAGE_PREFIX}theme`, 'dark');
	localStorageStub.setItem('theme', 'сусідський ключ без префікса');

	vi.stubGlobal('localStorage', localStorageStub);
	vi.stubGlobal('confirm', vi.fn(() => confirmed));
	vi.stubGlobal('location', { href: here, reload });
	vi.stubGlobal('caches', {
		keys: vi.fn(async () => {
			if (options.cachesThrows) throw new Error('Cache API заблокований');
			return [...OWN_CACHES, ...NEIGHBOUR_CACHES];
		}),
		delete: vi.fn(async (name: string) => {
			deleted.caches.push(name);
			return true;
		})
	});
	vi.stubGlobal('navigator', {
		serviceWorker: {
			getRegistrations: vi.fn(async () => {
				if (options.registrationsThrow) throw new Error('реєстрації недоступні');
				return scopes.map((scope) => ({
					scope,
					unregister: vi.fn(async () => {
						deleted.unregistered.push(scope);
						return true;
					})
				}));
			})
		}
	});

	return { deleted, reload, localStorageStub };
}

describe('аварійне скидання стирає лише своє (DEBUGGING-v9 § 3.4)', () => {
	beforeEach(() => {
		// `window` у jsdom — той самий об'єкт, що `globalThis`, тож підстановки
		// вище видно і як `window.confirm`, і як `location`.
		vi.stubGlobal('window', globalThis);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('ключі сховища — лише префіксовані: сусідський лишається', async () => {
		const { localStorageStub } = setupEnvironment();
		await hardReset(false);
		expect(localStorageStub.getItem(`${STORAGE_PREFIX}theme`)).toBeNull();
		expect(
			localStorageStub.getItem('theme'),
			'ключ без префікса належить сусідньому проєкту на спільному origin'
		).toBe('сусідський ключ без префікса');
	});

	it('кеші — лише свої за префіксом', async () => {
		const { deleted } = setupEnvironment();
		await hardReset(false);
		expect(deleted.caches.sort()).toEqual([...OWN_CACHES].sort());
		for (const name of NEIGHBOUR_CACHES) {
			expect(deleted.caches, `видалено чужий кеш ${name}`).not.toContain(name);
		}
	});

	it('реєстрації service worker — лише свої за scope', async () => {
		const { deleted } = setupEnvironment();
		await hardReset(false);
		expect(deleted.unregistered).toEqual([OWN_SCOPE]);
		expect(
			deleted.unregistered,
			'знято реєстрацію сусіднього проєкту — саме так помилявся Slovko'
		).not.toContain(NEIGHBOUR_SCOPE);
	});

	it('кореневий scope сусіда лишається, хоч і керує цією сторінкою', async () => {
		const { deleted } = setupEnvironment();
		await hardReset(false);
		expect(
			deleted.unregistered,
			'user-site акаунта реєструє SW із scope на весь origin, і за запасною ' +
				'адресою він керує нашою сторінкою теж — але він не наш'
		).not.toContain(ROOT_SCOPE);
	});

	it('на власному домені своя реєстрація знімається', async () => {
		// Дзеркальна половина: фільтр, який відсіює кореневий scope, не має
		// відсіювати ВЛАСНИЙ корінь на ексклюзивному origin.
		const { deleted } = setupEnvironment({
			here: 'https://as5.odesa.ua/about',
			scopes: ['https://as5.odesa.ua/']
		});
		await hardReset(false);
		expect(deleted.unregistered).toEqual(['https://as5.odesa.ua/']);
	});

	it('відмова від підтвердження не стирає нічого й не перезавантажує', async () => {
		const { deleted, reload, localStorageStub } = setupEnvironment({ confirm: false });
		await hardReset(true);
		expect(localStorageStub.getItem(`${STORAGE_PREFIX}theme`)).toBe('dark');
		expect(deleted).toEqual({ caches: [], unregistered: [] });
		expect(reload).not.toHaveBeenCalled();
	});

	it('підтвердження питається саме тоді, коли просили', async () => {
		setupEnvironment();
		await hardReset(false);
		expect(window.confirm, 'без прапорця питати не мусить').not.toHaveBeenCalled();
		await hardReset(true);
		expect(window.confirm).toHaveBeenCalledTimes(1);
	});

	it('збій сховища не скасовує решту скидання (кожна половина під своїм try)', async () => {
		const { deleted, reload } = setupEnvironment({
			storage: {
				removeItem: () => {
					throw new Error('сховище недоступне');
				},
				clear: () => {
					throw new Error('сховище недоступне');
				}
			}
		});
		// Фасад сховища попереджає в консоль сам — тут це очікуваний бік справи,
		// а не шум у звіті прогону, тому перехоплюється й перевіряється.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await expect(hardReset(false)).resolves.toBeUndefined();
		expect(warn, 'збій сховища мусить бути видно хоч у консолі').toHaveBeenCalled();
		expect(deleted.caches.length, 'кеші не почистилися після збою сховища').toBeGreaterThan(0);
		expect(deleted.unregistered).toEqual([OWN_SCOPE]);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('ніколи не кидає: ні на кешах, ні на реєстраціях', async () => {
		const first = setupEnvironment({ cachesThrows: true, registrationsThrow: true });
		await expect(hardReset(false)).resolves.toBeUndefined();
		expect(first.reload, 'сторінка мусить перезавантажитися навіть після збоїв').toHaveBeenCalledTimes(
			1
		);
	});

	it('поза браузером не робить нічого', async () => {
		const { deleted, reload } = setupEnvironment();
		vi.stubGlobal('window', undefined);
		await expect(hardReset(true)).resolves.toBeUndefined();
		expect(deleted).toEqual({ caches: [], unregistered: [] });
		expect(reload).not.toHaveBeenCalled();
	});

	it('два барʼєри перед знищенням даних: поріг у проді вищий за dev', () => {
		// § 3.3: поріг захищає від випадковості, підтвердження — від помилки.
		expect(RESET_PRESSES_PROD).toBeGreaterThan(RESET_PRESSES_DEV);
		expect(RESET_PRESSES_DEV).toBeGreaterThan(1);
	});
});
