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
});
