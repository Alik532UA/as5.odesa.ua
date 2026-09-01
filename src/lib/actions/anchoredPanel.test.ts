import { describe, expect, it } from 'vitest';
import { fitAnchoredPanel } from './anchoredPanel';

/**
 * FLUID-SIZING-v8 § 5 (CRITICAL) — рішення про позицію панелі, відділене від
 * браузера.
 *
 * Геометрію в пікселях міряє `tests/panel-fit.spec.ts` (`GATE-PANEL-FIT`): лише
 * браузер знає, де насправді стоїть кнопка. Але САМЕ РІШЕННЯ — на скільки
 * посунути й де поставити стелю — це чиста функція, і його треба перевіряти
 * там, де видно межові випадки: панель, що не вміщається з обох боків одразу,
 * коротке вікно, вікно, у якому панель уже стоїть правильно.
 *
 * Заміряні числа, з яких народилося правило (сайт as5.odesa.ua, 2026-09-02):
 * на вікні 320 px панель шириною 220 px стояла в −4…216, а перемикач «Гарячі
 * клавіші» — на 219 px нижче краю вікна 844×390.
 */

/** Той самий зазор, що в дії. */
const GAP = 8;

describe('fitAnchoredPanel (FLUID-SIZING-v8 § 5)', () => {
	it('панель, що вміщається, не рухається', () => {
		const fit = fitAnchoredPanel({ left: 1028, right: 1248, top: 76 }, { width: 1280, height: 800 }, GAP);
		expect(fit.shiftX, 'зсув там, де його не просили').toBe(0);
	});

	it('панель, що починається за лівим краєм, повертається із зазором', () => {
		// Заміряний випадок: 320 px вікна, панель у −4…216.
		const fit = fitAnchoredPanel({ left: -4, right: 216, top: 74 }, { width: 320, height: 568 }, GAP);
		expect(fit.shiftX, '`right` мусить стати відʼємним, щоб зсунути панель праворуч').toBe(-12);
		expect(-4 + 12, 'після зсуву ліва межа стоїть рівно на зазорі').toBe(GAP);
	});

	it('панель, що виходить за правий край, теж повертається', () => {
		const fit = fitAnchoredPanel({ left: 200, right: 420, top: 60 }, { width: 400, height: 800 }, GAP);
		expect(fit.shiftX, 'зсув ліворуч пишеться додатним `right`').toBe(28);
	});

	it('коли не вміщається з обох боків, виграє лівий край (§ 5)', () => {
		// Панель ширша за вікно: обидві умови задовольнити не можна.
		const fit = fitAnchoredPanel({ left: 10, right: 330, top: 60 }, { width: 320, height: 800 }, GAP);
		const left = 10 - fit.shiftX;
		expect(left, 'початок панелі мусить бути видимим — його читають першим').toBe(GAP);
	});

	it('стеля висоти рахується від нижнього краю вікна, а не від вмісту', () => {
		// Заміряний випадок: телефон у ландшафті, панель починається на 74 px.
		const fit = fitAnchoredPanel({ left: 592, right: 812, top: 74 }, { width: 844, height: 390 }, GAP);
		expect(fit.maxHeight, '390 − 74 − 8').toBe(308);
	});

	it('стеля не опускається нижче мінімуму, на якому панель ще панель', () => {
		const fit = fitAnchoredPanel({ left: 0, right: 220, top: 300 }, { width: 320, height: 320 }, GAP);
		expect(fit.maxHeight, 'відʼємна або нульова стеля дала б смугу прокрутки на порожньому місці').toBe(
			96
		);
	});

	it('замір робиться від нульового зсуву — інакше він накопичується', () => {
		const first = fitAnchoredPanel({ left: -4, right: 216, top: 74 }, { width: 320, height: 568 }, GAP);
		// Другий виклик із ВЖЕ виправленою геометрією не додає нічого.
		const second = fitAnchoredPanel({ left: 8, right: 228, top: 74 }, { width: 320, height: 568 }, GAP);
		expect(first.shiftX).toBe(-12);
		expect(second.shiftX, 'повторний замір зсунув би панель удруге').toBe(0);
	});
});
