// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Кожен файл перевірки належить раннеру, який у проєкті справді є
 * (AI-AGENT-PITFALLS-v8 § 1.3).
 *
 * Клас дефекту: файл виглядає як перевірка, рахується в переліку «що в нас
 * тестується» — і не запускається ніде. Три способи, якими це стається:
 *
 *   1. Раннера немає в залежностях узагалі (файл під Playwright у проєкті,
 *      де Playwright не встановлений).
 *   2. Раннер є, конфігу немає.
 *   3. Раннер і конфіг є, але файл лежить поза `testDir` — Playwright його
 *      просто не бачить, і жодного слова про це не буде.
 *
 * Мовчазне зникнення перевірки гірше за порожню заглушку: заглушка хоч
 * виконується. Окремо ловиться `@ts-nocheck` — він вимикає останній гейт,
 * який міг би помітити мертвий імпорт.
 *
 * Зворотний експеримент (§ 1.1): тимчасово прибрати `vitest` із
 * `devDependencies` — перевірка має перелічити всі файли перевірок проєкту.
 */

/** Корінь проєкту: vitest завжди стартує звідти, на відміну від `__dirname` в ESM. */
const ROOT = process.cwd().replace(/\\/g, '/');

/** Каталоги, у яких взагалі можуть лежати файли перевірок. */
const SEARCH_DIRS = ['src', 'tests', 'e2e'];

const RUNNERS = [
	{
		imports: '@playwright/test',
		dep: '@playwright/test',
		config: /^playwright\.config\./,
		/** Як раннер називають у документах для людини й агента. */
		docName: 'Playwright'
	},
	{
		imports: 'vitest',
		dep: 'vitest',
		config: /^vitest\.config\.|^vite\.config\./,
		docName: 'Vitest'
	}
];

/** Документи, які агент читає ПЕРЕД кодом і за якими вирішує, що робити. */
const AGENT_DOCS = ['AGENTS.md', 'PROJECT-CONTEXT.md'];

/**
 * Слова, якими документ стверджує ВІДСУТНІСТЬ раннера.
 *
 * Перелік навмисно короткий: ловити треба твердження «його тут немає», а не
 * будь-яке «не» поруч із назвою. Речення «файл поза `testDir` раннер НЕ бачить»
 * описує поведінку наявного раннера й фальшивим спрацюванням бути не мусить.
 */
const ABSENT = /не\s+стоїть|не\s+встановлен|немає\s+в\s+залежностях|відсутн/i;

/**
 * Дзеркальне твердження — «він тут є».
 *
 * БЕЗ `\b`: у JavaScript межа слова визначена через `\w`, тобто
 * `[A-Za-z0-9_]`, і кирилиця в неї не входить. `/\bстоїть\b/` не збігається з
 * «стоїть» ніколи — регулярка виглядала б строгішою й не ловила б нічого.
 * Помічено зворотним експериментом: після видалення `@playwright/test` із
 * `devDependencies` ця половина перевірки лишалася зеленою.
 *
 * «Стоїть» усередині «не стоїть» відсіює окрема умова `!ABSENT` на місці
 * використання.
 */
const PRESENT = /стоїть|встановлен/i;

function playwrightTestDir(): string | null {
	const config = readdirSync(ROOT).find((f) => /^playwright\.config\./.test(f));
	if (!config) return null;
	const source = readFileSync(join(ROOT, config), 'utf8');
	const match = source.match(/testDir\s*:\s*['"`]\.?\/?([^'"`]+)['"`]/);
	return match ? match[1].replace(/\/$/, '') : null;
}

/**
 * Коментарі відрізаються перед пошуком імпорту, інакше перевірка оголосить
 * сиротою сама себе: у докблоці вище процитовано назви раннерів.
 */
function withoutComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(spec|test)\.(ts|js)$/.test(entry)) out.push(full.replace(/\\/g, '/'));
	}
	return out;
}

const specFiles = SEARCH_DIRS.flatMap((dir) => walk(join(ROOT, dir))).map((f) => f.slice(ROOT.length + 1));

describe('файли перевірок', () => {
	it('перевірка жива: файли перевірок узагалі знайдено', () => {
		expect(specFiles.length, 'жодного файлу перевірки — сканер шукає не там').toBeGreaterThan(2);
	});

	it('кожен файл перевірки належить раннеру, який у проєкті є', () => {
		const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
		const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
		const rootEntries = readdirSync(ROOT);

		const orphans: string[] = [];
		for (const file of specFiles) {
			const source = withoutComments(readFileSync(join(ROOT, file), 'utf8'));
			const runner = RUNNERS.find((r) =>
				new RegExp(`from\\s*['"]${r.imports.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}['"]`).test(source)
			);

			if (!runner) {
				orphans.push(`${file}: не імпортує жодного відомого раннера`);
				continue;
			}
			if (!deps[runner.dep]) {
				orphans.push(`${file}: імпортує ${runner.dep}, якого немає в package.json`);
				continue;
			}
			if (!rootEntries.some((entry) => runner.config.test(entry))) {
				orphans.push(`${file}: імпортує ${runner.dep}, але конфігу для нього в корені немає`);
				continue;
			}
			if (runner.dep === '@playwright/test') {
				const dir = playwrightTestDir();
				if (dir && !file.startsWith(`${dir}/`)) {
					orphans.push(`${file}: під Playwright, але поза testDir «${dir}» — раннер його не бачить`);
				}
			}
		}

		expect(orphans, `перевірки, яких не запускає ніхто:\n${orphans.join('\n')}`).toEqual([]);
	});

	/**
	 * Документ для агента не суперечить `package.json` щодо раннерів.
	 *
	 * КЛАС ДЕФЕКТУ, і він дорожчий, ніж виглядає. `AGENTS.md` три дні поспіль
	 * оголошував Playwright невстановленим — уже після того, як його поставили
	 * (2026-08-23, разом із гейтом axe), — і додавав пряму заборону: «не пиши
	 * файлів під нього». Агент читає цей файл ПЕРШИМ, тобто заборона діяла на
	 * рівно ту роботу, якої проєкту бракувало: `GATE-TESTID-RUNTIME` з канону
	 * лишався невиконаним, а докблок `testid-conventions.test.ts` уже посилався
	 * на нього як на наявний. `PROJECT-CONTEXT.md` при цьому знав правду —
	 * тобто два документи одного репозиторію суперечили один одному, і нічого
	 * від цього не червоніло.
	 *
	 * Перевірка читає РЕЧЕННЯ, а не файл цілком: «Playwright не стоїть» і
	 * «Vitest стоїть» в одному абзаці — нормальний текст, і зводити їх докупи
	 * означало б ловити сусідство замість твердження.
	 *
	 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): дописати в `AGENTS.md`
	 * «Playwright тут не стоїть» — перевірка червоніє; прибрати
	 * `@playwright/test` із `devDependencies` — червоніє протилежне твердження.
	 */
	it('AGENTS.md і PROJECT-CONTEXT.md не суперечать package.json щодо раннерів', () => {
		const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
		const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

		const lies: string[] = [];
		for (const doc of AGENT_DOCS) {
			const path = join(ROOT, doc);
			if (!existsSync(path)) continue;
			// Речення — до крапки, двокрапки-тире або кінця рядка: у цих файлах
			// твердження живуть у пунктах списків і клітинках таблиць, а не в прозі.
			const sentences = readFileSync(path, 'utf8').split(/(?<=[.!?])\s+|\r?\n|\s\|\s/);

			for (const runner of RUNNERS) {
				const installed = Boolean(deps[runner.dep]);
				for (const sentence of sentences) {
					if (!sentence.includes(runner.docName)) continue;
					if (installed && ABSENT.test(sentence)) {
						lies.push(`${doc}: «${sentence.trim()}» — а ${runner.dep} у package.json Є`);
					}
					if (!installed && PRESENT.test(sentence) && !ABSENT.test(sentence)) {
						lies.push(`${doc}: «${sentence.trim()}» — а ${runner.dep} у package.json НЕМАЄ`);
					}
				}
			}
		}

		expect(
			lies,
			`документ для агента розійшовся з package.json:\n${lies.join('\n')}`
		).toEqual([]);
	});

	it('жоден файл перевірки не вимикає типи через @ts-nocheck', () => {
		const silenced = specFiles.filter((file) =>
			/^\s*\/\/\s*@ts-nocheck/m.test(readFileSync(join(ROOT, file), 'utf8'))
		);
		expect(
			silenced,
			`@ts-nocheck вимикає останній гейт, який міг би помітити мертвий імпорт:\n${silenced.join('\n')}`
		).toEqual([]);
	});
});
