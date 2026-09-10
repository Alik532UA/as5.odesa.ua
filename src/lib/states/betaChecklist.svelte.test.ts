import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '$lib/config/storage';
import { BETA_CHECKS } from '$lib/config/beta';

/**
 * Позначка чеклиста несе версію збірки (BETA-CHECKLIST-v9 § 3.1,
 * `BETA-VERSION-STAMP`, HIGH) і звіт має запасний шлях (§ 6.2,
 * `BETA-REPORT-FALLBACK`).
 *
 * ## Чому цей файл з'явився
 *
 * `src/beta-checklist.test.ts` перевіряє ДАНІ чеклиста: маршрут заявлений
 * вкладкою, `covered` називає існуючий файл тесту, локатор існує в розмітці,
 * рівні йдуть у правильному порядку. Сам контролер — де живуть версія позначки,
 * поступ і звіт — не перевірявся нічим, а канон обидва ці правила перевіряє
 * саме «юніт-тестом сервісу прогресу».
 *
 * Різниця не формальна. Галочка «працює», поставлена сорок комітів тому,
 * виглядає точно так само, як сьогоднішня, — і саме тому список поступово стає
 * звітом про минуле, який читають як звіт про теперішнє. Механізм проти цього
 * тут написаний (позначка підписується версією і не рахується в поступі), але
 * доводився читанням коду.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: прибрати `?.version === VERSION` з `progress` —
 * червоніє «стара позначка не рахується в поступі»; прибрати `this.
 * reportFallback = report` із `catch` у `copyReport` — червоніє «відмова буфера
 * лишає звіт текстом».
 */

const VERSION = '0.0.2';
const STORAGE_KEY = `${STORAGE_PREFIX}betaChecklist`;

/** Пункти для сценаріїв беруться з реального переліку, а не вписуються. */
const anyCheck = BETA_CHECKS[0];
const coveredFail = BETA_CHECKS.find((c) => c.coverage === 'covered');

/** Сховище в пам'яті — той самий підхід, що в `services/storage.test.ts`. */
function makeMemoryStorage(seed: Record<string, string> = {}): Storage {
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
		}
	} as Storage;
}

/**
 * `betaChecklist` — module-level синглтон, тобто конструктор виконується під час
 * імпорту й читає сховище саме тоді. Щоб перевірити РІЗНІ стартові умови,
 * кожен тест бере свій екземпляр модуля (як `ui.svelte.test.ts`).
 */
async function freshChecklist(store: Storage) {
	vi.resetModules();
	vi.stubGlobal('localStorage', store);
	return (await import('./betaChecklist.svelte')).betaChecklist;
}

/** Сховище з однією позначкою вказаної версії. */
function storeWithMark(version: string, vote = 'ok') {
	return makeMemoryStorage({
		[STORAGE_KEY]: JSON.stringify({ [anyCheck.id]: { vote, version } })
	});
}

describe('позначка чеклиста несе версію збірки (§ 3.1)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('перевірка жива: версія збірки підставлена, пункти знайдено', () => {
		// Число підставляє Vite з `package.json` — і в тестах теж (`vitest.config.ts`).
		// Без цього всі позначки мали б версію `unknown` і всі порівняння нижче
		// проходили б із неправильної причини.
		expect(__APP_VERSION__).toBe(VERSION);
		expect(BETA_CHECKS.length).toBeGreaterThan(10);
		expect(coveredFail, 'у чеклисті немає жодного пункту з `covered`').toBeDefined();
	});

	it('нова позначка підписується поточною версією', async () => {
		const store = makeMemoryStorage();
		const checklist = await freshChecklist(store);
		checklist.vote(anyCheck.id, 'ok');
		expect(checklist.markOf(anyCheck.id)).toEqual({ vote: 'ok', version: VERSION });
		expect(JSON.parse(store.getItem(STORAGE_KEY)!)[anyCheck.id].version).toBe(VERSION);
	});

	it('позначка з іншої версії показується, але блякне', async () => {
		const checklist = await freshChecklist(storeWithMark('0.0.1'));
		expect(checklist.markOf(anyCheck.id)?.vote, 'позначка не зникає — вона щось означає').toBe(
			'ok'
		);
		expect(checklist.isStale(anyCheck.id)).toBe(true);
	});

	it('стара позначка НЕ рахується в поступі', async () => {
		const stale = await freshChecklist(storeWithMark('0.0.1'));
		expect(stale.progress).toEqual({ done: 0, total: BETA_CHECKS.length });

		const fresh = await freshChecklist(storeWithMark(VERSION));
		expect(fresh.progress).toEqual({ done: 1, total: BETA_CHECKS.length });
	});

	it('той самий голос на СВІЖІЙ позначці знімає її, на старій — освіжає', async () => {
		const fresh = await freshChecklist(storeWithMark(VERSION));
		fresh.vote(anyCheck.id, 'ok');
		expect(fresh.markOf(anyCheck.id), 'повторне натискання того самого стану знімає').toBeUndefined();

		const stale = await freshChecklist(storeWithMark('0.0.1'));
		stale.vote(anyCheck.id, 'ok');
		expect(
			stale.markOf(anyCheck.id),
			'той самий голос на старій позначці — це підтвердження на новій версії, ' +
				'а не скасування: інакше тестувальник знімав би позначку, хотівши її оновити'
		).toEqual({ vote: 'ok', version: VERSION });
	});

	it('звіт підписує стару позначку версією, на якій її поставили', async () => {
		const checklist = await freshChecklist(storeWithMark('0.0.1'));
		const report = checklist.buildReport();
		expect(report).toContain(`ВЕРСІЯ: ${VERSION}`);
		expect(report).toContain('позначено на версії 0.0.1');
	});

	it('помилка в покритому автотестом пункті видна у звіті окремо', async () => {
		const store = makeMemoryStorage();
		const checklist = await freshChecklist(store);
		checklist.vote(coveredFail!.id, 'fail');
		const report = checklist.buildReport();
		expect(
			report,
			'помилка в покритому місці — дефект ТЕСТА, і в звіті вона мусить бути видна'
		).toContain('ПУНКТ ПОКРИТО АВТОТЕСТОМ');
		expect(report).toContain(coveredFail!.test!);
	});

	it('поламане йде вгору звіту, а порожній звіт це каже прямо', async () => {
		const checklist = await freshChecklist(makeMemoryStorage());
		expect(checklist.buildReport()).toContain('Жодного пункта не позначено');

		const ok = BETA_CHECKS[1];
		checklist.vote(ok.id, 'ok');
		checklist.vote(coveredFail!.id, 'fail');
		const report = checklist.buildReport();
		expect(report.indexOf('[НЕ ПРАЦЮЄ]')).toBeLessThan(report.indexOf('[ПРАЦЮЄ]'));
	});

	it('позначки переживають перезавантаження сторінки', async () => {
		const store = makeMemoryStorage();
		const first = await freshChecklist(store);
		first.vote(anyCheck.id, 'weird');

		const second = await freshChecklist(store);
		expect(second.markOf(anyCheck.id)).toEqual({ vote: 'weird', version: VERSION });
	});

	it('пошкоджене сховище не кладе сторінку', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = makeMemoryStorage({ [STORAGE_KEY]: '{це не JSON' });
		const checklist = await freshChecklist(store);
		expect(checklist.progress.done).toBe(0);
		expect(warn, 'збій читання мусить бути видно хоч у консолі').toHaveBeenCalled();
	});

	it('позначка про пункт, якого вже немає, відкидається', async () => {
		const store = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ pageWhichIsGone_42: { vote: 'ok', version: VERSION } })
		});
		const checklist = await freshChecklist(store);
		expect(checklist.markOf('pageWhichIsGone_42')).toBeUndefined();
		expect(checklist.buildReport()).toContain('Жодного пункта не позначено');
	});

	it('clear() чистить і позначки, і показаний звіт', async () => {
		const checklist = await freshChecklist(storeWithMark(VERSION));
		checklist.reportFallback = 'старий звіт';
		checklist.clear();
		expect(checklist.progress.done).toBe(0);
		expect(checklist.reportFallback).toBe('');
	});
});

describe('відмова буфера обміну лишає звіт видимим (§ 6.2)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('успішне копіювання не показує поля', async () => {
		const writeText = vi.fn(async () => {});
		vi.stubGlobal('navigator', { clipboard: { writeText }, userAgent: 'test' });
		const checklist = await freshChecklist(storeWithMark(VERSION));

		await expect(checklist.copyReport()).resolves.toBe('copied');
		expect(writeText).toHaveBeenCalledOnce();
		expect(checklist.reportFallback).toBe('');
	});

	it('відмова буфера лишає звіт текстом, а не самою лише кнопкою', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal('navigator', {
			clipboard: {
				writeText: vi.fn(async () => {
					throw new Error('Document is not focused');
				})
			},
			userAgent: 'test'
		});
		const checklist = await freshChecklist(storeWithMark(VERSION));

		await expect(checklist.copyReport()).resolves.toBe('fallback');
		expect(
			checklist.reportFallback,
			'без цього кнопка виглядала б натиснутою, а звіту не було б НІДЕ — ' +
				'уся робота тестувальника зникала б на останньому кроці'
		).toContain(`ВЕРСІЯ: ${VERSION}`);
		expect(warn).toHaveBeenCalled();
	});

	it('відсутній clipboard API — той самий запасний шлях, а не виняток', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		// Так виглядає сторінка не через https: об'єкт є, методу немає.
		vi.stubGlobal('navigator', { clipboard: {}, userAgent: 'test' });
		const checklist = await freshChecklist(storeWithMark(VERSION));

		await expect(checklist.copyReport()).resolves.toBe('fallback');
		expect(checklist.reportFallback).not.toBe('');
	});
});
