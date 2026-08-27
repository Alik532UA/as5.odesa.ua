import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { focusTrap } from './focusTrap';

/**
 * ACCESSIBILITY-v8 § 6 (HIGH): модалка утримує фокус і повертає його.
 *
 * ## Чому перевірка саме тут, а не в браузері
 *
 * Обидва місця з `aria-modal` у проєкті закриваються з `transition:` —
 * `fade` у піаніно, `fly` у мобільному меню. Svelte веде ці переходи через
 * `requestAnimationFrame`, а той не спрацьовує у вкладці, яка не малює кадри.
 * Тобто перевірити повернення фокусу в headless-браузері неможливо в принципі:
 * елемент не встигає зникнути, і `destroy` дії не викликається ЖОДНОГО разу.
 *
 * Тут `destroy()` викликається напряму — це те саме, що робить Svelte, коли
 * знімає елемент, тільки без очікування кадру.
 *
 * ## Що саме ламалося без дії
 *
 * `role="dialog"` + `aria-modal="true"` кажуть читалці, що поза діалогом зараз
 * нічого немає. Браузер цього не забезпечує: Tab виходив у шапку й далі по
 * сторінці, якої не видно під оверлеєм. А після закриття фокус падав на
 * `<body>`, тож той, хто відкрив піаніно з підвалу, мусив пройти всю сторінку
 * заново.
 */

function buildDialog(buttonCount = 3) {
	const trigger = document.createElement('button');
	trigger.id = 'trigger';
	document.body.appendChild(trigger);
	trigger.focus();

	const dialog = document.createElement('div');
	dialog.tabIndex = -1;
	for (let i = 0; i < buttonCount; i++) {
		const b = document.createElement('button');
		b.id = `b${i}`;
		dialog.appendChild(b);
	}
	document.body.appendChild(dialog);
	return { trigger, dialog, buttons: Array.from(dialog.querySelectorAll('button')) };
}

/** Той самий шлях, яким подія доходить до слухача дії. */
function tab(dialog: HTMLElement, shiftKey = false) {
	const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
	document.activeElement?.dispatchEvent(event);
	return event;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('focusTrap', () => {
	it('переводить фокус усередину діалогу', () => {
		const { dialog, buttons } = buildDialog();

		focusTrap(dialog);

		expect(document.activeElement).toBe(buttons[0]);
	});

	it('Tab з останнього елемента повертає на перший', () => {
		const { dialog, buttons } = buildDialog();
		focusTrap(dialog);
		buttons[2].focus();

		const event = tab(dialog);

		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(buttons[0]);
	});

	it('Shift+Tab з першого елемента веде на останній', () => {
		const { dialog, buttons } = buildDialog();
		focusTrap(dialog);

		const event = tab(dialog, true);

		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(buttons[2]);
	});

	it('усередині діалогу Tab не перехоплюється — браузер ходить сам', () => {
		const { dialog, buttons } = buildDialog();
		focusTrap(dialog);
		buttons[1].focus();

		const event = tab(dialog);

		expect(event.defaultPrevented).toBe(false);
	});

	it('повертає фокус на елемент, з якого діалог відкрили', () => {
		const { trigger, dialog } = buildDialog();
		const trap = focusTrap(dialog);
		expect(document.activeElement).not.toBe(trigger);

		trap.destroy();

		expect(document.activeElement).toBe(trigger);
	});

	it('не повертає фокус на елемент, якого вже немає в DOM', () => {
		const { trigger, dialog } = buildDialog();
		const trap = focusTrap(dialog);
		trigger.remove();

		// Головне — що не кинуло: інакше виняток стався б під час розмонтування
		// й лишив би застосунок у півстані.
		expect(() => trap.destroy()).not.toThrow();
		expect(document.activeElement).not.toBe(trigger);
	});

	it('порожній діалог не випускає фокус назовні', () => {
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		const dialog = document.createElement('div');
		dialog.tabIndex = -1;
		document.body.appendChild(dialog);

		focusTrap(dialog);
		expect(document.activeElement).toBe(dialog);

		const event = tab(dialog);
		expect(event.defaultPrevented).toBe(true);
	});
});

/**
 * Інваріант над РОЗМІТКОЮ: кожна модалка справді бере дію.
 *
 * Тести вище доводять, що `focusTrap` працює. Вони за побудовою не доводять,
 * що його хтось застосував — а саме це й губиться першим: `aria-modal="true"`
 * пишуть разом із `role="dialog"`, бо так каже приклад у документації, і на
 * цьому зупиняються. Браузер обіцянки `aria-modal` не виконує: Tab виходить із
 * діалогу на сторінку під оверлеєм, а після закриття фокус падає на `<body>`.
 *
 * Правило доти жило лише рядком в `AGENTS.md` серед тих, що «не ловить жоден
 * гейт». Дія існує, тести на неї зелені — і третя модалка мовчки лишилася б без
 * неї, а звіт про якість цього не показав би (AI-AGENT-PITFALLS-v8 § 3:
 * існування ≠ досяжність).
 *
 * Зворотний експеримент: прибрати `use:focusTrap` з `PianoModal.svelte` —
 * перевірка червоніє саме на ньому. Прогнано.
 */
describe('кожна модалка бере focusTrap (ACCESSIBILITY-v8 § 6)', () => {
	const ROOT = resolve(__dirname, '../../..');

	function svelteFiles(dir: string, out: string[] = []): string[] {
		for (const entry of readdirSync(join(ROOT, dir))) {
			const rel = `${dir}/${entry}`;
			if (statSync(join(ROOT, rel)).isDirectory()) svelteFiles(rel, out);
			else if (entry.endsWith('.svelte')) out.push(rel);
		}
		return out;
	}

	/**
	 * Відкривальний тег цілком.
	 *
	 * Регулярка `<[a-zA-Z][^<>]*>` тут НЕ годиться, і це знайдено падінням, а не
	 * читанням: у `PianoModal.svelte` в тезі стоїть
	 * `onclick={(e) => e.target === e.currentTarget && onClose()}`, і стрілка
	 * `=>` обриває збіг на своєму `>`. Тег «закінчувався» до `use:focusTrap`, і
	 * перевірка звинувачувала файл, який усе робить правильно — тобто хибне
	 * спрацювання, від якого гейт вимикають.
	 *
	 * Тому тег читається сканером: `>` рахується кінцем лише поза лапками й поза
	 * фігурними дужками.
	 */
	function openTags(source: string): string[] {
		const tags: string[] = [];
		for (let i = 0; i < source.length; i++) {
			if (source[i] !== '<' || !/[a-zA-Z]/.test(source[i + 1] ?? '')) continue;
			let depth = 0;
			let quote = '';
			for (let j = i + 1; j < source.length; j++) {
				const c = source[j];
				if (quote) {
					if (c === quote) quote = '';
					continue;
				}
				if (c === '"' || c === "'" || c === '`') quote = c;
				else if (c === '{') depth++;
				else if (c === '}') depth--;
				else if (c === '<' && depth === 0) break;
				else if (c === '>' && depth === 0) {
					tags.push(source.slice(i, j + 1));
					i = j;
					break;
				}
			}
		}
		return tags;
	}

	const dialogs = svelteFiles('src').flatMap((file) =>
		openTags(readFileSync(join(ROOT, file), 'utf8'))
			.filter((tag) => /aria-modal=["{]?\s*(true|"true")/.test(tag))
			.map((tag) => ({ file, tag }))
	);

	it('модалки в проєкті знайдено — перевірка жива', () => {
		// Нуль тут означав би не «модалок немає», а «регулярка їх не бачить»:
		// у проєкті їх дві, і обидві названі в докблоці вище.
		expect(dialogs.length, 'жодного aria-modal у розмітці — перевірка сліпа').toBe(2);
	});

	it('кожен aria-modal несе use:focusTrap на тому самому елементі', () => {
		const bare = dialogs
			.filter(({ tag }) => !tag.includes('use:focusTrap'))
			.map(({ file }) => file);
		expect(
			bare,
			`браузер обіцянки \`aria-modal\` не виконує — Tab вийде з діалогу:\n${bare.join('\n')}`
		).toEqual([]);
	});
});
