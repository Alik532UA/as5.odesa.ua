import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GATE-CSS-ORDER — правило в `@media`, яке перекрите пізнішим правилом ТІЄЇ Ж
 * специфічності (SVELTE-UI-v8 § 3.6, `SUI-SCOPE-SPECIFICITY`, рівень HIGH:
 * «нічия — завжди дефект»).
 *
 * ## Що саме ламається
 *
 * У підвалі стояло рівно це:
 *
 *     @media (pointer: coarse) { .footer__social-link { width: 44px; height: 44px } }
 *     .footer__social-link { width: 36px; height: 36px }
 *
 * Медіазапит специфічності НЕ додає — він лише обмежує, коли правило діє. Отже
 * обидва правила мають (0,1,0), нічию CSS розвʼязує порядком, і виграє те, що
 * нижче. Кружечок соцмережі лишався 36×36 на телефоні, а поруч лежав коментар,
 * який пояснював, чому він 44×44 (виправлено 2026-09-02).
 *
 * Мовчать усі: `svelte-check` бачить обидва селектори використаними, `eslint` до
 * CSS не заходить, збірка компілює. У браузері теж немає жодного попередження —
 * це не помилка, це нормальний каскад.
 *
 * ## Межа перевірки — навмисно вузька
 *
 * Канон попереджає прямо (§ 3.6, останній пункт): перевірка, яка не відрізняє
 * НІЧИЮ від законного уточнення, дає більше хибних спрацювань, ніж знахідок, і
 * її вимикають. Тому тут порівнюються лише випадки, де про специфічність не
 * треба здогадуватися взагалі:
 *
 *   - той самий ФАЙЛ (у різних файлах порядок вирішує бандлер — це § 3.6, і
 *     лікується воно іншим: строгішим селектором, а не переміщенням);
 *   - той самий рядок селектора СИМВОЛ У СИМВОЛ (тоді специфічність рівна за
 *     побудовою, і рахувати її не треба);
 *   - та сама властивість;
 *   - правило в `@media` стоїть ВИЩЕ за звичайне.
 *
 * Зворотний порядок (звичайне вище, `@media` нижче) — це норма, і саме так
 * написані решта медіазапитів проєкту. Кастомні властивості (`--x`) пропущені:
 * там перевизначення зверху вниз — звичайний прийом тем.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути в
 * `FooterSection.svelte` блок `@media (pointer: coarse)` над базовим правилом
 * `.footer__social-link` — перевірка червоніє на `width` і на `height`.
 * Прогнано.
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

type Declaration = { selector: string; property: string; at: number; inMedia: boolean };

/** Межі кожного `@media`-блоку: від `{` після умови до парної `}`. */
function mediaRanges(css: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const heads = /@media[^{]*\{/g;
	let head: RegExpExecArray | null;
	while ((head = heads.exec(css))) {
		let depth = 1;
		let i = heads.lastIndex;
		while (i < css.length && depth > 0) {
			if (css[i] === '{') depth++;
			else if (css[i] === '}') depth--;
			i++;
		}
		ranges.push([head.index, i]);
	}
	return ranges;
}

/**
 * Розбір навмисно грубий: `селектор { тіло }` без вкладеності — той самий, що в
 * `fluid-sizing.test.ts`. Повного парсера CSS тут не треба: шукається збіг
 * ОДНАКОВИХ рядків, а не обчислення каскаду.
 */
function declarations(source: string, isCss: boolean): Declaration[] {
	const from = isCss ? 0 : source.indexOf('<style');
	if (from < 0) return [];
	const css = source.slice(from).replace(/\/\*[\s\S]*?\*\//g, '');
	const ranges = mediaRanges(css);
	const inMedia = (at: number) => ranges.some(([a, b]) => at > a && at < b);

	const out: Declaration[] = [];
	const rules = /([^{}@]+)\{([^{}]*)\}/g;
	let rule: RegExpExecArray | null;
	while ((rule = rules.exec(css))) {
		const selector = rule[1].trim().replace(/\s+/g, ' ');
		if (!selector || selector.startsWith('@')) continue;
		for (const declaration of rule[2].split(';')) {
			const property = declaration.split(':')[0]?.trim();
			if (!property || property.startsWith('--')) continue;
			out.push({ selector, property, at: rule.index, inMedia: inMedia(rule.index) });
		}
	}
	return out;
}

describe('GATE-CSS-ORDER (SVELTE-UI-v8 § 3.6)', () => {
	const files = walk('src');

	it('стилі знайдено — перевірка жива', () => {
		expect(files.length, 'у src/ немає жодного .svelte чи .css').toBeGreaterThan(10);
		const total = files.reduce(
			(sum, f) => sum + declarations(read(f), f.endsWith('.css')).length,
			0
		);
		expect(total, 'жодного оголошення не розібрано — розбір зламався').toBeGreaterThan(200);
	});

	it('правило в @media не перекрите пізнішим правилом тієї ж специфічності', () => {
		const bad: string[] = [];
		for (const file of files) {
			const parsed = declarations(read(file), file.endsWith('.css'));
			for (const early of parsed) {
				if (!early.inMedia) continue;
				const shadowed = parsed.some(
					(later) =>
						!later.inMedia &&
						later.at > early.at &&
						later.selector === early.selector &&
						later.property === early.property
				);
				if (shadowed) {
					bad.push(`${file}: @media { ${early.selector} { ${early.property} } } нижче має двійника`);
				}
			}
		}
		expect(
			bad,
			'медіазапит специфічності не додає, тож нічию розвʼязує порядок — і правило, ' +
				`написане для іншого пристрою, не діє ніколи:\n${bad.join('\n')}`
		).toEqual([]);
	});
});

function read(rel: string): string {
	return readFileSync(join(ROOT, rel), 'utf8');
}
