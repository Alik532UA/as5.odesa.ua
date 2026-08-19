import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { onReducedMotionChange, prefersReducedMotion } from './reducedMotion';

/**
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1):
 *
 *  - прибрати `?? false` із `prefersReducedMotion` — червоніє «без matchMedia»;
 *  - прибрати `stopLoop()/startLoop()` із підписки в `CanvasEngine` — червоніє
 *    останній тест, який читає джерело (сам клас імпортує `$app/environment`,
 *    якого в цьому раннері немає, тож завантажити його неможливо).
 */

type Listener = (e: { matches: boolean }) => void;

/**
 * jsdom не має `matchMedia` зовсім. Заглушка віддає ОДИН обʼєкт запиту на всі
 * виклики — інакше слухач вішався б на інший екземпляр, ніж той, який тест
 * потім смикає, і тест був би зеленим із неправильної причини.
 */
function stubMatchMedia(reduced: boolean) {
	const listeners: Listener[] = [];
	const mq = {
		matches: reduced,
		addEventListener: (_t: string, listener: Listener) => listeners.push(listener),
		removeEventListener: (_t: string, listener: Listener) => {
			const at = listeners.indexOf(listener);
			if (at >= 0) listeners.splice(at, 1);
		}
	};
	vi.stubGlobal('matchMedia', () => mq);
	return {
		change(matches: boolean) {
			mq.matches = matches;
			listeners.forEach((l) => l({ matches }));
		},
		get listenerCount() {
			return listeners.length;
		}
	};
}

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion', () => {
	it('бачить прохання зменшити рух', () => {
		stubMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);
	});

	it('без прохання — рух дозволений', () => {
		stubMatchMedia(false);
		expect(prefersReducedMotion()).toBe(false);
	});

	it('без matchMedia не кидає: клас тла імпортує весь layout', () => {
		vi.stubGlobal('matchMedia', undefined);
		expect(prefersReducedMotion()).toBe(false);
	});
});

describe('onReducedMotionChange', () => {
	it('повідомляє про зміну налаштування на ходу', () => {
		const media = stubMatchMedia(false);
		const seen: boolean[] = [];

		const off = onReducedMotionChange((reduced) => seen.push(reduced));
		media.change(true);
		media.change(false);
		off();

		expect(seen).toEqual([true, false]);
	});

	it('відписка знімає слухача', () => {
		const media = stubMatchMedia(false);
		const off = onReducedMotionChange(() => {});
		expect(media.listenerCount).toBe(1);

		off();

		expect(media.listenerCount).toBe(0);
	});

	it('без matchMedia повертає робочу відписку, а не кидає', () => {
		vi.stubGlobal('matchMedia', undefined);
		expect(() => onReducedMotionChange(() => {})()).not.toThrow();
	});
});

describe('тло справді питає про налаштування', () => {
	const source = readFileSync(
		join(process.cwd(), 'src/lib/components/backgrounds/engine/CanvasEngine.ts'),
		'utf8'
	)
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '');

	it('цикл кадрів не запускається при вимкненому русі', () => {
		// Без цієї умови частинки, хвилі й фігури рухаються далі, а `@media`
		// у global.css про requestAnimationFrame не знає нічого.
		expect(source).toMatch(/if\s*\(prefersReducedMotion\(\)\)/);
	});

	it('зміна налаштування перезапускає цикл, а не чекає перезавантаження', () => {
		expect(source).toMatch(/onReducedMotionChange\(/);
		expect(source, 'підписка нічого не робить із циклом').toMatch(/stopLoop\(\);[\s\S]{0,80}startLoop\(\)/);
	});
});
