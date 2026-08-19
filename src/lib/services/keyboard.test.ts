import { describe, expect, it } from 'vitest';
import {
	acceptsShortcut,
	captureKeyboard,
	isKeyboardCaptured,
	isPlainKey,
	isTypingTarget
} from './keyboard';

/**
 * Захист полів вводу й захоплення клавіатури — головне, що тут перевіряється.
 *
 * Причина конкретна й місцева: віртуальне піаніно володіє 17 фізичними клавішами,
 * серед них `T` і `L`. Без обліку захоплення гра на ноті `F#` (клавіша `T`) міняла
 * б заодно тему сайту, а `L` (нота `D`) — мову. Тест на лічильник — це тест на те,
 * що така поведінка не повернеться тихо.
 */

/** Мінімальний фейк події: справжній `KeyboardEvent` тут не потрібен. */
function stroke(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		code: 'KeyT',
		repeat: false,
		target: { closest: () => null },
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		...overrides
	} as unknown as KeyboardEvent;
}

const INSIDE_FIELD = { closest: () => ({}) } as unknown as EventTarget;

describe('isTypingTarget', () => {
	it('бачить поле, коли ним є сама ціль', () => {
		expect(isTypingTarget(INSIDE_FIELD)).toBe(true);
	});

	it('бачить вкладений вузол contenteditable — те, що перевірка за tagName пропускає', () => {
		// Фокус усередині редагованого блоку стоїть на `SPAN`, не на `INPUT`.
		const span = { closest: () => ({}) } as unknown as EventTarget;
		expect(isTypingTarget(span)).toBe(true);
	});

	it('не бачить поля там, де його немає', () => {
		expect(isTypingTarget({ closest: () => null } as unknown as EventTarget)).toBe(false);
	});

	it('не кидає на цілі без closest', () => {
		expect(isTypingTarget(null)).toBe(false);
		expect(isTypingTarget(undefined)).toBe(false);
		expect(isTypingTarget({} as unknown as EventTarget)).toBe(false);
	});
});

describe('isPlainKey', () => {
	it('пропускає одиночну клавішу', () => {
		expect(isPlainKey(stroke())).toBe(true);
	});

	it.each(['ctrlKey', 'metaKey', 'altKey'] as const)('відкидає %s', (modifier) => {
		expect(isPlainKey(stroke({ [modifier]: true }))).toBe(false);
	});

	it('НЕ відкидає Shift: він не змінює code', () => {
		expect(isPlainKey(stroke({ shiftKey: true }))).toBe(true);
	});
});

describe('захоплення клавіатури', () => {
	it('поки ніхто не захопив — скорочення працюють', () => {
		expect(isKeyboardCaptured()).toBe(false);
		expect(acceptsShortcut(stroke())).toBe(true);
	});

	it('захоплена клавіатура глушить скорочення сайту', () => {
		const release = captureKeyboard();
		expect(isKeyboardCaptured()).toBe(true);
		// Саме цей випадок: піаніно відкрите, `T` — це нота, а не тема.
		expect(acceptsShortcut(stroke())).toBe(false);
		release();
		expect(acceptsShortcut(stroke())).toBe(true);
	});

	it('глушить і Escape: накладка закриває себе сама', () => {
		const release = captureKeyboard();
		expect(acceptsShortcut(stroke({ code: 'Escape' }))).toBe(false);
		release();
	});

	it('лічильник, а не прапорець: дві накладки віддають клавіатуру лише разом', () => {
		const releaseFirst = captureKeyboard();
		const releaseSecond = captureKeyboard();

		releaseSecond();
		expect(isKeyboardCaptured(), 'нижня накладка ще відкрита').toBe(true);

		releaseFirst();
		expect(isKeyboardCaptured()).toBe(false);
	});

	it('подвійне звільнення не заганяє лічильник у мінус', () => {
		const release = captureKeyboard();
		release();
		// HMR у Svelte може викликати cleanup двічі; з мінусом клавіатура лишилася
		// б «зайнятою» назавжди.
		release();
		expect(isKeyboardCaptured()).toBe(false);
		expect(acceptsShortcut(stroke())).toBe(true);
	});
});

describe('acceptsShortcut', () => {
	it('НЕ пропускає літеру, коли фокус у полі', () => {
		expect(acceptsShortcut(stroke({ target: INSIDE_FIELD }))).toBe(false);
	});

	it('пропускає Escape із поля: закрити панель більше нічим', () => {
		expect(acceptsShortcut(stroke({ code: 'Escape', target: INSIDE_FIELD }))).toBe(true);
	});

	it('НЕ пропускає Ctrl+Escape: комбінація належить системі', () => {
		expect(acceptsShortcut(stroke({ code: 'Escape', ctrlKey: true }))).toBe(false);
	});
});
