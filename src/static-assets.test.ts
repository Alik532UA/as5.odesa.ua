// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/**
 * Порядок у `static/` (PROJECT-STRUCTURE-v8 § 2) і борг за файлами, яких не
 * просить ніхто.
 *
 * ## Чому це взагалі гейт
 *
 * `adapter-static` копіює `static/` у `build/` ЦІЛКОМ — без розбору, чи хтось
 * на файл посилається. Тобто кожен забутий файл їде на Pages і лишається там
 * назавжди: збірка про нього не скаже, `check:build` дивиться на HTML, бюджет
 * JS рахує скрипти. Заміряно 2026-08-28: 57 файлів із 86 не згадані ніде в
 * `src/`, `scripts/`, `tests/` і `llms.txt` — разом **1504 КБ**, тобто більша
 * частина ваги сайту нікому не потрібна.
 *
 * Це той самий клас, що й осиротілий модуль (§ 4.3): файл, що існує, читається
 * як зроблена робота. Різниця лише в тому, що `structure.test.ts` дивиться на
 * `src/lib`, а сюди не заходив ніхто.
 *
 * ## Чому борг, а не видалення
 *
 * Серед сиріт — ітерації фавікона, набір іконок інструментів і растрові
 * експорти логотипа. Вирішувати за автора, що з них чернетка, а що заготовка
 * під наступну сторінку, гейт не має права. Він робить інше: називає число,
 * якому дозволено лише спадати. Рішення лишається людині, але перестає бути
 * невидимим.
 *
 * ## Межа методу
 *
 * Посилання шукаються за ІМЕНЕМ файлу й за шляхом від кореня сайту. Складений
 * у рантаймі шлях (`asset('/icons/' + name + '.svg')`) цей пошук вважав би
 * сиротою. У цьому проєкті таких немає — усі виклики `asset()` літеральні, і
 * саме тому метод застосовний; поява першого динамічного шляху зробить
 * знахідку хибною, і це треба буде помітити тут, а не в списку боргу.
 */

const ROOT = resolve(__dirname, '..');

/**
 * Що дозволено в КОРЕНІ `static/` (PROJECT-STRUCTURE-v8 § 2): службові файли,
 * які інструмент або стандарт вимагає саме там.
 *
 * `llms.txt` у переліку канону немає, і це не недогляд: як `robots.txt`, він
 * визначений стандартом рівно за адресою `/llms.txt`, тобто підпапка зробила б
 * його недосяжним.
 */
const ROOT_ALLOWED = [
	/^favicon\.[a-z0-9]+$/i,
	/^apple-touch-icon.*\.png$/i,
	/^android-chrome.*\.png$/i,
	/^robots\.txt$/,
	/^sitemap\.xml$/,
	/^manifest\.json$/,
	/^llms\.txt$/,
	/^CNAME$/,
	/^\.nojekyll$/,
	/^app-version\.json$/
];

/**
 * Борг сиріт: скільки файлів і скільки байтів. Обидва числа мають лише спадати.
 *
 * Пара, а не одне число: 57 дрібних іконок і 57 фотографій — різна вага, і
 * саме вага їде відвідувачу. Байти звіряються з допуском, бо перепакування
 * зображення міняє їх, не міняючи суті; кількість — точно.
 */
const ORPHAN_DEBT = { files: 57, bytes: 1_540_485 };

/** Каталоги, у яких шукаються посилання на файли `static/`. */
const SOURCE_DIRS = ['src', 'scripts', 'tests'];

/** Файли поза цими каталогами, які теж можуть посилатися на статику. */
const SOURCE_FILES = ['svelte.config.js', 'static/llms.txt', 'static/robots.txt', 'README.md'];

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else out.push(rel);
	}
	return out;
}

const staticFiles = walk('static');

const haystack = [
	...SOURCE_DIRS.flatMap((d) => walk(d)),
	...SOURCE_FILES.filter((f) => {
		try {
			return statSync(join(ROOT, f)).isFile();
		} catch {
			return false;
		}
	})
]
	.map((f) => readFileSync(join(ROOT, f), 'utf8'))
	.join('\n');

/** `/svg/logo.svg` — шлях, яким файл бачить відвідувач. */
const publicPath = (file: string) => `/${relative('static', file).split(sep).join('/')}`;

const orphans = staticFiles.filter((file) => {
	const name = file.split('/').pop()!;
	return !haystack.includes(name) && !haystack.includes(publicPath(file));
});

describe('static/ (PROJECT-STRUCTURE-v8 § 2)', () => {
	it('знаходить файли — перевірка жива', () => {
		expect(staticFiles.length, 'у static/ не знайдено жодного файлу').toBeGreaterThan(10);
		expect(haystack.length, 'джерела не прочиталися — усе виглядало б сиротою').toBeGreaterThan(
			10_000
		);
	});

	it('у корені static/ лежить лише службове', () => {
		const stray = readdirSync(join(ROOT, 'static'))
			.filter((entry) => statSync(join(ROOT, 'static', entry)).isFile())
			.filter((entry) => !ROOT_ALLOWED.some((re) => re.test(entry)));
		expect(
			stray,
			'медіафайл у корені static/ — місце йому в підпапці (images/, svg/, fonts/, audio/):\n' +
				stray.join('\n')
		).toEqual([]);
	});

	it('борг сиріт лише скорочується', () => {
		const bytes = orphans.reduce((sum, f) => sum + statSync(join(ROOT, f)).size, 0);
		const report = orphans
			.map((f) => `${String(statSync(join(ROOT, f)).size).padStart(8)}  ${publicPath(f)}`)
			.join('\n');

		expect(
			orphans.length,
			'на ці файли не посилається ніхто, а adapter-static копіює static/ у build/ ' +
				`цілком — тобто вони їдуть на Pages:\n${report}`
		).toBeLessThanOrEqual(ORPHAN_DEBT.files);

		expect(
			bytes,
			`вага сиріт зросла: ${bytes} байтів проти записаних ${ORPHAN_DEBT.bytes}`
		).toBeLessThanOrEqual(ORPHAN_DEBT.bytes);
	});

	it('записаний борг не застарів', () => {
		// Дзеркало до перевірки вище: число, що лишилося більшим за реальність,
		// так само неправдиве, як і перевищене — просто мовчазне
		// (AI-AGENT-PITFALLS-v8 § 5.5).
		expect(
			orphans.length,
			`сиріт стало ${orphans.length} — оновити ORPHAN_DEBT.files (записано ${ORPHAN_DEBT.files})`
		).toBe(ORPHAN_DEBT.files);
	});
});
