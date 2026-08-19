// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Інваріанти гарячих клавіш (HOTKEYS-v8 § 6, гейт `GATE-HOTKEYS`).
 *
 * Файл читає ДЖЕРЕЛА, а не поведінку, і це вимушено: обробник живе в `.svelte`,
 * якого цей раннер не монтує (`@testing-library/svelte` у проєкті немає —
 * PROJECT-CONTEXT.md). Тому перевіряється те, що в джерелах видно однозначно:
 * наявність перемикача й того, що обробник його читає.
 *
 * **Чого цей файл НЕ доводить.** Що перемикач справді відрізає клавіші. § 6
 * HOTKEYS називає це прямо: «є перемикач» і «перемикач справді вимикає» —
 * різні твердження, і друге перевіряється лише прогоном. Тому воно записане в
 * PROJECT-CONTEXT.md у перелік того, що не перевіряється автоматично, і має
 * пункт у чеклисті бета-тестування.
 */

const ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
	const full = join(ROOT, dir);
	if (!existsSync(full)) return out;
	for (const entry of readdirSync(full)) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else if (/\.(ts|svelte)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) out.push(rel);
	}
	return out;
}

const sources = walk('src');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

/**
 * Джерело без коментарів.
 *
 * Не педантизм: цей файл ловить твердження ГРЕПОМ, а докблоки тут довгі й
 * цитують те саме, що перевіряється. Перший прогін зворотного експерименту це
 * й показав — прибраний рядок `if (event.code !== 'Escape' && ...)` лишав
 * перевірку «обробник читає перемикач» ЗЕЛЕНОЮ, бо `ui.hotkeysEnabled`
 * згадувався в коментарі над обробником. Зелений з коментаря — гірший різновид
 * хибного доказу: він переживає видалення самої поведінки
 * (AI-AGENT-PITFALLS-v8 § 1).
 */
function code(file: string): string {
	return read(file)
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');
}

/** Обробник клавіш сайту. Названий файлом, бо саме він і є предметом § 3. */
const HOTKEY_SOURCE = 'src/lib/components/ui/ServiceLayer.svelte';

describe('перевірка жива', () => {
	it('джерела знайдено, і обробник серед них', () => {
		expect(sources.length).toBeGreaterThan(20);
		expect(sources).toContain(HOTKEY_SOURCE);
	});
});

describe('WCAG SC 2.1.4: одиночну літеру можна вимкнути', () => {
	/*
	 * Рівень A — мінімальний. Кому це потрібно: тим, хто вводить текст голосом.
	 * Диктування розсипається на одиночні літери, і кожна виконує команду.
	 */
	it('стан перемикача існує й зберігається', () => {
		const state = code('src/lib/states/ui.svelte.ts');
		expect(state, 'немає поля hotkeysEnabled — вимкнути скорочення нічим').toMatch(
			/hotkeysEnabled\s*=\s*\$state\(/
		);
		expect(state, 'перемикач не зберігається — після перезавантаження він повертається').toMatch(
			/storage\.set\(\s*'hotkeysEnabled'/
		);
	});

	it('обробник клавіш його читає', () => {
		const handler = code(HOTKEY_SOURCE);
		expect(handler, 'обробник не питає про перемикач — той нічого не вимикає').toMatch(
			/ui\.hotkeysEnabled/
		);
	});

	it('перемикач досяжний з інтерфейсу, а не лише зі сховища', () => {
		const withToggle = sources.filter(
			(f) => /\.svelte$/.test(f) && /toggleHotkeys\(\)/.test(code(f))
		);
		expect(
			withToggle,
			'кнопки немає в жодному компоненті — перемикач існує лише для того, хто відкриє DevTools'
		).not.toEqual([]);
	});

	it('Escape під перемикач не потрапляє: він не клавіша-символ', () => {
		const handler = code(HOTKEY_SOURCE);
		// Без цієї умови вимкнені скорочення забирають єдиний клавіатурний вихід
		// із мобільного меню (ACCESSIBILITY-v8 § 6).
		expect(handler).toMatch(/code\s*!==\s*'Escape'\s*&&\s*!ui\.hotkeysEnabled/);
	});
});
