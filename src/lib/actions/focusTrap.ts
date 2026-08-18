/**
 * Утримання фокусу в модальному вікні (ACCESSIBILITY-v8 § 6, HIGH).
 *
 * ## Що саме ламається без цього
 *
 * Елемент з `role="dialog"` і `aria-modal="true"` ОБІЦЯЄ читалці, що поза ним
 * зараз нічого немає. Браузер цієї обіцянки не виконує: Tab спокійно виходить
 * із діалогу в шапку, у меню й далі по сторінці. Виходить найгірший варіант —
 * читалка каже «діалог», користувач тисне Tab і опиняється в елементах, яких
 * не видно (вони під оверлеєм) і які не озвучені як тло.
 *
 * Друга половина — повернення фокусу. Коли діалог закривається, фокус лишається
 * на елементі, якого більше немає в DOM; браузер відкидає його на `<body>`, і
 * наступний Tab починає обхід сторінки З ПОЧАТКУ. Для того, хто відкрив
 * піаніно з підвалу, це означає пройти всю сторінку заново.
 *
 * ## Чому дія, а не код у компоненті
 *
 * У проєкті два місця з `aria-modal="true"`: `PianoModal` і мобільне меню в
 * шапці. Дві копії цієї логіки розійшлися б мовчки, а перевірити, що обидві
 * поводяться однаково, було б нічим.
 *
 * Список селекторів навмисно не претендує на повноту: він покриває те, що
 * буває в цьому проєкті, плюс `[tabindex]`. `:not([tabindex="-1"])` важливий —
 * інакше в цикл потрапляє сам контейнер діалогу, який має `tabindex="-1"` саме
 * для того, щоб приймати фокус програмно й не потрапляти в Tab-порядок.
 */
const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Фільтра видимості тут навмисно НЕМАЄ.
 *
 * Перша редакція відсіювала приховане через `offsetParent === null`. У
 * браузері це працює, у jsdom `offsetParent` дорівнює `null` ЗАВЖДИ (розкладки
 * там немає зовсім) — тобто фільтр повертав рівно один елемент, перший і
 * останній збігалися, і кожен Tab перехоплювався. Перевірка, написана на
 * такому фільтрі, зелена з неправильної причини, а сам фільтр непроверябельний.
 *
 * Обидва діалоги проєкту (піаніно, мобільне меню) прихованих фокусованих
 * елементів усередині не мають, тож фільтр нічого не давав. Якщо колись
 * зʼявиться діалог зі згорнутою секцією — тоді й `checkVisibility()`, і
 * перевірка до нього.
 */
function focusableWithin(node: HTMLElement): HTMLElement[] {
	return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * Svelte-дія. Вішається на контейнер діалогу:
 *
 *     <div role="dialog" aria-modal="true" tabindex="-1" use:focusTrap>
 *
 * Контейнеру потрібен `tabindex="-1"` — на нього стає фокус, коли всередині
 * ще немає нічого фокусованого.
 */
export function focusTrap(node: HTMLElement) {
	const returnTo = document.activeElement as HTMLElement | null;

	// Перший фокусований елемент, а не сам контейнер: інакше читалка починає
	// з порожнього місця, і користувач не знає, що в діалозі є кнопки.
	const first = focusableWithin(node)[0];
	(first ?? node).focus();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const items = focusableWithin(node);
		if (items.length === 0) {
			// Нема куди вести — не даємо піти назовні.
			event.preventDefault();
			return;
		}

		const firstItem = items[0];
		const lastItem = items[items.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && (active === firstItem || active === node)) {
			event.preventDefault();
			lastItem.focus();
		} else if (!event.shiftKey && active === lastItem) {
			event.preventDefault();
			firstItem.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			// `isConnected` — бо повертати фокус на елемент, який теж зник
			// (наприклад, сторінку перемкнули), означає віддати його `<body>`
			// із тим самим наслідком, від якого ми й захищаємося.
			if (returnTo?.isConnected) returnTo.focus();
		}
	};
}
