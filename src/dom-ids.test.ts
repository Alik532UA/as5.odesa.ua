// @vitest-environment node
// Перевірка лише читає файли — DOM їй не потрібен.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ідентифікатор у розмітці — детермінований (ACCESSIBILITY-v8 § 4.2.1).
 *
 * ## Клас дефекту
 *
 * `id` в HTML — це не оформлення, а ПОСИЛАННЯ: на нього вказують `for`,
 * `aria-labelledby`, `aria-describedby`, `aria-controls` і `url(#…)` у SVG.
 * Значення, зібране з випадковості або з модульного лічильника, ламає обидва
 * кінці цього звʼязку, і кожен по-своєму:
 *
 *  - `Math.random()` дає РІЗНЕ значення на сервері й у браузері. Атрибут
 *    приїжджає з prerender з одним значенням, гідратація підставляє інше — і
 *    звʼязок `label` ↔ `input` зникає саме там, де його ніхто не дивиться,
 *    бо на екрані все виглядає правильно;
 *  - модульний лічильник (`let n = 0; … ${n++}`) під час prerender дає
 *    ОДНАКОВІ значення на різних сторінках: модуль спільний для всієї збірки,
 *    і другий екземпляр компонента отримує той самий `id`, що й перший.
 *
 * Правильна відповідь одна — `$props.id()` (Svelte 5.20+): стабільна між
 * сервером і клієнтом, різна для кожного екземпляра.
 *
 * ## Чому перевірка зʼявилася лише тепер
 *
 * Звернень до `$props.id()` у проєкті було нуль, і в `PROJECT-CONTEXT.md` це
 * лежало в таблиці «що не перевіряється автоматично» з планом «окремий
 * прохід». Єдине порушення — `wave-clip-${Math.random()…}` у
 * `WaveBackground.svelte` — наслідку не мало: `<clipPath>` стоїть під
 * `{#if showFish && isFishActive}`, а прапорець на старті `false`, тож у
 * `build/*.html` тієї розмітки немає зовсім. Правило без сьогоднішнього
 * наслідку живе рівно до дня, коли наслідок зʼявиться.
 *
 * ## Чому обхід ТРАНЗИТИВНИЙ, і чому перша редакція була марною
 *
 * Перевірка йде ВІД АТРИБУТА: бере ім'я, вжите в `id` чи в посиланні на `id`,
 * і читає його оголошення в тому ж файлі. Перша редакція робила рівно один
 * крок — і зворотний експеримент показав, що цього замало: варто винести
 * випадковість у сусідній рядок (`const uid = Math.random()…;`
 * `const clipId = \`wave-clip-${uid}\`;`), як гейт лишається зеленим. Тобто
 * найприроднішого рефакторингу вистачало, щоб він перестав ловити.
 *
 * Тому імена в оголошенні розгортаються далі, до `MAX_HOPS` кроків, із
 * захистом від циклу. Межа методу лишається: значення, привезене пропом або
 * зібране з іншого файлу, не простежується — але саме цей клас дефекту
 * породжується локальним оголошенням, і тепер його не сховати переносом на
 * рядок вище.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1), прогнано: повернути
 * `Math.random()` в оголошення `uid` — перевірка червоніє з назвою файлу,
 * ім'ям і причиною; вписати випадковість просто в `clipId` — червоніє теж;
 * замінити на модульний лічильник — червоніє теж.
 */

const SRC = 'src';

/** Джерела, що їдуть у браузер. Перевірки й моки не рахуються. */
function svelteFiles(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry).replace(/\\/g, '/');
		if (statSync(full).isDirectory()) svelteFiles(full, out);
		else if (full.endsWith('.svelte')) out.push(full);
	}
	return out;
}

/**
 * Атрибути, значення яких — ідентифікатор або посилання на нього.
 *
 * `data-testid` сюди не входить: він не адресує нічого в документі, і його
 * детермінованість тримає окрема перевірка (`testid-conventions.test.ts` §
 * 1.6).
 */
const ID_ATTRS = ['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls'];

/** Джерела значення, які роблять `id` недетермінованим. */
const NONDETERMINISTIC: Array<[RegExp, string]> = [
	[/Math\.random\s*\(/, 'Math.random() — сервер і клієнт дають різні значення'],
	[/Date\.now\s*\(/, 'Date.now() — те саме, плюс збіг у межах одного тика'],
	[/crypto\.randomUUID\s*\(/, 'crypto.randomUUID() — сервер і клієнт дають різні значення'],
	[/\+\+|\+=\s*1/, 'лічильник — під час prerender модуль спільний на всю збірку']
];

/**
 * Імена, вжиті в позиції ідентифікатора: `id={x}`, `id="…{x}…"`,
 * `aria-labelledby={x}`.
 */
function idExpressions(source: string): Set<string> {
	const names = new Set<string>();
	for (const attr of ID_ATTRS) {
		const re = new RegExp(`${attr}=(?:\\{([^}]*)\\}|"([^"]*)")`, 'g');
		for (const match of source.matchAll(re)) {
			const raw = match[1] ?? match[2] ?? '';
			for (const name of raw.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) names.add(name[0]);
		}
	}
	return names;
}

/** Оголошення імені в тому ж файлі — рядок після `=` до кінця виразу. */
function declarationOf(source: string, name: string): string | null {
	const escaped = name.replace(/[$]/g, '\\$&');
	const re = new RegExp(`(?:const|let|var)\\s+${escaped}\\s*(?::[^=]+)?=\\s*([^\\n;]*)`);
	return re.exec(source)?.[1] ?? null;
}

/**
 * Скільки кроків углиб розгортати імена в оголошенні.
 *
 * Три — не магічне число, а межа сенсу: `id={clipId}` → `clipId` →
 * `` `wave-clip-${uid}` `` → `uid` вичерпує реальні ланцюжки. Глибше йде вже
 * не «випадковість, винесена в сусідній рядок», а логіка, яку однаково
 * доводиться читати очима.
 */
const MAX_HOPS = 3;

/**
 * Усі вирази, з яких зрештою складається значення імені: власне оголошення
 * плюс оголошення всіх імен, що в ньому згадані.
 */
function valueSources(source: string, name: string): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	let frontier = [name];

	for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop += 1) {
		const next: string[] = [];
		for (const current of frontier) {
			if (seen.has(current)) continue;
			seen.add(current);

			const declaration = declarationOf(source, current);
			if (declaration === null) continue;
			found.push(declaration);
			for (const ident of declaration.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) next.push(ident[0]);
		}
		frontier = next;
	}
	return found;
}

describe('ідентифікатори в розмітці', () => {
	const files = svelteFiles(SRC);

	it('перевірка жива: компоненти знайдено', () => {
		expect(files.length, 'жодного .svelte — сканер шукає не там').toBeGreaterThan(10);
	});

	it('жоден id не збирається з випадковості або лічильника (§ 4.2.1)', () => {
		const bad: string[] = [];
		for (const file of files) {
			// Блокові коментарі відрізаються: у докблоках проєкту процитовано
			// `Math.random()` як приклад того, чого робити не можна.
			const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
			for (const name of idExpressions(source)) {
				for (const expression of valueSources(source, name)) {
					for (const [re, why] of NONDETERMINISTIC) {
						if (re.test(expression)) bad.push(`${file}: ${name} — ${why}`);
					}
				}
			}
		}
		expect(
			bad,
			`id мусить бути з $props.id():\n${bad.join('\n')}`
		).toEqual([]);
	});
});
