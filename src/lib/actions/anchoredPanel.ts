/**
 * Панель, прив'язана до кнопки, тримається в межах вікна (FLUID-SIZING-v8 § 5,
 * рівень CRITICAL).
 *
 * ## Що саме ламалося
 *
 * Випадайка налаштувань шапки була прив'язана до правого краю тригера
 * (`position: absolute; right: 0; width: 220px`), а сама шапка —
 * `position: fixed`. Обидві половини поодинці виглядають правильно; разом вони
 * дають панель, яка НЕ прокручується разом зі сторінкою і при цьому вилазить за
 * межі вікна тим більше, чим вужче або нижче вікно.
 *
 * Заміряно 2026-09-02 на зібраному сайті (`/`, після кліку по
 * `header-settings-btn`); координати — від краю вікна:
 *
 * | Вікно     | Ліва межа панелі | Нижня межа | Перемикач «Гарячі клавіші» |
 * |-----------|------------------|------------|----------------------------|
 * | 1280×800  | 1028             | 617        | 567…595 — видно            |
 * | 390×844   | 66               | 615        | 567…595 — видно            |
 * | 360×640   | 36               | 615        | 567…595 — видно            |
 * | 320×568   | **−4**           | 615        | **567…595 — за краєм 568** |
 * | 667×375   | 343              | 615        | **на 220 px за краєм**     |
 * | 844×390   | 592              | 621        | **на 211 px за краєм**     |
 *
 * Доскролити до втраченого не можна: `scrollIntoViewIfNeeded()` на кнопці не
 * змінює її координат жодного разу — панель лежить усередині `position: fixed`
 * шапки, тобто поза потоком прокрутки сторінки.
 *
 * **Ціна не в незручності.** Перемикач «Гарячі клавіші» в цій панелі — це
 * ОБРАНИЙ проєктом спосіб виконати WCAG SC 2.1.4 (рівень A): одиночні `T`, `L`,
 * `B` мусять вимикатися (PROJECT-CONTEXT.md, рішення 2026-08-20). На телефоні в
 * ландшафті й на вікні 320 px до нього не дістатися ніяк, тобто записана
 * відповідність там не виконувалася.
 *
 * ## Чому вимірювання, а не CSS
 *
 * Ширина панелі й місце кнопки відомі лише в браузері: підпис пункту залежить
 * від мови, кнопка їде разом із розкладкою. Anchor positioning (`position-area`,
 * `position-try`) робить це декларативно, але станом на v8 підтримка неповна —
 * канон називає вимірювання прямо (FLUID-SIZING-v8 § 5).
 *
 * ## Межа цього модуля
 *
 * Зсув пишеться в `right` через змінну, а НЕ в `transform`: анімацію появи веде
 * саме `transform`, і кадр анімації затер би позицію (§ 5, передостанній пункт).
 */

/** Прямокутник панелі в координатах вікна — стільки, скільки потрібно для рішення. */
export type PanelBox = { left: number; right: number; top: number };

export type Viewport = { width: number; height: number };

export type PanelFit = {
	/** Значення для CSS-властивості `right`, px. Додатне тягне панель ЛІВОРУЧ. */
	shiftX: number;
	/** Стеля висоти, px: від верху панелі до нижнього краю вікна із зазором. */
	maxHeight: number;
};

/**
 * Найменша стеля, яку має сенс ставити. Нижче цього панель перестає бути
 * панеллю: у неї не влазить навіть один рядок опцій разом із підписом, і
 * замість «прокрути далі» виходить смуга прокрутки на порожньому місці.
 */
const MIN_HEIGHT = 96;

/**
 * Чисте рішення: скільки посунути панель і якою має бути її стеля.
 *
 * Виміри беруться в стані БЕЗ зсуву (`shiftX = 0`) — інакше кожен наступний
 * замір рахував би зсув від уже зсунутого положення й накопичував його.
 *
 * Порядок звужень із § 5: спершу повернути в межі правий край, потім лівий.
 * Лівий виграє навмисно — панель, що починається за екраном, не читається
 * взагалі, а та, що за екраном закінчується, читається принаймні з початку.
 */
export function fitAnchoredPanel(panel: PanelBox, viewport: Viewport, gap: number): PanelFit {
	let dx = 0;

	const overflowRight = panel.right - (viewport.width - gap);
	if (overflowRight > 0) dx = -overflowRight;

	const shortfallLeft = gap - (panel.left + dx);
	if (shortfallLeft > 0) dx += shortfallLeft;

	return {
		/*
		 * `right` росте вліво, тож знак протилежний зсуву. Нуль повертається
		 * додатним навмисно: `-0` — законне число JS, але `Object.is(-0, 0)`
		 * хибне, і перевірка «панель не рухалася» падала б на порожньому місці.
		 */
		shiftX: dx === 0 ? 0 : -dx,
		maxHeight: Math.max(MIN_HEIGHT, viewport.height - panel.top - gap)
	};
}

/** Зазор від краю вікна. `--space-sm` у токенах проєкту — 0.5rem. */
const GAP = 8;

export type AnchoredPanelParams = {
	/** Міряти має сенс лише у відкритому стані: закрита панель не має розміру, який видно. */
	open: boolean;
};

/**
 * Svelte-дія. Вішається на контейнер панелі:
 *
 *     <div class="settings-panel" use:anchoredPanel={{ open: isOpen }}>
 *
 * Контейнер мусить оголосити `--panel-shift-x` і `--panel-max-height` у своєму
 * CSS: доти, доки дія не виміряла (пререндер, вимкнений JS), діють саме ці
 * типові значення, а не порожнеча.
 */
export function anchoredPanel(node: HTMLElement, params: AnchoredPanelParams) {
	let open = params.open;

	const measure = () => {
		if (!open) return;
		// Замір робиться без власного зсуву — див. докблок `fitAnchoredPanel`.
		node.style.setProperty('--panel-shift-x', '0px');
		const box = node.getBoundingClientRect();
		const fit = fitAnchoredPanel(
			{ left: box.left, right: box.right, top: box.top },
			{ width: window.innerWidth, height: window.innerHeight },
			GAP
		);
		node.style.setProperty('--panel-shift-x', `${Math.round(fit.shiftX)}px`);
		node.style.setProperty('--panel-max-height', `${Math.round(fit.maxHeight)}px`);
	};

	/*
	 * Три приводи перевиміряти, і кожен закриває свій випадок (§ 5, останні два
	 * пункти):
	 *   відкриття — панелі досі не було;
	 *   `resize`  — поворот телефона міняє обидві осі одразу;
	 *   вміст     — підпис пункту приходить зі словника, тож зміна мови міняє
	 *               висоту панелі, не чіпаючи ні вікна, ні стану.
	 */
	window.addEventListener('resize', measure);

	// `ResizeObserver` є не в кожному середовищі, де компонент монтують (jsdom
	// без поліфіла). Відсутність спостерігача не мусить ламати саму панель.
	const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
	observer?.observe(node);

	measure();

	return {
		update(next: AnchoredPanelParams) {
			const wasOpen = open;
			open = next.open;
			if (open && !wasOpen) measure();
		},
		destroy() {
			window.removeEventListener('resize', measure);
			observer?.disconnect();
		}
	};
}
