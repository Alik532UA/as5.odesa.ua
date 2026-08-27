// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Хардкод user-facing рядків в АТРИБУТАХ розмітки (I18N-v8, HIGH).
 *
 * ## Чому інваріант з'явився лише тепер
 *
 * `PROJECT-CONTEXT.md` уже мав рядок про хардкод українських рядків, число «3»
 * і команду, якою це заміряно:
 *
 *     grep -rnoE 'aria-label="[^"{]*[А-Яа-яІіЇїЄєҐґ][^"]*"' src --include="*.svelte"
 *
 * Команда правильна для того, що вона шукає, — і саме тому число «3» читалося
 * як «усе інше перевірено». Насправді вона дивиться на ОДИН атрибут із восьми.
 * Перший же прогін ширшого пошуку 2026-08-28 знайшов `alt` у `LogoIcon.svelte`:
 * логотип стоїть у шапці кожної сторінки, тобто англійська версія сайту
 * віддавала українське `alt` завжди — і на чотирьох сторінках із семи це був
 * єдиний `alt` на всю сторінку.
 *
 * Це той самий клас, що й «сліпа зона інваріанта сіток» (`1fr 1fr` повз
 * `repeat(N, 1fr)`): перевірка була, дивилася поруч і мовчала.
 *
 * ## Межа інваріанта, і її треба знати
 *
 * Перевіряються АТРИБУТИ, не текстові вузли. Текст у розмітці ловиться інакше:
 * майже весь він тут — це запасні значення `safeT($t, 'ключ', 'текст')`, тобто
 * законний хардкод на випадок, коли словник не приїхав, плюс метадані JSON-LD
 * у `+layout.svelte`, які й мусять бути українською (в індексі лише `uk`).
 * Перевірка над текстом складалася б переважно з винятків, а список винятків
 * завдовжки з саму перевірку — це вимкнена перевірка.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути
 * `alt="Логотип Одеської школи мистецтв №5"` у `LogoIcon.svelte` — інваріант
 * червоніє саме на цьому рядку. Прогнано.
 */

const ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else if (entry.endsWith('.svelte')) out.push(rel);
	}
	return out;
}

const files = walk('src');

/**
 * Атрибути, значення яких читає людина — очима або читалкою. `alt` стоїть
 * першим навмисно: саме його не було в попередній команді пошуку.
 */
const USER_FACING =
	'alt|aria-label|aria-description|aria-roledescription|aria-valuetext|aria-placeholder|title|placeholder';

/**
 * `attr="…"`, `attr='…'` і фігурні форми `attr={"…"}` / `attr={'…'}` /
 * ``attr={`…`}``. Значення береться цілком, а далі відсіюється те, що містить
 * `$t(` чи `{`: рядок із підстановкою — уже не літерал.
 */
const ATTR = new RegExp(`\\b(${USER_FACING})=(?:\\{\\s*)?(["'\`])((?:(?!\\2)[\\s\\S])*)\\2`, 'g');

const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;

/**
 * Відомий хардкод, кожен запис — свідоме рішення з причиною.
 *
 * Формат `файл: значення`. Саме значення, а не лише файл: інакше запис
 * покривав би й наступний, ще не написаний рядок у тому ж файлі.
 */
const ALLOWED: readonly string[] = [
	// Чернетка `/test` — три підписи каруселі. Названі в `PROJECT-CONTEXT.md`
	// як відоме відхилення: сторінки немає ні в індексі, ні в меню, а файл
	// стоїть у `SIZE_DEBT`, тож правити його тут означало б розміняти борг
	// розміру на локалізацію чернетки.
	'src/routes/test/+page.svelte: Попередній слайд',
	'src/routes/test/+page.svelte: Наступний слайд',
	'src/routes/test/+page.svelte: Слайд {i + 1}',
	// Табло версії: двомовний підпис одним рядком. Словника він і не мусить
	// мати — його читають тоді, коли звіряють версію збірки, а не коли читають
	// сайт. Названо в `PROJECT-CONTEXT.md` разом із підтвердженням аварійного
	// скидання, яке живе в тій самій логіці.
	'src/lib/components/ui/ServiceBadge.svelte: Копіювати звіт / Copy report'
];

describe('хардкод user-facing рядків в атрибутах (I18N-v8, HIGH)', () => {
	it('знаходить розмітку — перевірка жива', () => {
		expect(files.length, 'у src/ немає жодного .svelte').toBeGreaterThan(10);
	});

	it('регулярка бачить атрибут — перевірка не дивиться повз', () => {
		// Canary над самим механізмом: якби `ATTR` перестала збігатися (нова
		// форма запису, зміна лапок), перелік порушень став би порожнім, і
		// зелений результат не означав би нічого (AI-AGENT-PITFALLS-v8 § 1).
		const sample = '<img alt="Логотип" /><a aria-label={\'Меню\'}></a>';
		const found = [...sample.matchAll(new RegExp(ATTR.source, 'g'))].map((m) => m[3]);
		expect(found).toEqual(['Логотип', 'Меню']);
	});

	it('жоден user-facing атрибут не несе кирилиці повз словник', () => {
		const bad: string[] = [];
		for (const file of files) {
			const source = readFileSync(join(ROOT, file), 'utf8')
				.replace(/<!--[\s\S]*?-->/g, '')
				.replace(/\/\*[\s\S]*?\*\//g, '');
			for (const match of source.matchAll(new RegExp(ATTR.source, 'g'))) {
				const [, attr, , value] = match;
				if (!CYRILLIC.test(value)) continue;
				// Виключається рівно `$t(…)` — звернення до словника. Підстановка
				// сама по собі НЕ виправдання: `aria-label="Слайд {i + 1}"` — це
				// захардкоджене українське слово з номером, а не переклад.
				// Перша редакція фільтра пропускала будь-яке `{`, і цим прощала
				// саме той випадок, заради якого писалася.
				if (value.includes('$t(')) continue;
				const entry = `${file}: ${value}`;
				if (ALLOWED.some((allowed) => entry.startsWith(allowed))) continue;
				bad.push(`${file}: ${attr}="${value}"`);
			}
		}
		expect(
			bad,
			'рядок, який бачить людина, мусить бути ключем у словнику — інакше ' +
				`англійська версія сайту віддає українську:\n${bad.join('\n')}`
		).toEqual([]);
	});

	it('у списку дозволених немає записів, яких у розмітці вже немає', () => {
		const all = files.map((f) => `${f}: ${readFileSync(join(ROOT, f), 'utf8')}`).join('\n');
		const stale = ALLOWED.filter((entry) => {
			const [file, value] = entry.split(': ');
			return !readFileSync(join(ROOT, file), 'utf8').includes(value) || !all.includes(file);
		});
		expect(stale, `запис застарів — прибрати зі списку:\n${stale.join('\n')}`).toEqual([]);
	});
});
