import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GATE-DOC-NUMBERS — число в документі не розходиться з тим, що міряє гейт
 * (AI-AGENT-PITFALLS-v8 § 5.5.1, `PIT-NUMBER-UNDER-GATE`, рівень HIGH).
 *
 * ## Чому це окрема перевірка
 *
 * § 5.5 вимагає ВИМІРЯТИ число, перш ніж його записати. Цього замало: вимір
 * правдивий у мить запису й починає розходитися з наступного коміту. Далі його
 * читають як факт — саме тому, що колись він був заміряний чесно.
 *
 * Проєкт це вже проходив: коміт `b00df49` виправляв `PROJECT-CONTEXT.md`, який
 * рахував 173 перевірки з 233 і чотири борги розміру з трьох. Виправлення було
 * ручним, тобто клас лишився відкритим — і за наступні два тижні розійшлися ще
 * три числа: файлів під `svelte-check` (4221 проти 4232), `eslint-disable` (два
 * проти чотирьох) і перевірок, які читають власні джерела (13 із 26 у
 * `.gitattributes`).
 *
 * ## Що саме перевіряється — і чого тут навмисно немає
 *
 * Джерелом тут НЕ може бути новий замір: гейт, який рахує по-своєму, дає третю
 * копію факту замість двох. Тому кожне число звіряється рівно з тим джерелом,
 * яким користується гейт, що ним володіє: `SIZE_DEBT` зі `structure.test.ts`,
 * `DEBT` з `eslint-baseline.test.ts`, `ORPHAN_DEBT` зі `static-assets.test.ts`,
 * переліки файлів — із самої файлової системи.
 *
 * Чого немає: кількості ПЕРЕВІРОК у прогоні (її друкує сам раннер, і документ
 * тепер посилається на команду замість числа) і кількості файлів під
 * `svelte-check` (міняється від версії SvelteKit). Канон називає це прямо:
 * формулювання без числа чесніше за число, що застаріє.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): змінити в
 * `PROJECT-CONTEXT.md` «**31**» на «**30**» — червоніє перелік інваріантів;
 * прибрати рядок про `FooterSection` із таблиці боргу розміру — червоніє
 * звірка з `SIZE_DEBT`. Прогнано.
 */

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const CONTEXT = read('PROJECT-CONTEXT.md');
const AGENTS = read('AGENTS.md');

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, keep, out);
		else if (keep(entry)) out.push(rel);
	}
	return out;
}

/** Абзац документа від заголовної фрази до першого порожнього рядка після неї. */
function paragraph(source: string, startsWith: string): string {
	const at = source.indexOf(startsWith);
	if (at < 0) return '';
	const end = source.indexOf('\n\n', at);
	return source.slice(at, end < 0 ? undefined : end);
}

/** Усе, що в тексті стоїть у зворотних лапках. */
const ticked = (text: string) => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

/** Перше жирне число абзацу: `**31**`. */
function boldNumber(text: string): number | null {
	const m = text.match(/\*\*(\d+)\*\*/);
	return m ? Number(m[1]) : null;
}

describe('GATE-DOC-NUMBERS (AI-AGENT-PITFALLS-v8 § 5.5.1)', () => {
	it('документи прочитано — перевірка жива', () => {
		expect(CONTEXT.length, 'PROJECT-CONTEXT.md порожній').toBeGreaterThan(1000);
		expect(AGENTS.length, 'AGENTS.md порожній').toBeGreaterThan(1000);
	});

	it('перелік файлів інваріантів збігається з тим, що лежить у src/', () => {
		const actual = walk('src', (n) => n.endsWith('.test.ts'))
			.map((f) => f.replace(/^src\//, '').replace(/\.test\.ts$/, ''))
			.sort();

		const block = paragraph(CONTEXT, 'Файли інваріантів під `src/`');
		expect(block, 'абзац із переліком інваріантів зник із документа').not.toBe('');

		// З абзацу беруться лише імена файлів: `src/`, `GATE-DOC-NUMBERS` і назва
		// самого гейта в лапках стоять там як посилання, а не як перелік.
		const NOT_A_NAME = /^(src\/|GATE-|.*\.test\.ts$)/;
		const claimed = ticked(block)
			.filter((name) => !NOT_A_NAME.test(name))
			.sort();

		expect(claimed, 'перелік у PROJECT-CONTEXT.md розійшовся з файловою системою').toEqual(actual);
		expect(boldNumber(block), 'число поруч із переліком').toBe(actual.length);
	});

	it('перелік E2E-специфікацій збігається з тим, що лежить у tests/', () => {
		const actual = walk('tests', (n) => n.endsWith('.spec.ts'))
			.map((f) => f.replace(/^tests\//, ''))
			.sort();

		const block = paragraph(CONTEXT, 'E2E живуть у кореневому');
		expect(block, 'абзац із переліком E2E зник із документа').not.toBe('');

		const claimed = ticked(block)
			.filter((name) => name.endsWith('.spec.ts'))
			.sort();

		expect(claimed, 'перелік E2E у PROJECT-CONTEXT.md розійшовся з файловою системою').toEqual(
			actual
		);
		expect(boldNumber(block), 'число поруч із переліком E2E').toBe(actual.length);
	});

	it('таблиця боргу за розміром збігається з SIZE_DEBT', () => {
		const source = read('src/structure.test.ts');
		const declared = [...source.matchAll(/'(src\/[^']+)':\s*(\d+)/g)].map((m) => `${m[1]} = ${m[2]}`);

		const table = [...CONTEXT.matchAll(/^\|\s*`(src\/[^`]+)`\s*\|\s*(\d+)\s*\|/gm)].map(
			(m) => `${m[1]} = ${m[2]}`
		);

		expect(declared.length, 'SIZE_DEBT порожній — перевірка міряла б порожнечу').toBeGreaterThan(0);
		expect(table.sort(), 'таблиця в PROJECT-CONTEXT.md розійшлася з SIZE_DEBT').toEqual(
			declared.sort()
		);
	});

	it('таблиця боргу ESLint збігається з DEBT', () => {
		const source = read('src/eslint-baseline.test.ts');
		const from = source.indexOf('const DEBT');
		const block = source.slice(from, source.indexOf('};', from));
		const declared = new Map(
			[...block.matchAll(/'([^']+)':\s*(\d+)/g)].map((m) => [m[1], Number(m[2])] as const)
		);
		expect(declared.size, 'DEBT порожній — перевірка міряла б порожнечу').toBeGreaterThan(0);

		const rows = new Map(
			[...CONTEXT.matchAll(/^\|\s*`([\w@/.-]+)`\s*\|\s*(\d+)\s*\|\s*`(warn|error)`\s*\|/gm)].map(
				(m) => [m[1], { count: Number(m[2]), level: m[3] }] as const
			)
		);
		expect(rows.size, 'таблиця боргу ESLint зникла з документа').toBeGreaterThan(0);

		const drift: string[] = [];
		for (const [rule, count] of declared) {
			const row = rows.get(rule);
			if (!row) drift.push(`${rule}: у DEBT ${count}, у документі рядка немає`);
			else if (row.count !== count) drift.push(`${rule}: у DEBT ${count}, у документі ${row.count}`);
			else if (row.level !== 'warn') drift.push(`${rule}: у DEBT є, а в документі рівень ${row.level}`);
		}
		expect(drift, drift.join('\n')).toEqual([]);

		const total = [...declared.values()].reduce((sum, n) => sum + n, 0);
		const claimed = CONTEXT.match(/Разом (\d+) попереджень/);
		expect(claimed, 'рядок «Разом N попереджень» зник із документа').not.toBeNull();
		expect(Number(claimed![1]), 'сума в документі розійшлася з DEBT').toBe(total);
	});

	it('перелік eslint-disable збігається з тим, що стоїть у коді', () => {
		// Директива, а не згадка: коментар мусить ПОЧИНАТИСЯ з неї. Інакше під
		// перевірку потрапляє докблок, який пояснює, чому директива тут стоїть, —
		// а таких у підвалі рівно один, і він поруч зі справжньою директивою.
		const DIRECTIVE = /^[ \t]*(?:\/\/|<!--)[ \t]*eslint-disable(?:-next-line)?\b/m;
		const withDirective = walk('src', (n) => n.endsWith('.ts') || n.endsWith('.svelte'))
			.filter((f) => !f.endsWith('.test.ts'))
			.filter((f) => DIRECTIVE.test(read(f)))
			.sort();

		const block = paragraph(CONTEXT, 'Чотири `eslint-disable` у проєкті');
		expect(block, 'абзац про eslint-disable зник із документа').not.toBe('');
		expect(withDirective.length, 'жодного придушення — перевірка міряла б порожнечу').toBeGreaterThan(
			0
		);

		const named = ticked(block);
		const missing = withDirective.filter((f) => !named.some((name) => f.endsWith(name)));
		expect(missing, `придушення без запису в документі:\n${missing.join('\n')}`).toEqual([]);
	});

	it('борг сиріт у static/ збігається з ORPHAN_DEBT', () => {
		const source = read('src/static-assets.test.ts');
		const files = Number(source.match(/ORPHAN_DEBT\s*=\s*\{\s*files:\s*(\d+)/)![1]);
		const bytes = Number(source.match(/bytes:\s*([\d_]+)/)![1].replace(/_/g, ''));
		const kb = Math.floor(bytes / 1024);
		const total = walk('static', () => true).length;

		const claim = CONTEXT.match(
			/\*\*(\d+) файлів із (\d+) не згадані ніде\*\*, разом \*\*(\d+) КБ\*\*/
		);
		expect(claim, 'рядок про сиріт у static/ зник із документа').not.toBeNull();
		expect(
			{ orphans: Number(claim![1]), total: Number(claim![2]), kb: Number(claim![3]) },
			'число в PROJECT-CONTEXT.md розійшлося з ORPHAN_DEBT або з умістом static/'
		).toEqual({ orphans: files, total, kb });

		const inAgents = AGENTS.match(/(\d+) КБ статики не просить ніхто/);
		expect(inAgents, 'рядок про сиріт зник із AGENTS.md').not.toBeNull();
		expect(Number(inAgents![1]), 'AGENTS.md розійшовся з ORPHAN_DEBT').toBe(kb);
	});
});
