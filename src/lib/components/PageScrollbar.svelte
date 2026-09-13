<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { scrollbar } from '$lib/states/scrollbar.svelte';
	import { ui } from '$lib/states/ui.svelte';
	import { Spring } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';

	/**
	 * Власна смуга прокрутки сторінки.
	 *
	 * Нативну довелося замінити, бо три вимоги з нею несумісні:
	 *
	 * 1. **Не займати ширину.** Класична смуга є частиною розкладки, тому
	 *    сторінки з нею і без неї зсунуті одна відносно одної — це видно при
	 *    перемиканні вкладок.
	 * 2. **Бути під заставкою.** Нативну смугу малює браузер поверх усього
	 *    вмісту, `z-index` на неї не діє.
	 * 3. **Товщати при наближенні миші.** Chromium не перемальовує
	 *    `::-webkit-scrollbar` від зміни змінних у рантаймі — перевірено:
	 *    значення змінної оновлюється, вигляд лишається старим.
	 *
	 * Сама прокрутка лишається нативною: колесо, клавіатура, дотик і `scrollTo`
	 * працюють як раніше. Компонент лише малює індикатор і дозволяє тягнути.
	 *
	 * Алгоритм реакції на наближення — з бокових арок DigitalWorkshop: лінійна
	 * частка від відстані плюс пружина.
	 */

	/** Товщина у спокої та в розгорнутому стані, px. */
	const REST_WIDTH = 10;
	const HOVER_WIDTH = 20;

	/** Найменша висота повзунка, щоб його було за що вхопити на довгій сторінці. */
	const MIN_THUMB = 32;

	let scrollY = $state(0);
	let viewportHeight = $state(0);
	let pageHeight = $state(1);
	let windowWidth = $state(0);
	let mouseX = $state(Number.POSITIVE_INFINITY);
	let pointerInside = $state(false);
	let dragging = $state(false);
	/** Зсув місця захоплення від верху повзунка — щоб той не стрибав під курсор. */
	let grabOffset = 0;
	/**
	 * Прямокутник доріжки, знятий ОДИН раз на початку перетягування.
	 *
	 * `getBoundingClientRect()` на кожен рух миші змушує браузер рахувати
	 * розкладку — а доріжка `position: fixed` і під час прокрутки не рухається,
	 * тож міряти її повторно нема сенсу.
	 */
	let trackTop = 0;
	/** Елемент, що тримає захват вказівника, і для якого саме вказівника. */
	let capturedTrack: HTMLElement | null = null;
	let capturedPointerId = -1;
	/** Останнє положення курсора, ще не застосоване. */
	let pendingY = 0;
	let frame = 0;
	/**
	 * Позиція повзунка під час перетягування — прямо з курсора.
	 *
	 * Інакше виходить петля: рух → scrollTo → подія scroll → оновлення стану →
	 * перемальовування. Повзунок відстає від курсора щонайменше на кадр, і це
	 * відчувається як гальмування.
	 */
	let dragThumbTop = $state(0);


	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	/**
	 * На сенсорних пристроях смуга не потрібна: там прокрутка пальцем, а
	 * нативний індикатор і так накладка, що нічого не зсуває.
	 */
	/** Чи наша черга малювати. Рішення приймає один контролер на всіх. */
	const enabled = $derived(scrollbar.active === 'custom');

	const scrollable = $derived(pageHeight > viewportHeight + 1);
	/**
	 * Змонтована — поки обрано цей режим; ВИДИМА — поки є що прокручувати.
	 *
	 * Розділено навмисно: якби елемент зникав із DOM на сторінці без прокрутки,
	 * анімувати зникнення не було б чого. Тепер він лишається і просто виїжджає
	 * за край.
	 */
	const visible = $derived(enabled && scrollable);

	const target = $derived.by(() => {
		if (!visible || reducedMotion.current) return 0;
		if (dragging) return 1;
		if (!pointerInside || !windowWidth) return 0;
		const start = 0.18 * windowWidth;
		const end = 0.02 * windowWidth;
		const distance = windowWidth - mouseX;
		if (distance > start) return 0;
		if (distance < end) return 1;
		return (start - distance) / (start - end);
	});

	const progress = new Spring(0, { stiffness: 0.05, damping: 0.4 });

	$effect(() => {
		progress.target = target;
	});

	/**
	 * Поява й зникнення: 0 — повністю за краєм, 1 — на місці.
	 *
	 * Жорсткіша за пружину наближення: тут не потрібна м’якість, потрібно
	 * швидко й без коливань прибрати смугу зі сторінки, яка вся вмістилася.
	 */
	const presence = new Spring(0, { stiffness: 0.15, damping: 0.8 });

	$effect(() => {
		presence.target = visible ? 1 : 0;
	});

	/**
	 * Висота повзунка теж пружинна: при переході між сторінками вона
	 * стрибала — коротка сторінка дає довгий повзунок і навпаки.
	 *
	 * Позиція (`thumbTop`) навмисно НЕ анімується: вона мусить іти за курсором
	 * і за прокруткою миттєво, інакше повертається та сама затримка, через яку
	 * перетягування смикалося.
	 */
	const springHeight = new Spring(MIN_THUMB, { stiffness: 0.2, damping: 0.9 });

	$effect(() => {
		springHeight.target = rawThumbHeight;
	});

	const width = $derived(REST_WIDTH + (HOVER_WIDTH - REST_WIDTH) * progress.current);

	/** Скільки повзунок мав би займати за поточної висоти сторінки. */
	const rawThumbHeight = $derived(
		Math.max((viewportHeight / pageHeight) * viewportHeight, MIN_THUMB)
	);
	/** Те саме, але доїжджає плавно. */
	const thumbHeight = $derived(springHeight.current);
	const thumbTop = $derived.by(() => {
		if (dragging) return dragThumbTop;
		const maxScroll = pageHeight - viewportHeight;
		if (maxScroll <= 0) return 0;
		return (scrollY / maxScroll) * (viewportHeight - thumbHeight);
	});

	function measure() {
		if (!browser) return;
		pageHeight = Math.max(document.documentElement.scrollHeight, 1);
		viewportHeight = window.innerHeight;
		scrollY = window.scrollY;
	}

	/**
	 * Після переходу міряємо одразу, не чекаючи на ResizeObserver.
	 *
	 * Спостерігач спрацює й сам, але на кадр-два пізніше — і саме в цей момент
	 * повзунок мав би стару висоту від попередньої сторінки. Пружина згладжує
	 * перехід, але починати його треба вчасно.
	 */
	afterNavigate(() => {
		if (enabled) measure();
	});

	$effect(() => {
		if (!enabled) return;
		measure();

		const onScroll = () => (scrollY = window.scrollY);
		window.addEventListener('scroll', onScroll, { passive: true });

		// Висота сторінки змінюється не лише від resize: довантажуються
		// зображення, відкриваються блоки, приходить контент із Firestore.
		const observer = new ResizeObserver(measure);
		observer.observe(document.documentElement);

		return () => {
			window.removeEventListener('scroll', onScroll);
			observer.disconnect();
		};
	});


	/**
	 * Прокрутити так, щоб верх повзунка опинився під курсором.
	 *
	 * `behavior: 'instant'`, а не `'auto'`. `'auto'` означає «взяти значення з
	 * CSS», а в `global.css` стоїть `scroll-behavior: smooth` — тобто кожен рух
	 * миші запускав плавну анімацію прокрутки, і вони наздоганяли одна одну.
	 * Саме це відчувалося як ривки й затримка.
	 */
	function applyScroll() {
		frame = 0;
		const maxThumbTop = viewportHeight - thumbHeight;
		if (maxThumbTop <= 0) return;
		const wanted = pendingY - trackTop - grabOffset;
		const clamped = Math.min(Math.max(wanted, 0), maxThumbTop);
		dragThumbTop = clamped;
		window.scrollTo({ top: (clamped / maxThumbTop) * (pageHeight - viewportHeight), behavior: 'instant' });
	}

	/** Рухи миші йдуть частіше за кадри — зайві просто відкидаємо. */
	function requestScroll(clientY: number) {
		pendingY = clientY;
		if (!frame) frame = requestAnimationFrame(applyScroll);
	}

	function onTrackPointerDown(e: PointerEvent) {
		// Гасить сумісні мишачі події, з яких браузер починає виділення. Доріжка
		// притулена до правого краю вікна — саме там вмикається автоскрол виділення,
		// і той далі бореться з кожним нашим scrollTo.
		e.preventDefault();

		const track = e.currentTarget as HTMLElement;
		const rect = track.getBoundingClientRect();
		trackTop = rect.top;
		const localY = e.clientY - trackTop;

		// Натиск по самому повзунку — тягнемо з того місця, за яке взяли.
		// Натиск повз нього — спершу переносимо повзунок під курсор.
		const onThumb = localY >= thumbTop && localY <= thumbTop + thumbHeight;
		grabOffset = onThumb ? localY - thumbTop : thumbHeight / 2;
		dragThumbTop = thumbTop;

		dragging = true;
		// Перед захватом: виняток у ньому не має проглинути початковий стрибок.
		requestScroll(e.clientY);
		try {
			track.setPointerCapture(e.pointerId);
			capturedTrack = track;
			capturedPointerId = e.pointerId;
		} catch {
			// Доріжка завширшки 10px губить курсор від найменшого зсуву вбік, тож
			// жест насправді несе слухач на window.
		}
	}

	function onTrackPointerMove(e: PointerEvent) {
		if (dragging) requestScroll(e.clientY);
	}

	/**
	 * Без аргументу: викликається і з доріжки, і з window, а знімати захват треба з
	 * елемента, який його взяв, а не з випадкової цілі події.
	 */
	function endDrag() {
		if (!dragging) return;
		dragging = false;
		if (frame) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
		if (capturedTrack !== null) {
			try {
				capturedTrack.releasePointerCapture(capturedPointerId);
			} catch {
				// Уже знято — браузером або разом з елементом.
			}
			capturedTrack = null;
		}
	}
</script>

<svelte:window
	bind:innerWidth={windowWidth}
	onpointermove={(e) => {
		// Під час перетягування жест несе саме цей слухач; ширина й так зафіксована
		// на максимумі, тож mouseX не чіпаємо — зайве оновлення стану на кожен рух
		// коштувало б перемальовування. Доріжка завширшки 10px: без цього жест живе
		// лише поки тримається захват і курсор над нею.
		if (dragging) {
			requestScroll(e.clientY);
			return;
		}
		mouseX = e.clientX;
		pointerInside = true;
	}}
	onpointerup={endDrag}
	onpointercancel={endDrag}
	onpointerleave={() => (pointerInside = false)}
/>

<!-- Умова — `enabled`, а не `visible`: елемент лишається змонтованим, поки
     обрано цей режим, і на сторінці без прокрутки просто виїжджає за край.
     Якби він зникав із DOM, анімувати зникнення не було б чого. -->
{#if enabled && !ui.isMenuOpen}
	<!--
		Та сама причина, що в `Minimap`: смуга дублює нативну прокрутку, доступну
		з клавіатури без неї. `role="scrollbar"` потягнув би `aria-valuenow` і
		власне клавіатурне керування — другий механізм прокрутки поруч із наявним.
	-->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="page-scrollbar"
		class:dragging
		class:page-scrollbar--hidden={ui.isMenuOpen || presence.current < 0.01}
		style="width: {width}px; opacity: {presence.current};
			transform: translateX({(1 - presence.current) * width}px);"
		data-testid="page-scrollbar-container"
		oncontextmenu={(e) => {
			// Нативне меню тут ні до чого: копіювати чи зберігати нема чого,
			// а перемкнути режим — саме те, чого хочеться на смузі.
			e.preventDefault();
			scrollbar.openMenu(e.clientX, e.clientY);
		}}
		onpointerdown={onTrackPointerDown}
		onpointermove={onTrackPointerMove}
		onpointerup={endDrag}
		onpointercancel={endDrag}
	>
		<div
			class="page-scrollbar__thumb"
			style="top: {thumbTop}px; height: {thumbHeight}px;"
			data-testid="page-scrollbar-thumb-status"
		></div>
	</div>
{/if}

<style>
	.page-scrollbar {
		position: fixed;
		top: 0;
		right: 0;
		/*
		 * dvh, а не vh: уся арифметика повзунка вище рахується від
		 * `window.innerHeight`, тобто САМЕ від dvh. З `100vh` доріжка була вищою
		 * за власну шкалу на висоту панелі браузера — повзунок доходив лише до
		 * `viewportHeight - thumbHeight`, і нижня смуга доріжки лишалася мертвою:
		 * натиском по ній не можна було перейти в кінець сторінки.
		 */
		height: 100dvh;
		/*
		 * Числом, а не токеном: шкали `--z-*` в цьому проєкті немає, а вигаданий
		 * токен зробив би властивість недійсною — тобто `z-index: auto`, і смуга
		 * пішла б під вміст. Порядок шарів тут: шапка й меню 100–330, смуга,
		 * її власне меню 9500, модалки 9999, галерея 99999.
		 */
		z-index: 400;
		background: color-mix(in srgb, var(--color-sky-blue), transparent 40%);
		/* Та сама тінь, що й у мінімапи: обидві накладки мають однаково
		   відокремлюватися від сторінки. */
		box-shadow: -6px 0 18px rgba(0, 0, 0, 0.22);
		cursor: pointer;
		/* Накладка: сторінка під нею лишається на всю ширину, тож перехід між
		   сторінками з прокруткою і без неї більше нічого не зсуває. */
		touch-action: none;
		/* Успадковується повзунком: натиск на доріжці не має починати виділення, бо
		   біля краю вікна воно вмикає автоскрол браузера. */
		user-select: none;
		-webkit-user-select: none;
	}

	/* Поїхала за край — не перехоплює натиски й не читається читалками. */
	.page-scrollbar--hidden {
		pointer-events: none;
		visibility: hidden;
	}

	.page-scrollbar__thumb {
		position: absolute;
		left: 2px;
		right: 2px;
		/*
		 * Токени палітри as5, а не `--scrollbar-*` з проєкту-джерела: тих тут
		 * немає, і `var()` без них не «дає сірий колір», а прибирає властивість
		 * ЦІЛКОМ — повзунок лишається прозорим.
		 *
		 * Обидва перевертаються разом із темою (`light-dark`), тож видимість
		 * тримається і на світлій, і на темній.
		 */
		/*
		 * У спокої НАПІВПРОЗОРИЙ: смуга — накладка поверх сторінки, і суцільна
		 * пляма при кожній прокрутці перетягує увагу на себе. Під курсором
		 * наливається кольором повністю.
		 *
		 * Прозорість у самому кольорі, а не через `opacity`: `opacity` на цьому
		 * елементі вже зайнята пружиною появи (інлайновий стиль на доріжці), і
		 * друге джерело тієї ж властивості перемножувалося б із першим.
		 */
		background: color-mix(in srgb, var(--color-deep-ocean), transparent 55%);
		border-radius: 999px;
		/* Індикатор, не ціль: натиск мусить долітати до доріжки, яка й веде жест.
		   Інакше натиск по повзунку й повз нього починаються на різних елементах. */
		pointer-events: none;
		/*
		 * Секунда, а не звичні 0.15s: різка зміна кольору під курсором читалася
		 * як блимання. `prefers-reduced-motion` глушить перехід глобальним
		 * правилом у `global.css` — окремого блоку тут не треба.
		 */
		transition: background 1s;
	}

	.page-scrollbar:hover .page-scrollbar__thumb,
	.page-scrollbar.dragging .page-scrollbar__thumb {
		background: var(--color-golden);
	}

	@media print {
		.page-scrollbar {
			display: none;
		}
	}
</style>
