import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeySequence, type KeyStroke } from './keySequence';

/**
 * Кожен тест тут відповідає реальному способу спрацювати випадково.
 *
 * Це не абстрактна повнота: у сусідньому проєкті на цьому origin та сама серія
 * рахувалася ВИЩЕ захисту полів вводу, і затиснута `R` у полі пошуку витирала всі
 * локальні дані за дві секунди, без запитання. Нижче — рівно ті обмеження, яких
 * там не було.
 */

const OUTSIDE_FIELD = { closest: () => null } as unknown as EventTarget;
const INSIDE_FIELD = { closest: () => ({}) } as unknown as EventTarget;

function press(overrides: Partial<KeyStroke> = {}): KeyStroke {
	return { code: 'KeyR', repeat: false, target: OUTSIDE_FIELD, ...overrides };
}

describe('createKeySequence', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('спрацьовує рівно на порозі, не раніше', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 3, onComplete });

		sequence.handle(press());
		sequence.handle(press());
		expect(onComplete).not.toHaveBeenCalled();

		sequence.handle(press());
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('скидає лічильник після спрацювання: наступна серія починається з нуля', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 2, onComplete });

		sequence.handle(press());
		sequence.handle(press());
		expect(sequence.count).toBe(0);

		sequence.handle(press());
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('автоповтор НЕ рахується: затиснута клавіша — одне натискання', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 3, onComplete });

		// ~30 подій за секунду — саме так поріг у 55 набирався за дві секунди.
		for (let i = 0; i < 60; i++) sequence.handle(press({ repeat: true }));

		expect(sequence.count).toBe(0);
		expect(onComplete).not.toHaveBeenCalled();
	});

	it('набір тексту в полі НЕ рахується', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 2, onComplete });

		sequence.handle(press({ target: INSIDE_FIELD }));
		sequence.handle(press({ target: INSIDE_FIELD }));

		expect(onComplete).not.toHaveBeenCalled();
	});

	it('натискання в полі НЕ скидає вже набране', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 2, onComplete });

		sequence.handle(press());
		sequence.handle(press({ target: INSIDE_FIELD }));
		expect(sequence.count).toBe(1);

		sequence.handle(press());
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it.each(['ctrlKey', 'metaKey', 'altKey'] as const)(
		'%s НЕ рахується: це команда браузера, а не крок серії',
		(modifier) => {
			const onComplete = vi.fn();
			const sequence = createKeySequence({ code: 'KeyR', threshold: 2, onComplete });

			sequence.handle(press({ [modifier]: true }));
			sequence.handle(press({ [modifier]: true }));

			expect(onComplete).not.toHaveBeenCalled();
		}
	);

	it('інша клавіша скидає лічильник: це серія, а не сума', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 3, onComplete });

		sequence.handle(press());
		sequence.handle(press());
		sequence.handle(press({ code: 'KeyA' }));
		expect(sequence.count).toBe(0);

		sequence.handle(press());
		sequence.handle(press());
		expect(onComplete).not.toHaveBeenCalled();
	});

	it('пауза довша за вікно скидає лічильник', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 3, windowMs: 2000, onComplete });

		sequence.handle(press());
		sequence.handle(press());
		vi.advanceTimersByTime(2001);
		expect(sequence.count).toBe(0);

		sequence.handle(press());
		sequence.handle(press());
		expect(onComplete).not.toHaveBeenCalled();
	});

	it('натискання в межах вікна продовжують серію', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 3, windowMs: 2000, onComplete });

		sequence.handle(press());
		vi.advanceTimersByTime(1900);
		sequence.handle(press());
		vi.advanceTimersByTime(1900);
		sequence.handle(press());

		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('поріг-функція читається НА КОЖНЕ натискання', () => {
		// Саме те, що потрібно таблу: показати в проді коштує 55, сховати — 5.
		let threshold = 3;
		const onComplete = vi.fn(() => {
			threshold = 2;
		});
		const sequence = createKeySequence({ code: 'KeyR', threshold: () => threshold, onComplete });

		sequence.handle(press());
		sequence.handle(press());
		sequence.handle(press());
		expect(onComplete).toHaveBeenCalledTimes(1);

		// Другий прохід уже за новим, меншим порогом.
		sequence.handle(press());
		sequence.handle(press());
		expect(onComplete).toHaveBeenCalledTimes(2);
	});

	it('reset() знімає таймер, а не лише лічильник', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ code: 'KeyR', threshold: 2, windowMs: 2000, onComplete });

		sequence.handle(press());
		sequence.reset();
		// Якби таймер лишився, він скинув би вже НОВУ серію в чужий момент.
		sequence.handle(press());
		vi.advanceTimersByTime(1999);
		sequence.handle(press());

		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});
