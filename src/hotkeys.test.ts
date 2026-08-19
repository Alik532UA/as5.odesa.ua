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

/**
 * Файли, чий слухач на вікні НЕ мусить мати захисту полів вводу.
 *
 * Кожен named і з причиною — і сам виняток перевіряється: файл зі списку
 * зобовʼязаний не мати жодного літерного скорочення. Інакше цей список став би
 * тим, чим такі списки стають, — місцем, куди дописують те, що не проходить.
 */
const NO_TEXT_GUARD_NEEDED: Record<string, string> = {
	// Ловить рівно `Escape`, а він не клавіша-символ: у полі вводу він або
	// нічого не робить, або скасовує ввід — жодного тексту він не з’їдає.
	'src/lib/components/MobileMenu.svelte': 'обробляє лише Escape'
};

/** Слухачі саме на ВІКНІ чи документі: вони працюють, куди б не дивився фокус. */
function windowKeydownSources(): string[] {
	return sources.filter((f) => {
		const text = code(f);
		return (
			/<svelte:window[^>]*onkeydown=/.test(text) ||
			/(?:window|document)\.addEventListener\(\s*['"]keydown/.test(text)
		);
	});
}

describe('захист набору тексту (§ 2.2, HK-TEXT-ENTRY-GUARD)', () => {
	const listeners = windowKeydownSources();

	it('перевірка жива: слухачі на вікні знайдено', () => {
		// Без цього рядка порожній перелік дав би зелене «порушень немає».
		expect(listeners.length, 'жодного слухача — сканер шукає не там').toBeGreaterThan(2);
	});

	it('кожен слухач на вікні виходить, коли людина друкує', () => {
		/*
		 * Рядки імпорту відрізаються, інакше перевірка зеленіє від самої НАЗВИ
		 * функції у списку імпорту — тобто переживає видалення виклику. Знайдено
		 * зворотним експериментом: прибраний захист із піаніно лишав її зеленою.
		 */
		const body = (f: string) => code(f).replace(/^\s*import\s[^;]*;/gm, '');
		const unguarded = listeners.filter(
			(f) => !NO_TEXT_GUARD_NEEDED[f] && !/isTypingTarget|acceptsShortcut/.test(body(f))
		);
		expect(
			unguarded,
			`набір тексту виконуватиме команди:\n${unguarded.join('\n')}`
		).toEqual([]);
	});

	it('виняток лишається винятком: у ньому немає жодної літерної клавіші', () => {
		const bad: string[] = [];
		for (const [file, reason] of Object.entries(NO_TEXT_GUARD_NEEDED)) {
			if (!listeners.includes(file)) {
				bad.push(`${file}: слухача більше немає — запис «${reason}» застарів`);
				continue;
			}
			const text = code(file);
			// `KeyT` або `.key === 'x'` у файлі без захисту означає, що літера
			// виконує команду просто під час набору тексту.
			const letters = [
				...text.matchAll(/'Key([A-Z])'|\.key\s*===\s*['"]([a-zA-Z])['"]/g)
			].map((m) => m[0]);
			if (letters.length > 0) bad.push(`${file}: літерні клавіші ${letters.join(', ')}`);
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});
});

describe('решта захистів обробника (§ 2)', () => {
	it('комбінації з модифікаторами лишаються браузеру', () => {
		// Без цього `Ctrl+T` відкриває вкладку І виконує дію застосунку:
		// `event.code` однаковий для одиночної клавіші й для комбінації з нею.
		expect(code('src/lib/services/keyboard.ts')).toMatch(/ctrlKey.*\n?.*metaKey|metaKey.*\n?.*ctrlKey/s);
		expect(code(HOTKEY_SOURCE)).toMatch(/acceptsShortcut\(/);
	});

	it('літерні скорочення читаються з code, а не з key', () => {
		const bad: string[] = [];
		for (const file of sources) {
			for (const m of code(file).matchAll(/\.key\s*===\s*['"]([a-zA-Z])['"]/g)) {
				bad.push(`${file}: .key === '${m[1]}'`);
			}
		}
		// На українській розкладці `KeyT` віддає `key === 'е'` — скорочення
		// просто зникає для того, хто не перемкнув розкладку.
		expect(bad, `скорочення за символом, а не за клавішею:\n${bad.join('\n')}`).toEqual([]);
	});
});

describe('канонічна карта (§ 1.1, § 4)', () => {
	const handler = code(HOTKEY_SOURCE);

	const CANON: Record<string, RegExp> = {
		KeyT: /theme/i,
		KeyL: /lang|locale/i,
		KeyM: /sound|audio|mute/i,
		KeyB: /background/i
	};

	it('літера означає те саме, що в каноні', () => {
		const bad: string[] = [];
		for (const [codeName, expected] of Object.entries(CANON)) {
			const at = handler.indexOf(codeName);
			if (at === -1) continue; // клавіша не зайнята — це нормально
			const branch = handler.slice(at, at + 200);
			if (!expected.test(branch)) bad.push(`${codeName} робить не те, що в § 1.1`);
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});

	it('V і R зайняті лише службовими жестами', () => {
		const bad: string[] = [];
		for (const reserved of ['KeyV', 'KeyR']) {
			const at = handler.indexOf(reserved);
			if (at === -1) continue;
			const branch = handler.slice(at, at + 200);
			if (!/debug|version|reset|[Ss]equence/.test(branch)) {
				bad.push(`${reserved} робить щось, крім службового жесту (§ 4)`);
			}
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});
});

describe('виявність (§ 5, HK-DISCOVERABILITY)', () => {
	/**
	 * Кожне оголошення окремо, а не «чи є таке у файлі».
	 *
	 * Зворотний експеримент показав різницю: перший варіант перевіряв файл
	 * цілком, і зроблене безумовним оголошення `T` лишалося непоміченим, бо
	 * сусіднє `L` у тому самому файлі умову ще мало.
	 */
	const declarations = sources
		.filter((f) => /\.svelte$/.test(f))
		.flatMap((f) =>
			[...code(f).matchAll(/aria-keyshortcuts=(\{[^}]*\}|"[^"]*"|'[^']*')/g)].map((m) => ({
				file: f,
				raw: m[1],
				key: (m[1].match(/["']([A-Za-z+ ]+)["']/) ?? [])[1] ?? ''
			}))
		);

	it('скорочення оголошене хоч десь: інакше воно існує лише для автора', () => {
		expect(
			declarations.length,
			'жодного aria-keyshortcuts — про клавіші не дізнається ні читалка, ні відвідувач'
		).toBeGreaterThan(1);
	});

	it('оголошена клавіша справді є в карті обробника', () => {
		const handler = code(HOTKEY_SOURCE);
		const bad = declarations
			.filter(({ key }) => !key || !handler.includes(`Key${key.toUpperCase()}`))
			.map(({ file, key }) => `${file}: обіцяє «${key}», а обробник її не знає`);
		expect(bad, bad.join('\n')).toEqual([]);
	});

	it('оголошення зникає разом із вимкненими скороченнями', () => {
		// Обіцянка клавіші, яку сам користувач вимкнув, — не підказка, а брехня.
		const bad = declarations
			.filter(({ raw }) => !/ui\.hotkeysEnabled\s*\?/.test(raw))
			.map(({ file, key }) => `${file}: «${key}» оголошено безумовно`);
		expect(bad, bad.join('\n')).toEqual([]);
	});
});
