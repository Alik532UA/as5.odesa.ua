/**
 * Гортання галереї колесом і пальцем.
 *
 * Окремо від лайтбокса, бо це інша відповідальність: тут нема нічого про
 * вигляд — лише «який рух означає наступну світлину». Обидва жести мають ту
 * саму пастку з порогом, і тримати їх поруч дешевше, ніж повторювати її двічі.
 *
 * Дією, а не набором пропів-обробників: `wheel` доводиться вішати з
 * `passive: false`, інакше `preventDefault()` не діє — а в розмітці Svelte
 * таких налаштувань не передати.
 */

export interface GalleryGestureOptions {
	/** Скільки світлин у галереї. Менше двох — гортати нема чого. */
	count: number;
	next: () => void;
	prev: () => void;
	/**
	 * Селектор ділянок, де колесо належить самій ділянці, а не галереї —
	 * стрічка прев'ю має прокручуватися, а не перегортати світлини.
	 */
	ignore?: string;
}

/**
 * Колесо: не «одна подія — одна світлина».
 *
 * Тачпад за один рух пальця видає їх десятками, і галерея пролітала б до
 * кінця від найменшого жесту. Тому зсув накопичується, крок робиться на кожні
 * `WHEEL_STEP` пікселів, а пауза довша за `WHEEL_GAP` починає відлік заново:
 * інакше два окремі повільні рухи склалися б в один крок.
 */
const WHEEL_STEP = 60;
const WHEEL_GAP = 220;

/** Поріг свайпу, px. Менше — і галерея гортається від тремтіння пальця. */
const SWIPE_MIN = 40;

export function galleryGestures(node: HTMLElement, options: GalleryGestureOptions) {
	let opts = options;

	let wheelAcc = 0;
	let wheelAt = 0;
	let touchFrom = 0;
	let touchTo = 0;

	function onWheel(e: WheelEvent) {
		if (opts.count <= 1) return;
		if (opts.ignore && (e.target as Element | null)?.closest(opts.ignore)) return;
		e.preventDefault();

		const now = performance.now();
		if (now - wheelAt > WHEEL_GAP) wheelAcc = 0;
		wheelAt = now;
		wheelAcc += e.deltaY;

		if (wheelAcc >= WHEEL_STEP) {
			opts.next();
			wheelAcc = 0;
		} else if (wheelAcc <= -WHEEL_STEP) {
			opts.prev();
			wheelAcc = 0;
		}
	}

	function onTouchStart(e: TouchEvent) {
		touchFrom = e.touches[0].clientX;
		touchTo = touchFrom;
	}

	function onTouchMove(e: TouchEvent) {
		touchTo = e.touches[0].clientX;
	}

	function onTouchEnd() {
		const shift = touchFrom - touchTo;
		if (Math.abs(shift) < SWIPE_MIN) return;
		if (shift > 0) opts.next();
		else opts.prev();
	}

	// `passive: false` лише для колеса: воно єдине знімає типову поведінку.
	node.addEventListener('wheel', onWheel, { passive: false });
	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchmove', onTouchMove, { passive: true });
	node.addEventListener('touchend', onTouchEnd, { passive: true });

	return {
		update(next: GalleryGestureOptions) {
			opts = next;
		},
		destroy() {
			node.removeEventListener('wheel', onWheel);
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('touchend', onTouchEnd);
		}
	};
}
