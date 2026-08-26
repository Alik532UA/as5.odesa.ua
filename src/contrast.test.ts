// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES, TokenResolver, contrast, type Rgb, type Theme } from '../vitest/support/tokens';

/**
 * Контраст тексту й тла в кожній темі — і в спокої, і НА НАВЕДЕННІ.
 *
 * Перенесено з `teatralo4ka.odesa.ua` разом із розвʼязувачем токенів
 * (`vitest/support/tokens.ts`). PROJECT-CONTEXT.md тримав це в списку «що не
 * перевіряється автоматично» з планом «перенести contrast.test.ts» — ось він.
 *
 * ## Що знайшлося при першому ж прогоні
 *
 * Тринадцять пар нижче WCAG AA, і всі — не випадкові, а два кольори бренду:
 * білий текст на золотому #f5a623 (2.03:1) і білий на світло-блакитному
 * #3aacce у темній темі (2.63:1). Серед них головна кнопка сайту
 * `.btn-primary` — та сама, якою запрошують на вступ.
 *
 * Виправити це означає перефарбувати айдентику, а таке рішення за автором, не
 * за перевіркою. Тому кожна пара записана нижче ЧИСЛОМ: список винятків не
 * ховає борг, а робить його видимим і таким, що може лише скорочуватися — та
 * сама логіка, що `warn` із числом замість `off` у ESLint (CODE-QUALITY-v8
 * § 6.4.1). Погіршення будь-якої пари робить перевірку червоною: `ratio` у
 * винятку — стеля, а не дозвіл.
 *
 * ## Чому по джерелах, а не в браузері
 *
 * У сусідньому проєкті спроба зробити це через Playwright дала два набори
 * хибних дефектів, обидва переконливі: напівпрозорі шари склеювалися в
 * неправильному порядку, а підвал у момент заміру мав `opacity: 0`. Тут немає
 * ні прозорості, ні порядку шарів, ні станів рантайму — беруться пари
 * «тло+текст», де обидва значення є токенами тем, і граф `var()`
 * розвʼязується арифметично.
 *
 * ## Що ЦЯ перевірка не покриває
 *
 * Свідомо і з числом у звіті (`Непокрито` нижче): напівпрозоре тло,
 * `color-mix`, градієнти, тло-зображення, а також текст, що успадковує колір
 * від батька або лежить на тлі з іншого компонента. Для них потрібен рантайм.
 */

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;

/**
 * Свідомі відхилення. Кожне — з виміряним числом і причиною, а не «щоб
 * зелений»: список без чисел за пів року перетворюється на виняток, який
 * ніхто не читає.
 */
const EXCEPTIONS: { selector: string; theme: Theme | '*'; ratio: number; why: string }[] = [
	// --- Білий текст на золотому #f5a623 (2.03:1) --------------------------
	// Золотий — акцент бренду. Варіант «темний текст замість білого» дав би
	// 5.93:1 і зберіг сам колір, але змінює вигляд КОЖНОЇ кнопки сайту, тож це
	// рішення автора. Записано боргом у PROJECT-CONTEXT.md.
	{
		selector: '.btn-primary',
		theme: 'light',
		ratio: 2.03,
		why: 'Головна кнопка сайту: білий на золотому #f5a623. Виправлення — темний текст (5.93:1), тобто зміна вигляду всіх CTA. Рішення за автором'
	},
	{
		selector: '.btn-primary:hover',
		theme: 'light',
		ratio: 2.48,
		why: 'Те саме на наведенні, тло #e09510'
	},
	{
		selector: '.btn-outline:hover',
		theme: 'light',
		ratio: 2.03,
		why: 'Обведена кнопка на наведенні заливається тим самим золотим'
	},
	{
		selector: '.footer__social-link:hover',
		theme: 'light',
		ratio: 2.03,
		why: 'Іконка соцмережі на наведенні. Іконка векторна й тексту поруч не показує, але правило задає `color`, і перевірка міряє саме його'
	},
	{
		selector: '.header__settings-opt.active',
		theme: 'light',
		ratio: 2.03,
		why: 'Обраний варіант у випадайці налаштувань: золотий текст на білому. Стан дублюється тлом і `aria-pressed`, тобто не лише кольором'
	},
	{
		selector: '.debug-dropdown__opt.active',
		theme: 'light',
		ratio: 2.03,
		why: 'Те саме у діагностичній випадайці'
	},

	// --- Білий на світло-блакитному #3aacce у темній темі (2.63:1) ---------
	{
		selector: '.footer__btn-order:hover',
		theme: 'dark',
		ratio: 2.63,
		why: 'У темній темі `--color-deep-ocean` дорівнює #3aacce, і білий на ньому дає 2.63:1. Виправлення — окремий токен для тла кнопки в темній темі. Рішення за автором'
	},

	// --- Межа помилок ------------------------------------------------------
	{
		selector: '.error-boundary__btn',
		theme: 'light',
		ratio: 3.42,
		why: 'Білий на `--color-sea-blue` #2196ba. Найближче до виправлення з усього списку: `--color-deep-ocean` дав би 7.16:1 і лишився б у палітрі. Не змінено разом з рештою, щоб зміна кольору не проїхала одним комітом із появою самої перевірки'
	},

	// --- Чернетка /test ----------------------------------------------------
	// Сторінка `noindex`, у sitemap її немає, з сайту на неї не посилається
	// ніхто. Глушити цілий файл не можна, тому кожен селектор названо окремо.
	{ selector: '.tag', theme: 'dark', ratio: 2.63, why: 'Чернетка /test' },
	{ selector: '.btn-more', theme: 'dark', ratio: 2.63, why: 'Чернетка /test' },
	{ selector: '.nav-btn', theme: 'dark', ratio: 2.63, why: 'Чернетка /test' },
	{ selector: '.nav-btn:hover', theme: 'dark', ratio: 2.63, why: 'Чернетка /test' },
	{ selector: '.g-card__tag', theme: 'dark', ratio: 2.63, why: 'Чернетка /test' }
];

type Decl = { color?: string; background?: string; fontSize?: string; fontWeight?: string };

/**
 * Дві константи, а не одна: регулярка з прапорцем `g` зберігає `lastIndex`
 * між викликами `.test()`, тож одна й та сама на перевірку і на заміну давала
 * то true, то false на однакових селекторах — і базовий стан збирався з
 * правил `:hover`. Дефект був такий: `.header__cta:hover` показувало 1.00:1,
 * тобто текст того самого кольору, що тло, чого в коді немає.
 */
const IS_STATE = /:hover|:focus-visible|:focus|:active/;
const STRIP_STATE = /:hover|:focus-visible|:focus|:active/g;

function walk(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith('.svelte')) out.push(p);
	}
	return out;
}

/** Вирізає `<style>` компонента. Розмітка нас не цікавить. */
function styleBlock(source: string): string {
	return source.match(/<style[^>]*>([\s\S]*)<\/style>/)?.[1] ?? '';
}

const value = (raw: string) => raw.replace(/!important/g, '').trim();

/**
 * Плоскі правила `селектор { … }` з CSS-тексту.
 *
 * Медіазапити й `:global()` не розгортаються: усередині них ті самі пари
 * «тло+текст», а нам потрібні саме пари, не каскад.
 */
function rules(css: string): { selector: string; decl: Decl }[] {
	const out: { selector: string; decl: Decl }[] = [];
	// Коментарі геть ДО розбору: інакше вони приклеюються до селектора
	// («/* Order Button Style */ .footer__btn-order») і, гірше, `prop: value`
	// всередині коментаря читається як справжнє оголошення.
	const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
	for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1].trim().replace(/\s+/g, ' ');
		if (!selector || selector.startsWith('@') || selector.startsWith('%')) continue;
		const body = m[2];
		const decl: Decl = {};
		for (const d of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) {
			const prop = d[1];
			if (prop === 'color') decl.color = value(d[2]);
			else if (prop === 'background' || prop === 'background-color') decl.background = value(d[2]);
			else if (prop === 'font-size') decl.fontSize = value(d[2]);
			else if (prop === 'font-weight') decl.fontWeight = value(d[2]);
		}
		if (decl.color || decl.background) out.push({ selector, decl });
	}
	return out;
}

/** Великий текст за WCAG: ≥24px, або ≥18.66px і жирний. */
function isLarge(decl: Decl): boolean {
	const size = decl.fontSize;
	if (!size) return false;
	const rem = /^([\d.]+)rem$/.exec(size);
	const px = /^([\d.]+)px$/.exec(size);
	const value = rem ? parseFloat(rem[1]) * 16 : px ? parseFloat(px[1]) : NaN;
	if (Number.isNaN(value)) return false;
	const bold = (parseInt(decl.fontWeight ?? '400', 10) || 400) >= 700;
	return value >= 24 || (value >= 18.66 && bold);
}

type Finding = {
	file: string;
	selector: string;
	state: string;
	theme: Theme;
	ratio: number;
	need: number;
	fg: Rgb;
	bg: Rgb;
};

describe('контраст тексту й тла', () => {
	const resolver = new TokenResolver();
	const files = [...walk('src'), 'src/lib/styles/global.css'];

	let pairsChecked = 0;
	let uncovered = 0;
	/** Усі пари нижче AA, разом із записаними у винятки. */
	const belowAA: Finding[] = [];

	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		const css = file.endsWith('.css') ? source : styleBlock(source);
		if (!css) continue;

		const parsed = rules(css);
		// Базовий стан селектора: те саме без :hover/:focus/:active.
		const base = new Map<string, Decl>();
		for (const { selector, decl } of parsed) {
			if (IS_STATE.test(selector)) continue;
			const prev = base.get(selector) ?? {};
			base.set(selector, { ...prev, ...decl });
		}

		for (const { selector, decl } of parsed) {
			const isState = IS_STATE.test(selector);
			const root = selector.replace(STRIP_STATE, '').trim();
			const inherited = base.get(root) ?? {};
			const effective: Decl = { ...inherited, ...decl };

			// Пара має сенс лише якщо ВІДОМІ обидва боки. Текст без тла — це
			// успадкування, і статично воно не розв'язується.
			if (!effective.color || !effective.background) {
				uncovered++;
				continue;
			}

			const need = isLarge(effective) ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
			for (const theme of THEMES) {
				const fg = resolver.resolveValue(effective.color, theme);
				const bg = resolver.resolveValue(effective.background, theme);
				if (!fg || !bg) {
					uncovered++;
					continue;
				}
				pairsChecked++;
				const ratio = contrast(fg, bg);
				if (ratio >= need) continue;

				// У `belowAA` йде ВСЕ, що не проходить, зокрема й записане у
				// винятки: без цього список винятків неможливо перевірити на
				// застарілість — записи, які він же й приховав, виглядали б як
				// «уже виправлені».
				belowAA.push({
					file,
					selector,
					state: isState ? 'наведення/фокус' : 'спокій',
					theme,
					ratio,
					need,
					fg,
					bg
				});
			}
		}
	}

	const isExcepted = (f: Finding) =>
		EXCEPTIONS.some(
			(e) => f.selector.includes(e.selector) && (e.theme === '*' || e.theme === f.theme)
		);
	/** Те, що не проходить і не записане винятком. Саме воно валить перевірку. */
	const findings = belowAA.filter((f) => !isExcepted(f));

	it('знаходить пари для перевірки — вона жива', () => {
		// Пороги заміряні ТУТ, а не перенесені з сусіднього проєкту: там файлів
		// і пар більше, і чужий поріг зробив би перевірку червоною від
		// народження. Тут 32 файли та 50 розвʼязаних пар.
		expect(files.length).toBeGreaterThan(25);
		expect(pairsChecked).toBeGreaterThan(40);
	});

	it('граф токенів розвʼязується в усіх темах', () => {
		// Канарка на сам розвʼязувач: якщо шляхи до тем зміняться, він почне
		// повертати null на всьому, і перевірка вище стане зеленою на нулі.
		for (const theme of THEMES) {
			expect(resolver.resolve('--color-white', theme), theme).not.toBeNull();
			expect(resolver.resolve('--color-body-text', theme), theme).not.toBeNull();
			expect(resolver.resolve('--color-deep-ocean', theme), theme).not.toBeNull();
		}
	});

	it('кожен виняток ще потрібен і жоден не погіршився', () => {
		// Виняток — це стеля з числом, а не дозвіл назавжди. Дві помилки, яких
		// він не має пропустити: запис, що вже не потрібен (колір виправили, а
		// рядок лишився), і пара, що стала ГІРШОЮ за записане число.
		const stale = EXCEPTIONS.filter(
			(e) =>
				!belowAA.some(
					(f) => f.selector.includes(e.selector) && (e.theme === '*' || e.theme === f.theme)
				)
		).map((e) => `${e.theme} ${e.selector} — уже проходить, запис зайвий`);

		const worse = belowAA
			.filter((f) => {
				const e = EXCEPTIONS.find(
					(x) => f.selector.includes(x.selector) && (x.theme === '*' || x.theme === f.theme)
				);
				return e !== undefined && f.ratio < e.ratio - 0.005;
			})
			.map((f) => `${f.theme} ${f.selector} — ${f.ratio.toFixed(2)}:1, гірше за записане`);

		const problems = [...stale, ...worse];
		expect(problems, problems.join('\n')).toEqual([]);
	});

	it('кожна пара «тло+текст» проходить WCAG AA', () => {
		const hex = (c: Rgb) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
		const report = findings
			.sort((a, b) => a.ratio - b.ratio)
			.map(
				(f) =>
					`${f.ratio.toFixed(2)}:1 (треба ${f.need})  ${f.theme}/${f.state}  ${f.file}\n      ${f.selector}  текст ${hex(f.fg)} на ${hex(f.bg)}`
			)
			.join('\n');

		expect(
			findings.map((f) => `${f.theme} ${f.selector}`),
			`\nПар перевірено: ${pairsChecked}. Непокрито (прозоре, color-mix, успадкування): ${uncovered}.\n\n${report}\n`
		).toEqual([]);
	});
});

/**
 * Запобіжник у самому розвʼязувачі (UI-UX-v8 § 1.5.1.3).
 *
 * Доти `pickLightDark()` знімав `light-dark()` із ЛЮБИМ вмістом, і на тіні
 * `parseColor()` вертав `null` — тобто токен тихо пропускався, а розвʼязувач
 * вважав виклик дійсним рівно там, де браузер викидає властивість. Саме так
 * сім мертвих токенів тіней співіснували з 207 зеленими тестами, і гейт
 * контрасту був серед них.
 *
 * Ці два твердження тримають запобіжник живим. Без них він мертвий код: на
 * `--shadow-*` він не вистрелить ніколи, бо в пари контрасту вони не входять.
 */
describe('розвʼязувач токенів не приймає більше за браузер', () => {
	const resolver = new TokenResolver();

	it('кидає на неколірному аргументі в light-dark()', () => {
		expect(() =>
			resolver.resolveValue(
				'light-dark(0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.4))',
				'light'
			)
		).toThrow(/неколірний аргумент/);
		expect(() => resolver.resolveValue('light-dark(4px, 8px)', 'dark')).toThrow(
			/неколірний аргумент/
		);
		// Обидва аргументи, не лише потрібний цій темі: інакше дефект залежав би
		// від того, яку тему перевіряють першою.
		expect(() => resolver.resolveValue('light-dark(#ffffff, 0 1px 3px #000000)', 'light')).toThrow(
			/неколірний аргумент/
		);
	});

	it('і далі розвʼязує законні значення', () => {
		expect(resolver.resolveValue('light-dark(#ffffff, #000000)', 'light')).toEqual([255, 255, 255]);
		expect(resolver.resolveValue('light-dark(#ffffff, #000000)', 'dark')).toEqual([0, 0, 0]);
		expect(resolver.resolveValue('rgb(27, 94, 123)', 'light')).toEqual([27, 94, 123]);
		/*
		 * Напівпрозоре й `color-mix()` розвʼязувач не рахує — вертає `null`, і це
		 * НЕ дефект: такі пари він відкрито називає непокритими. Тому вони не
		 * кидають, і саме цим `null` відрізняється від недійсного значення.
		 */
		expect(resolver.resolveValue('rgba(27, 94, 123, 0.08)', 'light')).toBeNull();
		expect(() =>
			resolver.resolveValue('light-dark(color-mix(in srgb, #fff, #000), #111111)', 'light')
		).not.toThrow();
	});
});
