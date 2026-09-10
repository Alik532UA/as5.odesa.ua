// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GATE-A11Y-STATIC — кнопка-іконка без імені шукається СТАТИЧНО
 * (ACCESSIBILITY-v9 § 10.6, `A11Y-STATIC-ICON-LABEL`, рівень HIGH).
 *
 * ## Чому axe цього не покриває, хоч і стоїть у гейті
 *
 * `tests/a11y.spec.ts` міряє все, що на екрані після `goto()` — усі 7 сторінок,
 * у двох темах, з відкритими оверлеями. Але кнопка в гілці `{#if}`, у стані
 * помилки чи в модалці, яку той прогін не відкриває, у результат axe не
 * потрапляє НІКОЛИ — а саме там кнопки-іконки й живуть. У цьому проєкті таких
 * гілок уже чотири: `{#if copied}` на таблі версії, `{#if betaChecklist.
 * reportFallback}` у чеклисті, сніпет `failed` межі помилок і сама модалка
 * піаніно.
 *
 * Статичний скан не заміняє axe і не перевіряє те саме: axe знає про рендер,
 * цей інваріант — про гілки, до яких рендер не дійшов. Канон називає це прямо:
 * обидва живуть у гейті.
 *
 * ## Що вважається порушенням
 *
 * Інтерактивний елемент (`<button>`, `<a>`), у якого немає ні тексту, ні
 * `aria-label`/`aria-labelledby`/`title`. Читалка оголошує таку кнопку як
 * «button» — без жодного слова про те, що вона робить.
 *
 * Друга половина § 10.6: ім'я мусить приходити зі словника, а не з
 * атрибута-літерала — інакше в другій мові кнопка знову без імені, і гейт цього
 * не бачить. Тут перевіряється форма (`aria-label={…}`, а не
 * `aria-label="Close"`); ЗМІСТ виразу — межа `src/i18n-literals.test.ts`, де
 * лежить перелік свідомого хардкоду з причинами. Двох переліків того самого
 * навмисно немає: вони розходяться мовчки.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v9 § 1.1)
 *
 * Прогнано перед комітом: прибрати `aria-label` із кнопки закриття
 * `MobileMenu.svelte` — інваріант червоніє саме на ній; замінити її
 * `aria-label={$t('a11y.closeMenu')}` на `aria-label="Close"` — червоніє друга
 * перевірка.
 */

const ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(join(ROOT, dir))) {
		const rel = `${dir}/${entry}`;
		if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
		else if (entry.endsWith('.svelte')) out.push(rel);
	}
	return out;
}

const files = walk('src');

/** `</button\n>` — теж закриття: prettier переносить `>` на власний рядок. */
const ELEMENTS: Array<[string, RegExp]> = [
	['button', /<button\b([^>]*)>([\s\S]*?)<\/button\s*>/g],
	['a', /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/g]
];

const NAME_ATTR = /\b(aria-label|aria-labelledby|title)\s*=/;
/** Ім'я зі словника приходить виразом; літерал у лапках — ні. */
const NAME_LITERAL = /\b(aria-label|title)\s*=\s*["']([^"']*)["']/;

/**
 * Імена, які однакові в кожній мові, — власні назви.
 *
 * «Facebook» українською — теж «Facebook». Ключ у словнику дав би дві копії
 * того самого рядка й одну зайву нагоду їх розсинхронити, а ризику, від якого
 * стереже § 10.6 («у другій мові кнопка знову без імені»), тут не існує.
 *
 * Перелік короткий і закритий: назва сервісу. Будь-яке слово, яке
 * ПЕРЕКЛАДАЄТЬСЯ, сюди не дописується — саме для нього перевірка й написана.
 */
const LANGUAGE_NEUTRAL: readonly string[] = ['Facebook', 'Instagram'];

/**
 * Чи є в елемента ВИДИМИЙ текст.
 *
 * Теги прибираються разом із вмістом атрибутів (там текст не рендериться),
 * керівні блоки Svelte — теж: `{#if …}` не є текстом, а без цього кроку будь-яка
 * гілка читалася б як підпис і перевірка мовчала б.
 */
function hasText(inner: string): boolean {
	const text = inner
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]*>/g, '')
		.replace(/\{[#/:][^}]*\}/g, '')
		.trim();
	return text.length > 0;
}

/** Один елемент розмітки: де знайдено, які атрибути, що всередині. */
type Found = { file: string; tag: string; attrs: string; inner: string };

const found: Found[] = files.flatMap((file) => {
	const source = readFileSync(join(ROOT, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
	return ELEMENTS.flatMap(([tag, re]) =>
		[...source.matchAll(new RegExp(re.source, 'g'))].map(([, attrs, inner]) => ({
			file,
			tag,
			attrs,
			inner
		}))
	);
});

/** Елементи без видимого тексту — саме вони й мусять мати ім'я атрибутом. */
const iconOnly = found.filter((el) => !hasText(el.inner));

describe('GATE-A11Y-STATIC: іконка без імені (ACCESSIBILITY-v9 § 10.6)', () => {
	it('перевірка жива: розмітку прочитано, елементи знайдено', () => {
		expect(files.length, 'у src/ немає жодного .svelte').toBeGreaterThan(10);
		expect(
			found.length,
			'жодного <button> чи <a> — або розбір зламався, або розмітки немає; ' +
				'обидва випадки червоні'
		).toBeGreaterThan(20);
		expect(
			iconOnly.length,
			'жодного елемента без тексту — так у цьому проєкті не буває (кнопка ' +
				'налаштувань, бургер, закриття меню, закриття модалки, іконки підвалу), ' +
				'тобто розбір вмісту зламався'
		).toBeGreaterThan(3);
	});

	it('розбір бачить елемент і його вміст — механізм не дивиться повз', () => {
		// Канарка над самим механізмом: три випадки, які він мусить розрізняти.
		const sample =
			'<button class="x"><svg /></button>' +
			'<button aria-label={$t("a")}><Icon /></button>' +
			'<button>Текст</button>';
		const parsed = [...sample.matchAll(new RegExp(ELEMENTS[0][1].source, 'g'))].map(
			([, attrs, inner]) => ({ named: NAME_ATTR.test(attrs), text: hasText(inner) })
		);
		expect(parsed).toEqual([
			{ named: false, text: false },
			{ named: true, text: false },
			{ named: false, text: true }
		]);
	});

	it('кожен елемент без тексту має ім\'я в атрибуті', () => {
		const nameless = iconOnly
			.filter((el) => !NAME_ATTR.test(el.attrs))
			.map((el) => `${el.file}: <${el.tag}${el.attrs.replace(/\s+/g, ' ').slice(0, 70)}>`);
		expect(
			nameless,
			'читалка оголосить це як «button» без жодного слова про те, що воно ' +
				'робить, — і axe цього не побачить, якщо гілка не відкрита:\n' +
				nameless.join('\n')
		).toEqual([]);
	});

	it('ім\'я приходить виразом, а не літералом у лапках', () => {
		const literal = iconOnly
			.map((el) => ({ el, hit: el.attrs.match(NAME_LITERAL) }))
			.filter(({ hit }) => hit !== null && !LANGUAGE_NEUTRAL.includes(hit[2].trim()))
			.map(({ el, hit }) => `${el.file}: ${hit![0]}`);
		expect(
			literal,
			'ім\'я в лапках лишається тим самим у другій мові — англійська версія ' +
				'сайту оголосить кнопку українською або навпаки:\n' + literal.join('\n')
		).toEqual([]);
	});

	it('у переліку мовно-нейтральних імен немає записів, яких у розмітці вже немає', () => {
		const all = files.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
		const stale = LANGUAGE_NEUTRAL.filter((name) => !all.includes(`"${name}"`));
		expect(
			stale,
			`запис прощає ім'я, якого в розмітці немає — прибрати:\n${stale.join('\n')}`
		).toEqual([]);
	});
});
