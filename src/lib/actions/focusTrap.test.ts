import { afterEach, describe, expect, it } from 'vitest';
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
