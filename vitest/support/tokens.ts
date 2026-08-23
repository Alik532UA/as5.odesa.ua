/**
 * Розв'язувач токенів тем: назва змінної + тема → конкретний колір.
 *
 * Перенесено з `teatralo4ka.odesa.ua`, де на ньому стоїть перевірка контрасту.
 * PROJECT-CONTEXT.md тримав це в списку «що не перевіряється автоматично» з
 * планом «перенести `contrast.test.ts` із teatralo4ka» — ось він.
 *
 * Живе в `vitest/support/`, а не в `src/lib`: у бандл не входить, `$lib` не
 * засмічує й не виглядає як осиротілий модуль застосунку для
 * `structure.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES_DIR = 'src/lib/styles';

/** Тут дві теми, а не чотири, як у сусідньому проєкті. */
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Селектор, який задає токени теми, і файл, де він живе.
 *
 * ОБИДВІ ТЕМИ ТЕПЕР ЧИТАЮТЬСЯ З ОДНОГО БЛОКУ. З 2026-08-23 палітра описана
 * `light-dark(світле, темне)` у `:root` файлу `themes/light.css`, а
 * `themes/dark.css` лишився без оголошень — лише з поясненням. Тому темна тема
 * береться звідти ж, а різницю робить вибір аргументу в `pickLightDark()`.
 *
 * Список, а не один файл: якщо колись з'явиться токен, який має сенс лише в
 * одній темі, його оголошення повернеться у власний файл, і пізніший джерело
 * перекриє раніше — саме так, як це робить каскад.
 */
const THEME_SOURCES: Record<Theme, { file: string; selector: RegExp }[]> = {
	light: [{ file: 'themes/light.css', selector: /:root\s*\{/ }],
	dark: [
		{ file: 'themes/light.css', selector: /:root\s*\{/ },
		{ file: 'themes/dark.css', selector: /\.dark-theme\s*\{/ }
	]
};

/**
 * `light-dark(A, B)` → `A` для світлої теми, `B` для темної.
 *
 * Кома тут НЕ розділювач: аргументи бувають виду `rgba(255, 255, 255, 0.7)`,
 * тобто самі містять коми. Тому ділиться підрахунком дужок, а не `split(',')` —
 * інакше перший аргумент обривався б на `rgba(255` і не розбирався як колір, а
 * перевірка МОВЧКИ рахувала б таку пару непокритою (тобто «немає проблем»).
 *
 * Значення без `light-dark()` вертається як є: у палітрі 12 токенів однакові в
 * обох темах і оголошені літералом.
 */
function pickLightDark(value: string, theme: Theme): string {
	const v = value.trim();
	const open = v.toLowerCase().indexOf('light-dark(');
	if (open !== 0) return v;

	let depth = 0;
	const args: string[] = [];
	let current = '';
	for (let i = 'light-dark('.length - 1; i < v.length; i += 1) {
		const ch = v[i];
		if (ch === '(') {
			depth += 1;
			if (depth === 1) continue;
		} else if (ch === ')') {
			depth -= 1;
			if (depth === 0) {
				args.push(current);
				break;
			}
		} else if (ch === ',' && depth === 1) {
			args.push(current);
			current = '';
			continue;
		}
		current += ch;
	}
	if (args.length !== 2) return v;
	return (theme === 'light' ? args[0] : args[1]).trim();
}

/**
 * Читає файл стилів БЕЗ коментарів.
 *
 * Прибирати їх обов'язково, і не з косметичних причин: коментарі в темах
 * описують токени, тобто містять рядки виду `--text-on-accent:`. Без цього
 * рядка регулярка оголошень бачить такий коментар як справжнє оголошення,
 * тягне значення до наступної `;` у файлі — і токен стає нерозв'язним. Далі
 * перевірка контрасту МОВЧКИ рахує таку пару «непокритою» замість того, щоб
 * її перевірити.
 */
function read(rel: string): string {
	return readFileSync(join(STYLES_DIR, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Оголошення `--name: value;` з першого блоку після заданого селектора. */
function declarationsIn(css: string, selector: RegExp): Map<string, string> {
	const m = selector.exec(css);
	const out = new Map<string, string>();
	if (!m) return out;
	// Блок закінчується першою `}` на початку рядка — теми пласкі, вкладень немає.
	const body = css.slice(m.index + m[0].length).split(/^\}/m)[0];
	for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
		out.set(d[1], d[2].trim());
	}
	return out;
}

/** Базові токени з `global.css` — усі блоки `:root`. */
function globalDeclarations(): Map<string, string> {
	const css = read('global.css');
	const out = new Map<string, string>();
	for (const block of css.matchAll(/:root\s*\{([\s\S]*?)^\}/gm)) {
		for (const d of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
			out.set(d[1], d[2].trim());
		}
	}
	return out;
}

export type Rgb = [number, number, number];

/**
 * `transparent` тут НЕ колір і не чорний.
 *
 * У сусідньому проєкті перша версія мала його як `[0, 0, 0]`, і перевірка
 * видала близько двадцяти хибних дефектів: `background: transparent` читалося
 * як «чорне тло», і будь-який темний текст на ньому ставав «нечитним».
 * Насправді `transparent` означає «те, що під ним», а це статично невідомо —
 * отже НЕПОКРИТО, а не дефект.
 */
const NAMED: Record<string, Rgb> = {
	white: [255, 255, 255],
	black: [0, 0, 0]
};

/** Розбирає `#abc`, `#aabbcc`, `rgb(...)`, `white`. Інше — `null`. */
export function parseColor(value: string): Rgb | null {
	const v = value.trim().toLowerCase();
	if (v in NAMED) return NAMED[v];
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
	if (hex) {
		const h = hex[1];
		const full =
			h.length === 3
				? h
						.split('')
						.map((c) => c + c)
						.join('')
				: h;
		return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
	}
	const rgb = /^rgba?\(([^)]+)\)$/.exec(v);
	if (rgb) {
		const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
		// Напівпрозоре не розв'язується без знання того, що під ним.
		if (parts.length >= 4 && parts[3] < 0.999) return null;
		if (parts.slice(0, 3).some(Number.isNaN)) return null;
		return parts.slice(0, 3) as Rgb;
	}
	return null;
}

export class TokenResolver {
	private readonly base = globalDeclarations();
	private readonly perTheme = new Map<Theme, Map<string, string>>();

	constructor() {
		for (const theme of THEMES) {
			const merged = new Map<string, string>();
			for (const { file, selector } of THEME_SOURCES[theme]) {
				for (const [name, value] of declarationsIn(read(file), selector)) merged.set(name, value);
			}
			this.perTheme.set(theme, merged);
		}
	}

	/** Сире значення токена в темі: спершу тема, потім `global.css`. */
	raw(name: string, theme: Theme): string | undefined {
		return this.perTheme.get(theme)!.get(name) ?? this.base.get(name);
	}

	/**
	 * Розв'язує токен до конкретного кольору в межах теми.
	 *
	 * `null` означає «не колір або не розв'язується»: `color-mix`,
	 * напівпрозоре, градієнт, невідомий токен. Такі випадки не вважаються
	 * дефектом — вони вважаються НЕПОКРИТИМИ, і перевірка їх рахує окремо.
	 */
	resolve(name: string, theme: Theme, depth = 0): Rgb | null {
		if (depth > 10) return null;
		const value = this.raw(name, theme);
		if (value === undefined) return null;
		return this.resolveValue(value, theme, depth);
	}

	/** Те саме для довільного значення властивості, а не лише для токена. */
	resolveValue(value: string, theme: Theme, depth = 0): Rgb | null {
		if (depth > 10) return null;
		// `light-dark()` знімається ПЕРЕД усім іншим: усередині нього може стояти і
		// літерал, і `var()`, і те, чого розв'язувач не знає.
		const v = pickLightDark(value, theme);
		const direct = parseColor(v);
		if (direct) return direct;
		// Рівно один var() і нічого крім нього: `var(--a)` або `var(--a, fallback)`.
		const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v);
		if (!m) return null;
		const resolved = this.resolve(m[1], theme, depth + 1);
		if (resolved) return resolved;
		return m[2] ? this.resolveValue(m[2], theme, depth + 1) : null;
	}
}

/** Відносна яскравість за WCAG 2.x. */
export function luminance([r, g, b]: Rgb): number {
	const f = (v: number) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Коефіцієнт контрасту за WCAG 2.x, від 1 до 21. */
export function contrast(a: Rgb, b: Rgb): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}
