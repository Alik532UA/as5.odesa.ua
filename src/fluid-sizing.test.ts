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

/** `repeat(N, 1fr)` без `minmax`. `repeat(3, minmax(0, 1fr))` під шаблон не підпадає. */
const BARE_FR = /grid-template-columns:[^;}]*repeat\(\s*\d+\s*,\s*1fr\s*\)/g;

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

describe('гнучкі розміри', () => {
	it('знаходить стилі — перевірка жива', () => {
		expect(files.length, 'у src/ немає жодного .svelte чи .css').toBeGreaterThan(10);
	});

	it('колонки сітки не мають голого 1fr (CRITICAL)', () => {
		const bad: string[] = [];
		for (const f of files) {
			for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(BARE_FR)) {
				bad.push(`${f}: ${m[0].trim()} — потрібно minmax(0, 1fr)`);
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
});
