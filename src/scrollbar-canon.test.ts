import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Інваріанти власної смуги прокрутки (SCROLLBAR).
 *
 * Перевіряється НЕ вигляд: режими, геометрія й жест перетягування живуть лише в
 * браузері, і юніт-тестами не покриваються — чесніше сказати це прямо, ніж
 * зеленіти на перевірках, які нічого не бачать.
 *
 * Тут ловиться інше — те, що ламається мовчки: розходження значень, які
 * ДУБЛЮЮТЬСЯ між скриптом першого кадру й контролерами. Скрипт в `app.html` не
 * може імпортувати модулі, тож копія неминуча; неминучим не мусить бути те, що
 * вона розійдеться непоміченою.
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const APP_HTML = read('src/app.html');
const UI = read('src/lib/states/ui.svelte.ts');
const SCROLLBAR = read('src/lib/states/scrollbar.svelte.ts');

/**
 * Файли застосунку. Самі перевірки пропускаються: у них шаблони, які вони
 * шукають, лежать відкритим текстом — і файл ловив би сам себе.
 */
function sourceFiles(dir = 'src', out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) sourceFiles(path, out);
		else if (/\.(svelte|ts)$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name))
			out.push(path);
	}
	return out;
}

describe('SCROLLBAR § 8.2 — перший кадр дублює контролер', () => {
	it('перевірка жива: скрипт першого кадру на місці й чіпає смугу', () => {
		expect(APP_HTML, 'інлайн-скрипта немає — перевіряти нема чого').toMatch(
			/has-custom-scrollbar/
		);
	});

	it('типовий режим збігається у двох місцях', () => {
		const html = APP_HTML.match(/scrollbarMode'\)\s*\|\|\s*'([^']+)'/)?.[1];
		const ui = UI.match(/scrollbarMode\s*=\s*\$state<ScrollbarMode>\('([^']+)'\)/)?.[1];

		expect(html, 'типове значення в app.html не прочитано').toBeTruthy();
		expect(
			ui,
			'розходження видно як зміну вигляду смуги під час гідрації — тобто рівно ' +
				'те мигання, заради якого той скрипт і існує'
		).toBe(html);
	});

	it('умова «є миша» збігається у двох місцях', () => {
		const query = '(hover: hover) and (pointer: fine)';
		expect(APP_HTML, `в app.html немає ${query}`).toContain(query);
		expect(SCROLLBAR, `в контролері немає ${query}`).toContain(query);
	});
});

describe('SCROLLBAR § 2.3 — клас ховання має одного власника', () => {
	it('has-custom-scrollbar ставиться рівно у двох місцях', () => {
		/*
		 * Два, а не одне: ефект у корені плюс скрипт першого кадру. Третє місце
		 * означало б гонку — новий малювальник клас додає, прибиральник старого
		 * спрацьовує після нього й одразу знімає, і на екрані дві смуги.
		 *
		 * Рахуються ЗМІНИ класу (`classList`), а не згадки назви: правило в CSS і
		 * коментар про нього не є власниками.
		 */
		const owners = sourceFiles().filter((f) =>
			/classList\.(add|remove|toggle)\(\s*'has-custom-scrollbar'/.test(read(f))
		);
		expect(owners, `власники класу:\n${owners.join('\n')}`).toHaveLength(1);
		expect(APP_HTML).toMatch(/classList\.add\('has-custom-scrollbar'\)/);
	});
});

describe("SCROLLBAR § 9.2 — behavior: 'auto' заборонено", () => {
	it('жоден scrollTo не передає auto', () => {
		/*
		 * `'auto'` означає «взяти значення з CSS», а там зазвичай
		 * `scroll-behavior: smooth` — і кожен рух миші під час перетягування
		 * запускав би власну анімацію, які наздоганяли б одна одну.
		 */
		const offenders = sourceFiles().filter((f) => /behavior:\s*['"]auto['"]/.test(read(f)));
		expect(offenders, `знайдено 'auto':\n${offenders.join('\n')}`).toEqual([]);
	});
});
