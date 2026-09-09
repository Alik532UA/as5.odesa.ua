// @vitest-environment node
// Перевірка лише читає файли — DOM їй не потрібен.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `GATE-SVELTE-SOURCES` — три класи дефектів SVELTE-CORE-v9, яких не бачить
 * жоден компілятор і жоден наявний гейт проєкту.
 *
 * Спільне в них те, чому вони й опинилися в одному файлі: **усі три виглядають
 * як робочий код**. Збірка зелена, `svelte-check` мовчить, юніт-тести зелені —
 * а поведінка інша, ніж написано.
 *
 *   § 1.6   `SC-SNAPSHOT-BOUNDARY`  — проксі `$state` перетнув межу серіалізації
 *   § 2.2.2 `SC-LISTENER-CLEANUP`   — слухач поставлено й не знято
 *   § 3.2.1 `SC-SUBSCRIPTION-WIRED` — підписку написано й ніхто не кличе
 *
 * Третій клас у проєкті вже стріляв: `errorLogger` існував із кешем на 50
 * записів і девʼятьма зеленими тестами — і жодного імпорту, тобто логування
 * помилок було написане й не працювало. Проти саме того випадку стоїть
 * `error-logger-reachable.test.ts`; тут — узагальнення на весь сервісний шар,
 * бо `webVitals.start()` і `initAnalytics()` доти не стеріг ніхто.
 */

const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'build', 'dist']);

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry).replace(/\\/g, '/');
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

/** Коментарі не є кодом: гейт, який їх читає, вимикається одним реченням. */
const withoutComments = (source: string) =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/^\s*\/\/.*$/gm, '');

const sources = walk('src')
	.filter((f) => /\.(ts|svelte)$/.test(f) && !/\.(test|spec)\.ts$/.test(f))
	.map((file) => ({ file, code: withoutComments(readFileSync(file, 'utf8')) }));

describe('перевірка жива', () => {
	it('джерела прочитано', () => {
		expect(sources.length, 'у src/ немає жодного .ts чи .svelte').toBeGreaterThan(20);
	});
});

/**
 * § 2.2.2 `SC-LISTENER-CLEANUP` — слухач знімається в тому ж модулі, де ставиться.
 *
 * Витік на SPA-навігації не видно НІЧИМ: сторінка працює, тести зелені, а
 * через двадцять переходів на `window` висить двадцять обробників `resize`, і
 * кожен тримає свій компонент у памʼяті. Компілятор про `addEventListener` без
 * пари не каже нічого — це не його предмет.
 *
 * Евристика файлова, і груба вона НАВМИСНО: вона не доводить, що знято
 * правильний слухач, — вона ловить файл, де про зняття не думали взагалі.
 * Довести перше можна лише в браузері, а ціна цієї грубості — один рядок
 * винятку замість непокритого класу.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1): прибрати
 * `return () => mq.removeEventListener('change', handle)` з
 * `utils/reducedMotion.ts` — перевірка червоніє саме на ньому. Прогнано.
 */
describe('слухачі знімаються там, де ставляться (SVELTE-CORE-v9 § 2.2.2)', () => {
	/** Що вважається реєстрацією тривалої підписки на події чи час. */
	const REGISTERS = /addEventListener\s*\(|\.observe\s*\(|setInterval\s*\(/;

	/**
	 * Що вважається парним зняттям.
	 *
	 * `once: true` і `signal:` — теж механізми зняття, і законні: перший знімає
	 * слухач сам після першого спрацювання, другий віддає зняття `AbortSignal`
	 * (§ 2.2.1). Без них перевірка вимагала б `removeEventListener` там, де він
	 * зайвий, і виняток довелося б писати на кожен такий випадок.
	 */
	const RELEASES =
		/removeEventListener\s*\(|\.disconnect\s*\(|\.unobserve\s*\(|clearInterval\s*\(|once:\s*true|signal:/;

	/**
	 * Свідомі винятки — кожен названий файлом і причиною.
	 *
	 * `states/ui.svelte.ts`: `export const ui = new UIState()` — синглтон рівня
	 * модуля, створений РІВНО ОДИН раз на життя вкладки. Слухач
	 * `matchMedia('(prefers-color-scheme: dark)')` реєструється в його
	 * конструкторі й мусить жити стільки ж, скільки застосунок: системна тема
	 * може змінитися будь-коли, зокрема за розкладом ОС. Знімати його нема ні
	 * де, ні коли — модуль не вивантажується, а SPA-навігація конструктор не
	 * повторює, тож накопичення, проти якого написане правило, тут неможливе.
	 */
	const ALLOWED = new Map<string, string>([
		[
			'src/lib/states/ui.svelte.ts',
			'синглтон рівня модуля: конструктор виконується один раз на вкладку, слухач системної теми живе стільки ж, скільки застосунок'
		]
	]);

	const registering = sources.filter(({ code }) => REGISTERS.test(code));

	it('перевірка жива: файли з підписками знайдено', () => {
		expect(
			registering.length,
			'жодного addEventListener/observe/setInterval у src/ — розбір зламався'
		).toBeGreaterThan(5);
	});

	it('кожен модуль із підпискою містить парне зняття', () => {
		const leaking = registering
			.filter(({ file, code }) => !RELEASES.test(code) && !ALLOWED.has(file))
			.map(({ file }) => file);
		expect(
			leaking,
			'слухач ставиться й не знімається — на SPA-навігації вони накопичуються:\n' +
				leaking.join('\n')
		).toEqual([]);
	});

	it('у списку винятків немає застарілих записів', () => {
		const stale = [...ALLOWED.keys()].filter((file) => {
			const entry = sources.find((s) => s.file === file);
			// Файл зник — або підписки в ньому вже немає, або зняття зʼявилося:
			// у всіх трьох випадках виняток більше нічого не пояснює.
			return !entry || !REGISTERS.test(entry.code) || RELEASES.test(entry.code);
		});
		expect(
			stale,
			`виняток більше не потрібен — прибрати рядок разом із причиною:\n${stale.join('\n')}`
		).toEqual([]);
	});
});

/**
 * § 1.6 `SC-SNAPSHOT-BOUNDARY` — проксі `$state` не перетинає межу серіалізації.
 *
 * `structuredClone` на проксі кидає `DataCloneError`; `postMessage` — те саме;
 * сторонній SDK бачить обʼєкт, який змінюється під ним. `JSON.stringify`
 * працює, але мовчки губить вкладені `Map`/`Set` — і саме тому канон називає
 * його межею теж: тихий випадок дорожчий за гучний.
 *
 * Перевірка йде від ЗМІННОЇ, а не від виклику: шукаються ідентифікатори,
 * оголошені через `$state(` у цьому ж файлі, і потім їхня поява аргументом
 * межі без `$state.snapshot` поруч. Пошук самих викликів давав би знахідку на
 * кожному `JSON.stringify(someArray)`, тобто перевірку, яку одразу вимкнули б.
 *
 * Заміри 2026-09-10: порушень нуль. `states/betaChecklist.svelte.ts` серіалізує
 * `SvelteMap`, а не `$state`-проксі, і робить це через `Object.fromEntries` —
 * тобто вкладених `Map` за межу не несе.
 *
 * Зворотний експеримент (§ 1.1): дописати в будь-який `.svelte.ts`
 * `let draft = $state({}); localStorage.setItem('x', JSON.stringify(draft));`
 * — перевірка червоніє на цьому рядку. Прогнано.
 */
describe('стан не перетинає межу серіалізації без snapshot (§ 1.6)', () => {
	const BOUNDARY = /(JSON\.stringify|structuredClone|postMessage)\s*\(\s*([A-Za-z_$][\w$]*)/g;
	const DECLARES_STATE = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\$state[.(]/g;

	const withState = sources.filter(({ code }) => code.includes('$state('));

	it('перевірка жива: файли зі станом знайдено', () => {
		expect(withState.length, 'жодного $state( у src/ — розбір зламався').toBeGreaterThan(3);
	});

	it('жоден $state не йде в stringify/clone/postMessage без $state.snapshot', () => {
		const found: string[] = [];
		for (const { file, code } of sources) {
			const stateVars = new Set([...code.matchAll(DECLARES_STATE)].map((m) => m[1]));
			if (stateVars.size === 0) continue;
			for (const line of code.split('\n')) {
				if (line.includes('$state.snapshot')) continue;
				for (const match of line.matchAll(BOUNDARY)) {
					if (stateVars.has(match[2])) {
						found.push(`${file}: ${match[1]}(${match[2]}) — потрібен $state.snapshot(${match[2]})`);
					}
				}
			}
		}
		expect(
			found,
			`проксі $state за межею серіалізації:\n${found.join('\n')}`
		).toEqual([]);
	});
});

/**
 * § 3.2.1 `SC-SUBSCRIPTION-WIRED` — написану підписку хтось кличе.
 *
 * Найдорожчий вигляд дефекту: функція є, тести на неї зелені, у звіті вона
 * лічиться як реалізована — і не виконується ніколи. Симптом на боці
 * користувача звучить як «список оновлюється лише кнопкою», тобто як інша
 * задача.
 *
 * ## Один рівень непрямості — і чому саме один
 *
 * `initAnalytics` не кличе ніхто поза `services/`, і це ПРАВИЛЬНО: його кличе
 * `trackPageView` із того ж файлу, а вже `trackPageView` — `+layout.svelte`.
 * Тому підписка вважається підключеною, якщо її кличуть поза сервісним шаром
 * АБО якщо її кличе сусід по файлу, якого кличуть поза шаром. Другого рівня
 * тут немає навмисно: він почав би доводити досяжність, а її вже доводить
 * граф імпортів у `structure.test.ts` — дублювати означало б мати дві
 * половинчасті перевірки замість однієї цілої.
 *
 * Зворотний експеримент (§ 1.1): прибрати `$effect(() => webVitals.start())`
 * з `+layout.svelte` — перевірка червоніє на `start`. Прогнано.
 */
describe('підписки сервісного шару підключені (§ 3.2.1)', () => {
	const LAYER = /^src\/lib\/(services|controllers)\//;
	/** Імена, які за конвенцією означають «увімкнути щось тривале». */
	const SUBSCRIPTION = /^(init|install|subscribe|start|watch)[A-Z\w]*$|^(init|start)$/;

	const layerFiles = sources.filter(({ file }) => LAYER.test(file));
	const outside = sources.filter(({ file }) => !LAYER.test(file));

	/** `export function initX(`, `installX(): () => void {`, `start() {` у класі. */
	const declarations = layerFiles.flatMap(({ file, code }) =>
		[...code.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::[^{;]+)?\{/g)]
			.map((m) => ({ file, name: m[1] }))
			.filter(({ name }) => SUBSCRIPTION.test(name))
	);

	it('перевірка жива: підписки в сервісному шарі знайдено', () => {
		expect(
			declarations.map((d) => d.name),
			'жодної функції-підписки не знайдено — або розбір зламався, або конвенція імен змінилася'
		).not.toEqual([]);
	});

	it('кожну підписку хтось кличе поза сервісним шаром', () => {
		const calls = (name: string, code: string) =>
			new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(code) ||
			new RegExp(`\\.${name}\\s*\\(`).test(code);

		const dead: string[] = [];
		for (const { file, name } of declarations) {
			if (outside.some((s) => calls(name, s.code))) continue;

			// Один рівень непрямості: сусід по файлу, якого кличуть поза шаром.
			const own = layerFiles.find((s) => s.file === file);
			const neighbours = own
				? [...own.code.matchAll(/(?:export\s+)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)].map(
						(m) => m[1]
					)
				: [];
			const viaNeighbour = neighbours.some(
				(neighbour) =>
					neighbour !== name &&
					own !== undefined &&
					calls(name, own.code) &&
					outside.some((s) => calls(neighbour, s.code))
			);
			if (viaNeighbour) continue;

			dead.push(`${file}: ${name}() — підписку написано, і не кличе ніхто`);
		}
		expect(
			dead,
			`підписка виглядає як реалізована функція й не виконується ніколи:\n${dead.join('\n')}`
		).toEqual([]);
	});
});
