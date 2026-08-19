/**
 * `prefers-reduced-motion` — для того, що рухається НЕ через CSS
 * (ACCESSIBILITY-v8 § 7).
 *
 * **Навіщо окремий модуль, якщо в `global.css` уже є `@media`.** Бо той блок
 * гасить `animation` і `transition`, тобто рух, яким керує браузер. Тло цього
 * сайту малює `<canvas>` у циклі `requestAnimationFrame`, і CSS про цей цикл не
 * знає нічого: частинки, хвилі й фігури рухалися далі, а разом із ними —
 * паралакс від прокрутки, який § 7 називає окремо. Тобто налаштування
 * виконувалося рівно там, де рухалося найменше.
 *
 * **Чому модуль, а не два рядки в `CanvasEngine`.** Той файл імпортує
 * `$app/environment`, якого в юніт-раннері немає (плагін `svelte`, не
 * `sveltekit()`), тож будь-яка перевірка там була б неможлива — а перевіряти
 * тут є що: середовище без `matchMedia` й перемикання налаштування на ходу.
 *
 * **`matchMedia` перевіряється один раз і читається обережно.** У цьому проєкті
 * уже був випадок, коли перше звернення стояло під `window.matchMedia && …`, а
 * друге — голе, і конструктор синглтона падав саме на другому
 * (`states/ui.svelte.ts`).
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function query(): MediaQueryList | null {
	if (typeof window === 'undefined') return null;
	return window.matchMedia?.(QUERY) ?? null;
}

/** Чи людина попросила менше руху. У середовищі без `matchMedia` — «ні». */
export function prefersReducedMotion(): boolean {
	return query()?.matches ?? false;
}

/**
 * Стежить за зміною налаштування. Повертає відписку.
 *
 * Стеження тут не формальність: налаштування перемикають саме тоді, коли рух
 * заважає ЗАРАЗ, і вимога перезавантажити сторінку заради цього означала б, що
 * перемикач наполовину не працює — той самий дефект, що вже був зі стеженням за
 * системною темою.
 */
export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
	const mq = query();
	if (!mq) return () => {};

	const handle = (event: MediaQueryListEvent) => listener(event.matches);
	mq.addEventListener('change', handle);
	return () => mq.removeEventListener('change', handle);
}
