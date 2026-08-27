// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * FLUID-SIZING-v8, анти-патерн рівня CRITICAL:
 * `grid-template-columns: repeat(N, 1fr)` для колонок із вмістом.
 *
 * `1fr` — це скорочення від `minmax(auto, 1fr)`, тобто «не менше за
 * min-content». Доки в картці короткі слова, колонки виглядають рівними; варто
 * потрапити довгому слову, адресі чи нерозривному рядку — доріжка розсуває
 * сітку, решта колонок стискаються, і розкладка їде за межі екрана.
 *
 * Знаходить це не збірка, а користувач на своєму телефоні: на широкому екрані
 * розробника переповнення просто немає. `minmax(0, 1fr)` знімає нижню межу, і
 * вміст переносяться або обрізається всередині своєї колонки.
 *
 * Перевірка навмисно охоплює лише **колонки**: на блоковій осі та сама форма
 * поводиться інакше й переповнення сторінки не дає.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути `repeat(3, 1fr)`
 * у `+page.svelte` — перевірка червоніє саме на цьому рядку. Прогнано.
 */

const ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else if (/\.(svelte|css)$/.test(entry)) out.push(rel);
	}
	return out;
}

const files = walk('src');

/**
 * Значення `grid-template-columns` цілком — далі з нього вирізаються всі
 * `minmax(...)`, і якщо десь лишається доріжка `Nfr`, вона гола.
 *
 * Перша редакція шукала рівно `repeat(N, 1fr)` — і мала сліпу зону завбільшки
 * з половину випадків. Крізь неї в проєкті спокійно жили `1fr 1fr` (сітка
 * відділів на мобільному та герой), `2fr 1fr` і одинарне `1fr`: усе це той
 * самий `minmax(auto, 1fr)`, тобто доріжка з підлогою в min-content, і довге
 * слово розпирає сторінку так само. Девʼять місць, жодного з яких перевірка не
 * бачила, хоч саме проти цього й написана.
 *
 * Одинарне `1fr` рахується теж: одна доріжка, ширша за контейнер, дає
 * горизонтальний скрол сторінки нічим не гірше за три.
 */
const COLUMNS = /grid-template-columns:\s*([^;}\n]+)/g;
/** Вкладеність рівно на один рівень: `minmax(min(320px, 100%), 1fr)`. */
const MINMAX = /minmax\([^()]*(?:\([^()]*\)[^()]*)*\)/g;
/**
 * Доріжка `Nfr`. Закриваюча дужка ПІСЛЯ неї допустима — саме так виглядає
 * `repeat(3, 1fr)`, перший випадок, заради якого файл і писався. Перша спроба
 * нової регулярки виключала `)` у lookahead, щоб не влучати всередину
 * `minmax(...)`, і мовчки перестала бачити `repeat(3, 1fr)`: сам `minmax` до
 * цього моменту вже вирізаний, тож ця обережність лише зашкодила. Знайдено
 * зворотним експериментом, а не читанням.
 */
const TRACK_FR = /(?<![\w-])\d*\.?\d*fr(?![\w-])/;

/**
 * `minmax(320px, 1fr)` в `auto-fit`: піксельний мінімум більший за вузький
 * екран означає, що доріжка не вміщається взагалі. Канон вимагає
 * `minmax(min(320px, 100%), 1fr)`.
 *
 * Прив'язка до `grid-template-columns` обов'язкова, і це не формальність:
 * перша редакція шукала шаблон будь-де й одразу знайшла
 * `grid-template-rows: repeat(auto-fit, minmax(80px, 1fr))` у `/test`. На
 * блоковій осі 80px не ширші за екран нічим — знахідка була б хибною, а хибний
 * гейт вимикають.
 */
const PX_MINMAX = /grid-template-columns:[^;}]*repeat\(\s*auto-(?:fit|fill)\s*,\s*minmax\(\s*\d+px\s*,/g;

/**
 * Анти-патерн CRITICAL «модальне вікно без `max-height` у центрованому
 * оверлеї». Дефекту не видно НІ в джерелах, НІ в `build/`: розмітка правильна,
 * стилі на місці, і на екрані розробника все вміщається. Він живе лише в
 * рантаймі й лише на короткому вікні (AI-AGENT-PITFALLS-v8 § 2.1).
 *
 * Заміряно 2026-08-28 у `PianoModal.svelte`: на 844×390 вміст мав 668 px і
 * стирчав на 139 px угору й на 139 px униз. Батько центрує і має
 * `overflow: hidden`, тож зайве обрізається З ОБОХ БОКІВ — доскролити до
 * нього не можна взагалі. З клавіатури піаніно зникало 119 px.
 *
 * Перевірка навмисно груба: вона питає не «чи правильна стеля», а «чи взагалі
 * хтось про неї подумав». Точну геометрію міряє `tests/overlay-fit.spec.ts` у
 * живому браузері — тут же йде клас, тобто наступна модалка, якої ще немає.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати
 * `max-height: 100dvh` з `#wrap` у `PianoModal.svelte` — перевірка червоніє
 * саме на цьому файлі. Прогнано.
 */
/** `селектор { тіло }` без вкладеності — цього досить для блоків-оверлеїв. */
const RULE = /([^{}]+)\{([^{}]*)\}/g;

function isCenteredOverlay(body: string): boolean {
	const fixed = /position\s*:\s*fixed/.test(body);
	const spansViewport = /inset\s*:\s*0/.test(body) || /(top|bottom)\s*:\s*0/.test(body);
	const centers =
		/justify-content\s*:\s*center/.test(body) ||
		/align-items\s*:\s*center/.test(body) ||
		/place-items\s*:\s*center/.test(body);
	return fixed && spansViewport && centers;
}

describe('гнучкі розміри', () => {
	it('знаходить стилі — перевірка жива', () => {
		expect(files.length, 'у src/ немає жодного .svelte чи .css').toBeGreaterThan(10);
	});

	it('колонки сітки не мають голого 1fr (CRITICAL)', () => {
		const bad: string[] = [];
		for (const f of files) {
			for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(COLUMNS)) {
				const value = m[1].trim();
				if (TRACK_FR.test(value.replace(MINMAX, ''))) {
					bad.push(`${f}: grid-template-columns: ${value} — доріжку треба в minmax(0, Nfr)`);
				}
			}
		}
		expect(bad, `колонка не може стиснутися менше за вміст:\n${bad.join('\n')}`).toEqual([]);
	});

	it('auto-fit не бере піксельний мінімум (CRITICAL)', () => {
		const bad: string[] = [];
		for (const f of files) {
			for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(PX_MINMAX)) {
				bad.push(`${f}: ${m[0].trim()} — потрібно minmax(min(Npx, 100%), 1fr)`);
			}
		}
		expect(bad, `на вузькому екрані доріжка ширша за екран:\n${bad.join('\n')}`).toEqual([]);
	});

	it('центрований оверлей обмежує висоту вмісту (CRITICAL)', () => {
		const bad: string[] = [];
		for (const f of files) {
			const source = readFileSync(join(ROOT, f), 'utf8');
			const overlays = [...source.matchAll(RULE)]
				.filter((m) => isCenteredOverlay(m[2]))
				.map((m) => m[1].trim());
			if (overlays.length === 0) continue;
			if (!/max-height\s*:/.test(source)) {
				bad.push(`${f}: ${overlays.join(', ')} — центрує вміст, але жодного max-height у файлі`);
			}
		}
		expect(
			bad,
			'вміст, вищий за коротке вікно, обрізається З ОБОХ БОКІВ і доскролити до нього ' +
				`не можна:\n${bad.join('\n')}`
		).toEqual([]);
	});
});
