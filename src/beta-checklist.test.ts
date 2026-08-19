// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { collectTestIds, testIdExists } from '../vitest/support/testids';
import { BETA_CHECKS, BETA_TABS, BETA_UNCOVERED_ROUTES, checksByCoverage } from '$lib/config/beta';

/**
 * Інваріанти чеклиста бета-тестування (BETA-CHECKLIST-v8 § 5).
 *
 * ## Навіщо перевіряти список для людини машиною
 *
 * Найдорожча пастка чеклистів — не помилка в пункті, а ВІДСТАВАННЯ: код
 * змінився, пункт лишився, і людина ставить «перевірено» на тому, чого вже
 * немає. У джерелі канону такий пункт прожив 46 комітів, і причина, чому цього
 * не побачила жодна перевірка, важливіша за сам пункт: поле `testid` було
 * необовʼязкове. Автор шукав локатор, не знайшов, прибрав поле — і пункт став
 * неперевірним. Перевірка мовчала не тому, що помилилася, а тому, що її
 * позбавили входу.
 *
 * Тому тут `testid` обовʼязковий скрізь, де в тексті є «натисніть», і його
 * існування звіряється з розміткою.
 *
 * ## Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1)
 *
 * Прогнано перед комітом, по одному на кожен інваріант — опис у коміті.
 */

const TAB_IDS = BETA_TABS.map((t) => t.id);
const KNOWN_TESTIDS = collectTestIds('src');

/** Маршрути з файлової системи, а не другий список «на око». */
function realRoutes(): string[] {
	const out = ['/'];
	for (const entry of readdirSync('src/routes', { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (existsSync(`src/routes/${entry.name}/+page.svelte`)) out.push(`/${entry.name}`);
	}
	return out;
}

describe('чеклист бета-тестування', () => {
	it('перевірка жива: пункти, вкладки й локатори знайдено', () => {
		expect(BETA_CHECKS.length, 'жодного пункта — інваріанти нижче перевіряли б порожнечу').toBeGreaterThan(10);
		expect(BETA_TABS.length).toBeGreaterThan(1);
		expect(KNOWN_TESTIDS.length, 'локаторів не зібрано — § 5.3 став би зеленим на всьому').toBeGreaterThan(20);
	});

	it('кожен маршрут заявлений рівно однією вкладкою (§ 5.1)', () => {
		const claimed = new Map<string, string[]>();
		for (const tab of BETA_TABS) {
			for (const route of tab.routes) claimed.set(route, [...(claimed.get(route) ?? []), tab.id]);
		}

		// Сторінка є, а перевіряти її нічим — найтихіший спосіб втратити покриття.
		const uncovered = realRoutes().filter(
			(r) => !claimed.has(r) && !BETA_UNCOVERED_ROUTES.includes(r)
		);
		expect(uncovered, 'сторінка є, а вкладки для неї немає').toEqual([]);

		const twice = [...claimed].filter(([, tabs]) => tabs.length > 1).map(([r, t]) => `${r} → ${t.join(', ')}`);
		expect(twice, 'маршрут заявлено двічі — незрозуміло, де його перевіряти').toEqual([]);

		// Виняток, що застарів, гниє так само тихо, як відсутній пункт.
		const stale = BETA_UNCOVERED_ROUTES.filter((r) => !realRoutes().includes(r));
		expect(stale, 'у переліку винятків маршрут, якого немає').toEqual([]);

		// Два списки, що суперечать один одному. Знайдено зворотним
		// експериментом: додати заявлений маршрут у винятки — і перевірка
		// лишалася ЗЕЛЕНОЮ, бо кожен список окремо виглядав правильним.
		const both = BETA_UNCOVERED_ROUTES.filter((r) => claimed.has(r));
		expect(both, 'маршрут і заявлений вкладкою, і записаний у винятки').toEqual([]);
	});

	it('covered називає файл тесту, і файл існує (§ 5.2)', () => {
		const missing = BETA_CHECKS.filter((c) => c.test && !existsSync(c.test)).map((c) => `${c.id} → ${c.test}`);
		expect(missing, 'названий файл тесту не існує — твердження про покриття гниє швидше за чеклист').toEqual([]);

		const noTest = BETA_CHECKS.filter((c) => c.coverage === 'covered' && !c.test).map((c) => c.id);
		expect(noTest, 'covered без назви файлу — таке покриття неможливо перевірити').toEqual([]);

		// Зворотне: одне з двох неправда — або рівень, або назва.
		const extra = BETA_CHECKS.filter((c) => c.coverage !== 'covered' && c.test).map((c) => c.id);
		expect(extra, 'manual/testable називає тест — тоді це covered').toEqual([]);
	});

	it('пункт, що просить натиснути, називає ІСНУЮЧИЙ локатор (§ 5.3)', () => {
		const asksToPress = BETA_CHECKS.filter((c) => /натисн/i.test(c.text.uk));
		expect(asksToPress.length, 'жодного пункта з «натисніть» — перевірка мертва').toBeGreaterThan(3);

		const naked = asksToPress.filter((c) => !c.testid).map((c) => c.id);
		expect(naked, 'неперевірний за побудовою: просить натиснути те, що не можна назвати').toEqual([]);

		const unknown = BETA_CHECKS.filter((c) => c.testid && !testIdExists(c.testid, KNOWN_TESTIDS)).map(
			(c) => `${c.id} → ${c.testid}`
		);
		expect(unknown, 'локатора немає в розмітці — пункт описує елемент, якого немає').toEqual([]);
	});

	it('id унікальні й мають форму {вкладка}_{номер} (§ 5.4)', () => {
		const seen = new Set<string>();
		const dupes = BETA_CHECKS.filter((c) => (seen.has(c.id) ? true : (seen.add(c.id), false))).map((c) => c.id);
		expect(dupes, 'дублікат id — прогрес двох пунктів злипнеться в один').toEqual([]);

		const malformed = BETA_CHECKS.filter((c) => !new RegExp(`^(${TAB_IDS.join('|')})_\\d+$`).test(c.id)).map(
			(c) => c.id
		);
		expect(malformed).toEqual([]);

		const wrongTab = BETA_CHECKS.filter((c) => !c.id.startsWith(`${c.tab}_`)).map((c) => `${c.id} (${c.tab})`);
		expect(wrongTab, 'id каже одну вкладку, поле — іншу').toEqual([]);
	});

	it('обидві мови непорожні, і переклад справді зроблено (§ 5.4)', () => {
		const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;
		const bad: string[] = [];
		for (const { id, text } of BETA_CHECKS) {
			if (text.uk.trim().length < 20) bad.push(`${id}: український текст порожній або надто короткий`);
			if (text.en.trim().length < 20) bad.push(`${id}: англійський текст порожній або надто короткий`);
			if (!CYRILLIC.test(text.uk)) bad.push(`${id}: в українському тексті немає кирилиці`);
			// Забутий переклад — це скопійований український рядок, і ТИП цього
			// не бачить: обидва поля заповнені, обидва рядки.
			if (CYRILLIC.test(text.en)) bad.push(`${id}: в англійському тексті кирилиця — переклад забули`);
		}
		for (const tab of BETA_TABS) {
			if (!tab.title.uk.trim() || !tab.title.en.trim()) bad.push(`вкладка ${tab.id}: порожня назва`);
			if (CYRILLIC.test(tab.title.en)) bad.push(`вкладка ${tab.id}: кирилиця в англійській назві`);
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});

	it('у кожній вкладці є пункт для людини і пункт-межа (§ 5.4)', () => {
		const bad: string[] = [];
		for (const tab of BETA_TABS) {
			const own = BETA_CHECKS.filter((c) => c.tab === tab.id);
			if (own.length === 0) bad.push(`${tab.id}: вкладка без жодного пункта`);
			// Вкладка, де все покрито машиною, марнує час людини.
			if (!own.some((c) => c.coverage === 'manual')) bad.push(`${tab.id}: жодного пункта manual`);
			// Найдорожчі дефекти тихі: ліміт, який перестав діяти, виглядає
			// точно так само, як ліміт, що діє. «Не мусить» треба питати окремо.
			if (!own.some((c) => c.negative)) bad.push(`${tab.id}: жодної перевірки межі`);
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});

	it('текст написаний для людини, а не для розробника (§ 2.1)', () => {
		const bad: string[] = [];
		for (const { id, text } of BETA_CHECKS) {
			// Номер малює сторінка з позиції; вписаний розійдеться з нею на
			// першій же вставці.
			if (/^\s*\d+[.)]/.test(text.uk) || /^\s*\d+[.)]/.test(text.en)) {
				bad.push(`${id}: текст починається з номера`);
			}
			// Оціночні слова: двоє людей поставлять різні позначки на тому
			// самому екрані.
			for (const word of ['коректно', 'адекватн', 'нормальн', 'правильно працю']) {
				if (text.uk.toLowerCase().includes(word)) bad.push(`${id}: оціночне слово «${word}» замість видимого вияву`);
			}
			// Внутрішні назви: людина, яка згодилася потикати сайт, не знає, що
			// таке локатор, `$state` чи `.svelte`.
			for (const word of ['$state', '.svelte', 'data-testid', 'localStorage', 'prerender']) {
				if (text.uk.includes(word)) bad.push(`${id}: внутрішня назва «${word}» у тексті для людини`);
			}
			// Два різні апострофи ламають пошук по чеклисту — а шукати в ньому
			// доводиться щоразу, коли зі звіту треба знайти пункт за словом.
			if (text.uk.includes("'")) bad.push(`${id}: прямий апостроф; у цьому проєкті вживається ’`);
		}
		expect(bad, bad.join('\n')).toEqual([]);
	});

	it('рівні йдуть manual → testable → covered зі збереженим порядком (§ 3)', () => {
		for (const tab of BETA_TABS) {
			const groups = checksByCoverage(tab.id);
			expect(groups.map((g) => g.coverage), tab.id).toEqual(
				['manual', 'testable', 'covered'].filter((c) => groups.some((g) => g.coverage === c))
			);
			// Порядок оголошення всередині рівня тематичний — сортування за id
			// чи за текстом розсипало б розділи.
			for (const group of groups) {
				const declared = BETA_CHECKS.filter((c) => c.tab === tab.id && c.coverage === group.coverage);
				expect(group.checks.map((c) => c.id), `${tab.id}/${group.coverage}`).toEqual(declared.map((c) => c.id));
			}
		}
	});
});
