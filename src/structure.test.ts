// @vitest-environment node
// Перевірка лише читає файли — DOM їй не потрібен.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Інваріанти структури проєкту (PROJECT-STRUCTURE-v8 § 4.3, § 5.2, § 7).
 *
 * ## Навіщо, якщо сироти вже прибрані
 *
 * Прибрати сімнадцять файлів можна один раз; не дати їм повернутися — лише
 * перевіркою. Клас дефекту тут особливий тим, що **нічого не ламає**: файл
 * компілюється, `svelte-check` мовчить, lint мовчить, тести зелені. Він просто
 * читається як зроблена робота — і саме тому потрапляє у звіт про якість як
 * реалізована функція (AI-AGENT-PITFALLS-v8 § 3).
 *
 * У цьому проєкті так сталося з `services/seo.svelte.ts`: цілий SEO-сервіс,
 * якого не імпортував ніхто, поряд із реальними мета-тегами в `+layout.svelte`.
 *
 * ## Чому обхід графа, а не пошук імені файлу в тексті
 *
 * Канон (§ 8) наводить грубий варіант: шукати ім'я файлу в інших джерелах. Він
 * не бачить **ланцюжка сиріт** — файлу, який імпортує лише інший сирота. Саме
 * такий тут і був: `controllers/Carousel.svelte.ts` імпортувався рівно з
 * `NewsSection.svelte`, а той — нізвідки. Грубий варіант оголосив би контролер
 * живим. Тому обхід іде від справжніх коренів: `src/routes/` і `hooks.*`.
 *
 * Тести коренями НЕ вважаються навмисно. Модуль, який імпортує лише його
 * власний тест, — це дві мертві речі замість однієї, і зелений тест над ним
 * створює найгіршу форму хибної впевненості (`sanitizer.ts` тут був саме таким).
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1)
 *
 * Прогнано перед комітом:
 *  - повернути `src/lib/utils/lazyLoad.ts` → перевірка сиріт червона на ньому;
 *  - перейменувати імпорт на `import Header from './HeaderSection.svelte'` →
 *    червона перевірка псевдоніма;
 *  - додати рядок у `+layout.svelte` → червона перевірка розміру.
 * Після повернення файлів усі три зелені.
 */

const ROOT = resolve(__dirname, '..');

/** Звідки застосунок узагалі стартує. Усе, до чого звідси не дійти, — мертве. */
const ENTRY_DIRS = ['src/routes'];
const ENTRY_FILES = ['src/hooks.client.ts', 'src/hooks.server.ts', 'src/service-worker.ts'];

/**
 * Свідомі винятки. Кожен named, а не покритий класом, — щоб виняток був видно
 * в diff, а застарілий запис ловився самою перевіркою.
 */
const ALLOWED_ORPHANS = new Set([
	// Барел-заглушка з шаблону SvelteKit. Канон дозволяє `index.ts` як виняток
	// (§ 4.1); порожній файл нічого не обіцяє.
	'src/lib/index.ts'
]);

/**
 * Чинні перевищення § 7 із числами на 2026-08-16. Список **тільки
 * скорочується**: файл зі списку не може вирости, новий у список не додається
 * без окремого рішення. Так борг лишається виміряним, замість того щоб
 * зникнути разом із вимкненою перевіркою (та сама логіка, що `warn` із числом
 * замість `off` у CODE-QUALITY-v8 § 6.4.1).
 */
const SIZE_DEBT: Record<string, number> = {
	// Чернетка для ручних перевірок: десяток варіантів галерей в одному файлі.
	'src/routes/test/+page.svelte': 1436,
	// Шапка, меню, перемикачі мови й теми, випадайка налаштувань — чотири
	// відповідальності в одному компоненті.
	'src/lib/components/HeaderSection.svelte': 595,
	'src/lib/components/FooterSection.svelte': 401,
	'src/lib/components/ui/PianoModal.svelte': 327
};

/** Межі § 7. Перший збіг виграє, тому маршрутний шаблон стоїть вище. */
const SIZE_LIMITS: Array<[RegExp, number]> = [
	[/\/routes\/.*\+page\.svelte$/, 400],
	[/\.svelte$/, 300],
	[/\.svelte\.ts$/, 300],
	[/\.ts$/, 250]
];

function walk(dir: string, out: string[] = []): string[] {
	const full = join(ROOT, dir);
	if (!existsSync(full)) return out;
	for (const entry of readdirSync(full)) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else out.push(rel);
	}
	return out;
}

const allFiles = walk('src');
const sources = allFiles.filter((f) => /\.(ts|svelte)$/.test(f));
const isTest = (f: string) => /\.(test|spec)\.ts$/.test(f);
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

/**
 * Усі форми імпорту: звичайний, `export … from`, динамічний `import()` і —
 * окремою гілкою — імпорт заради побічного ефекту (`import '$lib/i18n';`).
 * Остання не має `from`, і без неї `i18n/index.ts` оголошувався б сиротою,
 * хоча саме цей імпорт у `+layout.svelte` і піднімає локалізацію.
 */
const IMPORT_RE =
	/(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;

/** `$lib/x` → `src/lib/x`; `./x` → сусід. Розширення дописуються, як у Vite. */
function resolveImport(fromFile: string, spec: string): string | null {
	let base: string;
	if (spec.startsWith('$lib/')) base = `src/lib/${spec.slice('$lib/'.length)}`;
	else if (spec.startsWith('.')) base = join(dirname(fromFile), spec).replace(/\\/g, '/');
	else return null; // пакет або аліас SvelteKit ($app/*) — не наш файл

	const candidates = [base, `${base}.ts`, `${base}.svelte`, `${base}.svelte.ts`, `${base}/index.ts`];
	return candidates.find((c) => allFiles.includes(c)) ?? null;
}

/** Файли, досяжні з коренів застосунку. */
function reachable(): Set<string> {
	const seen = new Set<string>();
	const queue = sources.filter(
		(f) => !isTest(f) && (ENTRY_DIRS.some((d) => f.startsWith(`${d}/`)) || ENTRY_FILES.includes(f))
	);
	queue.forEach((f) => seen.add(f));

	while (queue.length) {
		const file = queue.shift() as string;
		for (const match of read(file).matchAll(IMPORT_RE)) {
			const target = resolveImport(file, match[1] ?? match[2] ?? match[3]);
			if (target && !seen.has(target)) {
				seen.add(target);
				queue.push(target);
			}
		}
	}
	return seen;
}

describe('перевірка жива', () => {
	it('знаходить джерела', () => {
		expect(sources.length, 'у src/ немає жодного .ts чи .svelte').toBeGreaterThan(20);
	});

	it('знаходить корені застосунку', () => {
		const roots = sources.filter((f) => f.startsWith('src/routes/'));
		expect(roots.length, 'у src/routes/ немає джерел — обхід графа почався б із порожнечі').toBeGreaterThan(
			3
		);
	});
});

describe('структура', () => {
	it('руни лише у .svelte та .svelte.ts (анти-патерни § CRITICAL)', () => {
		const bad = sources
			.filter((f) => f.endsWith('.ts') && !f.endsWith('.svelte.ts') && !isTest(f))
			.filter((f) => /\$state[({<]|\$derived[({<]|\$effect[({.]/.test(read(f)));
		expect(bad, `руни у звичайному .ts — компілятор їх не обробляє: ${bad.join(', ')}`).toEqual([]);
	});

	it('кожен модуль у src/lib досяжний із маршрутів (§ 4.3)', () => {
		const live = reachable();
		const orphans = sources
			.filter((f) => f.startsWith('src/lib/') && !isTest(f))
			.filter((f) => !live.has(f) && !ALLOWED_ORPHANS.has(f));
		expect(
			orphans,
			`не імпортує ніхто — підключити або видалити:\n${orphans.join('\n')}`
		).toEqual([]);
	});

	it('у списку винятків немає застарілих записів', () => {
		const live = reachable();
		const stale = [...ALLOWED_ORPHANS].filter((f) => !allFiles.includes(f) || live.has(f));
		expect(stale, `виняток більше не потрібен — прибрати зі списку:\n${stale.join('\n')}`).toEqual(
			[]
		);
	});

	it('псевдонім імпорту збігається з іменем файлу (§ 5.2)', () => {
		const re = /import\s+([A-Z][A-Za-z0-9]*)\s+from\s+["'][^"']*\/([A-Z][A-Za-z0-9]*)\.svelte["']/g;
		const bad: string[] = [];
		for (const f of sources) {
			// Блокові коментарі відрізаються, інакше перевірка знаходить сама себе:
			// у докблоці вище процитовано неправильний приклад як ілюстрацію.
			const text = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
			for (const m of text.matchAll(re)) {
				if (m[1] !== m[2]) bad.push(`${f}: ${m[1]} -> ${m[2]}.svelte`);
			}
		}
		expect(bad, `пошук за назвою компонента не знайде місця використання:\n${bad.join('\n')}`).toEqual(
			[]
		);
	});

	it('розмір файлу в межах § 7, а борг лише скорочується', () => {
		const bad: string[] = [];
		for (const f of sources) {
			if (isTest(f)) continue;
			const limit = SIZE_LIMITS.find(([re]) => re.test(f))?.[1] ?? Infinity;
			const lines = read(f).split('\n').length;
			const debt = SIZE_DEBT[f];
			if (debt === undefined) {
				if (lines > limit) bad.push(`${f}: ${lines} рядків (межа ${limit}) — розділити за відповідальністю`);
			} else if (lines > debt) {
				bad.push(`${f}: ${lines} рядків, у списку боргу ${debt} — борг має скорочуватися`);
			}
		}
		expect(bad, `завеликі файли:\n${bad.join('\n')}`).toEqual([]);
	});

	it('у списку боргу за розміром немає записів про неіснуючі або вже розібрані файли', () => {
		const stale = Object.entries(SIZE_DEBT)
			.filter(([f, debt]) => !allFiles.includes(f) || read(f).split('\n').length < debt - 20)
			.map(([f, debt]) => `${f} (записано ${debt})`);
		expect(stale, `запис застарів — оновити число або прибрати:\n${stale.join('\n')}`).toEqual([]);
	});
});
