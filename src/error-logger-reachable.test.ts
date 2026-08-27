// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Сервіс логування помилок має бути ДОСЯЖНИМ із застосунку.
 *
 * Цей тест народився з конкретного випадку. `errorLogger` існував: кеш на 50
 * записів, дев'ять зелених тестів, акуратний API. І жодного імпорту — тобто
 * логування помилок було написане й не працювало. Зелені тести при цьому
 * читалися як доказ протилежного (AI-AGENT-PITFALLS-v8 § 1 і § 3).
 *
 * Тому перевіряється не поведінка сервісу — її вже перевіряє
 * `errorLogger.test.ts` — а те, що його хтось кличе. Юніт-тести самі себе
 * таким доказом бути не можуть, тож вони з підрахунку виключені.
 */

const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist']);

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

describe('логування помилок досяжне', () => {
	const sources = walk('src').filter(
		(f) => /\.(svelte|ts)$/.test(f) && !f.endsWith('.test.ts') && !f.includes('errorLogger')
	);

	it('перевірка жива — джерела прочитані', () => {
		expect(sources.length).toBeGreaterThan(20);
	});

	it('errorLogger імпортує принаймні один файл застосунку', () => {
		const importers = sources.filter((f) => /errorLogger/.test(readFileSync(f, 'utf8')));
		expect(
			importers,
			'errorLogger не імпортує жоден файл застосунку — сервіс написаний, але ' +
				'ніколи не викликається. Точка входу для неперехоплених помилок — ' +
				'`handleError` у src/hooks.client.ts.'
		).not.toEqual([]);
	});

	it('гачок неперехоплених помилок клієнта існує і кличе логер', () => {
		const hook = readFileSync('src/hooks.client.ts', 'utf8');
		expect(hook, 'у hooks.client.ts немає handleError').toContain('handleError');
		expect(hook, 'handleError не звертається до errorLogger').toContain('errorLogger.logError');
	});

	it('сторінка помилки показує КОД, а не текст від рантайму', () => {
		const errorPage = readFileSync('src/routes/+error.svelte', 'utf8')
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/\/\*[\s\S]*?\*\//g, '');

		/*
		 * `page.error.message` — це або рядок від рантайму («Cannot read properties
		 * of undefined»), тобто нутрощі застосунку на екрані відвідувача, або рядок
		 * із `hooks.client.ts`, який не перекладається (ERROR-HANDLING-v8 § 4.1,
		 * § 4.3). Перекладений текст на цій сторінці вже є — окремим рядком зі
		 * словника.
		 */
		expect(
			/page\.error\??\.message/.test(errorPage),
			'сторінка показує текст помилки від рантайму замість власного, перекладеного'
		).toBe(false);

		// Заради цього коду весь ланцюжок і будувався: за ним запис знаходиться
		// в кеші логера. Доти він не показувався ніде.
		expect(errorPage, 'код помилки не показується — назвати його в листі нічим').toMatch(
			/page\.error\??\.errorId/
		);
	});

	it('сітка безпеки над помилками поза SvelteKit теж підключена', () => {
		/*
		 * `handleError` ловить лише те, що веде сам SvelteKit: рендер, навігацію,
		 * `load`. Виняток із обробника кнопки, з таймера й будь-яке неперехоплене
		 * відхилення промісу летять повз нього — а поруч стоїть табло, яке малює
		 * довжину кеша. Нуль на ньому читається як «помилок немає»
		 * (ERROR-HANDLING-v8 § 5).
		 */
		const callers = sources.filter((f) =>
			/installGlobalHandlers\(\)/.test(readFileSync(f, 'utf8'))
		);
		expect(
			callers,
			'installGlobalHandlers не кличе ніхто — unhandledrejection і window.error ' +
				'не потрапляють ні в кеш, ні в лічильник на таблі'
		).not.toEqual([]);
	});
});

/**
 * `<svelte:boundary>` без сніпета `failed` (ERROR-HANDLING-v8, HIGH).
 *
 * Межа знищує власне тіло й рендерить на його місце `failed`. Немає `failed` —
 * на екрані ПОРОЖНЬО: не повідомлення про помилку, не старий вміст, а нічого.
 * Симптом при цьому не схожий на виняток; він схожий на «сторінка не
 * завантажилася», і шукати починають у мережі.
 *
 * Проєкт це вже проходив: дві реалізації `ErrorBoundary`, і та, що стояла в
 * layout, показувала на помилці порожню сторінку (`PROJECT-CONTEXT.md`,
 * 2026-08-16). Виправили — а перевірки, яка не дасть повторити, не завели, і
 * правило три місяці жило рядком в `AGENTS.md` серед тих, що «не ловить жоден
 * гейт».
 *
 * Зворотний експеримент: перейменувати сніпет `failed` в `ErrorBoundary.svelte`
 * — перевірка червоніє саме на ньому. Прогнано.
 */
describe('межі помилок мають запасний вміст', () => {
	const files = walk('src').filter((f) => f.endsWith('.svelte'));

	const boundaries = files.flatMap((file) => {
		const source = readFileSync(file, 'utf8');
		return [...source.matchAll(/<svelte:boundary[\s\S]*?<\/svelte:boundary>/g)].map((m) => ({
			file,
			body: m[0]
		}));
	});

	it('межі в проєкті знайдено — перевірка жива', () => {
		// Нуль означав би «розбір зламався», а не «меж немає»: межа тут одна, у
		// `ErrorBoundary.svelte`, і вона в layout на кожній сторінці.
		expect(boundaries.length, 'жодного <svelte:boundary> — перевірка сліпа').toBeGreaterThan(0);
	});

	it('кожна межа має сніпет failed', () => {
		const bare = boundaries
			.filter(({ body }) => !/\{#snippet\s+failed\s*\(/.test(body))
			.map(({ file }) => file);
		expect(
			bare,
			`без сніпета \`failed\` межа рендерить ПОРОЖНЄ місце, а не помилку:\n${bare.join('\n')}`
		).toEqual([]);
	});
});
