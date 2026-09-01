import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GATE-EOL — гейти читають той самий текст на всіх машинах
 * (AI-AGENT-PITFALLS-v8 § 1.5, `PIT-EOL-GATE`, рівень HIGH).
 *
 * ## Що саме ламається
 *
 * Без `.gitattributes` робоче дерево на Windows отримує CRLF, а в репозиторії й
 * у CI (Linux) лишається LF. Для збірки це невидимо. Для перевірок, які читають
 * ВЛАСНІ джерела текстом — а тут таких більшість, — різниця в один символ на
 * рядок означає інший вердикт.
 *
 * **Найгірший прояв — не червоний тест, а мовчазний нуль.** Регулярка з `$` без
 * прапорця `m` перестає збігатися через `\r`, гейт звітує «нічого не знайдено» й
 * виглядає зеленим — тобто перетворюється рівно на ту порожню перевірку, проти
 * якої написаний § 1. Проєкт це вже проходив: хеш інлайн-скрипта в CSP рахувався
 * над CRLF і вимикав заставку, і саме тому `svelte.config.js` досі нормалізує
 * текст перед хешуванням (`src/csp-hash.test.ts`).
 *
 * ## Чому перевіряється індекс, а не наявність файлу
 *
 * `.gitattributes` лежав у репозиторії з 2026-08-26 і не мав жодної перевірки.
 * «Файл є» — не те твердження, яке потрібне: правило діє лише тоді, коли git
 * СПРАВДІ нормалізував уміст, а після зміни атрибутів без `git add --renormalize`
 * індекс і робоче дерево розходяться мовчки. Тому джерело тут — `git ls-files
 * --eol`, тобто те, що бачить сам git, а не текст конфіга.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати рядок
 * `* text=auto eol=lf` з `.gitattributes` — перевірка «правило оголошене»
 * червоніє; замінити `*.png binary` на порожній рядок — червоніє перевірка про
 * двійкові типи з іменем `png`. Прогнано.
 */

const ROOT = resolve(__dirname, '..');

/** Рядок `git ls-files --eol`: `i/<індекс> w/<дерево> attr/<атрибут> <шлях>`. */
type EolEntry = { index: string; worktree: string; path: string };

/**
 * `--eol` без `-z`: шляхи з пробілами тут не трапляються, а `\t` перед шляхом
 * git ставить завжди, тож розбір однозначний.
 */
function readEol(): EolEntry[] {
	const out = execFileSync('git', ['ls-files', '--eol'], { cwd: ROOT, encoding: 'utf8' });
	return out
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line) => {
			const [attrs, path] = line.split('\t');
			const [index, worktree] = attrs.trim().split(/\s+/);
			return { index: index.replace(/^i\//, ''), worktree: worktree.replace(/^w\//, ''), path };
		});
}

const extensionOf = (path: string) => path.match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase() ?? '';

describe('GATE-EOL (AI-AGENT-PITFALLS-v8 § 1.5)', () => {
	const entries = readEol();
	const attributes = readFileSync(resolve(ROOT, '.gitattributes'), 'utf8');

	it('git відповів — перевірка жива', () => {
		// Порожній перелік дав би «розбіжностей немає» на будь-якому стані.
		expect(entries.length, '`git ls-files --eol` не повернув жодного файлу').toBeGreaterThan(100);
	});

	it('правило оголошене для всього дерева', () => {
		expect(
			/^\*\s+text=auto\s+eol=lf\s*$/m.test(attributes),
			'`* text=auto eol=lf` — єдиний рядок, що фіксує форму в РОБОЧОМУ дереві, ' +
				'тобто ту, яку читають перевірки'
		).toBe(true);
	});

	it('кожен двійковий тип, що справді лежить у репозиторії, названий явно', () => {
		// Перелік виводиться з того, що git КЛАСИФІКУВАВ як двійкове, а не з
		// написаного наперед списку: інакше новий формат (шрифт, відео) лишався б
		// на евристиці, і про це ніхто б не дізнався.
		const binaryExtensions = [
			...new Set(entries.filter((e) => e.index === '-text').map((e) => extensionOf(e.path)))
		]
			.filter(Boolean)
			.sort();

		/** `*.png binary` або `*.png -text` — обидві форми означають те саме. */
		const declared = new Set(
			attributes
				.split('\n')
				.map((line) => line.trim().match(/^\*\.([A-Za-z0-9]+)\s+(?:binary|-text)\b/))
				.filter((m): m is RegExpMatchArray => m !== null)
				.map((m) => m[1].toLowerCase())
		);
		const missing = binaryExtensions.filter((ext) => !declared.has(ext));

		expect(
			binaryExtensions.length,
			'жодного двійкового файлу — перевірка міряла б порожнечу'
		).toBeGreaterThan(0);
		expect(
			missing,
			'евристика git вгадує двійковість за вмістом і помиляється на файлах, ' +
				`що починаються з тексту:\n${missing.map((ext) => '*.' + ext).join('\n')}`
		).toEqual([]);
	});

	it('індекс і робоче дерево не розійшлися', () => {
		const drifted = entries
			.filter((e) => e.index !== e.worktree)
			.map((e) => `${e.path}: індекс ${e.index}, дерево ${e.worktree}`);
		expect(
			drifted,
			'локальний прогін і CI читають різний текст; лікується `git add --renormalize .`:\n' +
				drifted.join('\n')
		).toEqual([]);
	});

	it('жоден текстовий файл не лежить в індексі з CRLF', () => {
		// `none` — файл без жодного переносу рядка (порожній `.nojekyll`), `-text`
		// — двійковий. Ні те, ні те не є текстом із закінченнями рядків.
		const crlf = entries
			.filter((e) => e.index !== 'lf' && e.index !== 'none' && e.index !== '-text')
			.map((e) => `${e.path}: ${e.index}`);
		expect(
			crlf,
			`гейт, що читає власні джерела, дасть на цих файлах інший вердикт:\n${crlf.join('\n')}`
		).toEqual([]);
	});
});
