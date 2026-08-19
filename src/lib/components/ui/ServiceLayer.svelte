<script lang="ts">
	import { dev } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { locale } from 'svelte-i18n';
	import { ui } from '$lib/states/ui.svelte';
	import { acceptsShortcut } from '$lib/services/keyboard';
	import { createKeySequence } from '$lib/services/keySequence';
	import { debugMode } from '$lib/services/debugMode.svelte';
	import { errorLogger } from '$lib/services/errorLogger.svelte';
	import { hardReset, RESET_PRESSES_DEV, RESET_PRESSES_PROD } from '$lib/services/resetService';
	import ServiceBadge from './ServiceBadge.svelte';

	/**
	 * Службовий шар: гарячі клавіші сайту (`T` тема, `L` мова, `B` тло, `Esc` закрити),
	 * службові серії `V` і `R` та саме табло версії (HOTKEYS-v8 § 1.1, § 4).
	 *
	 * **Двоє в одному компоненті, бо в них спільна вимога до РОЗМІЩЕННЯ.** І слухач
	 * клавіатури, і табло мусять жити поза `ErrorBoundary`: межа при падінні замінює
	 * дітей своєю сторінкою, тобто забрала б і те, чим збирають звіт про це падіння.
	 * Два окремих кріплення в layout виражали б ту саму вимогу двічі.
	 *
	 * **Власної розмітки, крім табла, немає.** Компонент існує ще й щоб тримати слухач
	 * на вікні, чий час життя дорівнює часу життя застосунку — це єдине, чого не може
	 * звичайний модуль.
	 *
	 * **Чому не в шапці, де це почалося.** Усе, що ці клавіші перемикають, живе в
	 * `ui`: тема, мова, тип тла й — після переїзду — стан випадайки налаштувань. Від
	 * шапки не потрібно нічого, а тримати обробник там означало тримати другий
	 * власник правил у файлі, який і без того найбільший у проєкті.
	 *
	 * **`T` і `L` ПЕРЕМИКАЮТЬ, а не відкривають список** — бо тем тут дві й мов дві.
	 * Список із двох пунктів, який відкривають клавішею, щоб вибрати другий, — це два
	 * натискання замість одного.
	 *
	 * **`B` іде по колу чотирьох типів тла**, і нуль у цьому колі означає «без тла» —
	 * тобто клавіша заодно вміє його вимкнути.
	 *
	 * **Усі три вимикаються** перемикачем «гарячі клавіші» в налаштуваннях шапки
	 * (`ui.hotkeysEnabled`) — це виконання WCAG SC 2.1.4, див. обробник нижче.
	 */
	const BACKGROUNDS = [0, 1, 2, 3] as const;

	function cycleBackground() {
		const next = BACKGROUNDS[(BACKGROUNDS.indexOf(ui.backgroundType) + 1) % BACKGROUNDS.length];
		ui.setBackgroundType(next);
		// «Немає тла» — це не четвертий тип, а вимкнений перемикач: тип і прапорець
		// живуть окремо, тому їх доводиться зводити тут, як і в DebugSettingsDropdown.
		if (next === 0 && ui.enableDynamicBackground) ui.toggleDynamicBackground();
		if (next !== 0 && !ui.enableDynamicBackground) ui.toggleDynamicBackground();
	}

	/**
	 * Серія `V` ПЕРЕМИКАЄ табло, і поріг залежить від напрямку: показати в проді
	 * коштує 55 натискань, сховати — 5 (`debugMode.svelte.ts`). Тому функція, а не
	 * число: перестворювати послідовність на кожну зміну стану означало б губити
	 * половину набраної серії.
	 */
	const versionSequence = createKeySequence({
		code: 'KeyV',
		threshold: () => debugMode.pressesToToggle,
		onComplete: () => debugMode.toggle()
	});

	/**
	 * Серія `R` — аварійне скидання. У проді `hardReset(true)` питає підтвердження:
	 * разом із порогом у 55 це два незалежні барʼєри перед знищенням налаштувань.
	 */
	const resetSequence = createKeySequence({
		code: 'KeyR',
		threshold: dev ? RESET_PRESSES_DEV : RESET_PRESSES_PROD,
		onComplete: () => void hardReset(!dev)
	});

	/**
	 * Сітка безпеки над помилками (ERROR-HANDLING-v8 § 5) — тут, поруч із таблом,
	 * яке їх рахує. `hooks.client.ts` ловить лише те, що веде сам SvelteKit:
	 * рендер, навігацію, `load`. Виняток із `onclick`, із таймера й будь-яке
	 * неперехоплене відхилення промісу летіли повз нього, тобто повз кеш і повз
	 * лічильник на екрані.
	 *
	 * `$effect`, а не `onMount`: він сам віддає прибирання, і слухачі живуть
	 * рівно стільки, скільки компонент — а той монтується один раз у layout.
	 */
	$effect(() => errorLogger.installGlobalHandlers());

	onDestroy(() => {
		versionSequence.reset();
		resetSequence.reset();
	});

	function handleKeydown(event: KeyboardEvent) {
		/*
		 * Службові жести — першими, і вони отримують КОЖНУ подію, включно з тією, що
		 * завершила сусідню серію: інакше `V` не скидала б набране в `R`. Власні
		 * захисти (автоповтор, поля вводу, вікно, модифікатори) у них свої.
		 *
		 * Захоплення клавіатури на них НЕ діє, і це навмисно: `V` і `R` зарезервовані
		 * в усіх проєктах під службові жести, тож жодна накладка їх не займає — у
		 * розкладці піаніно їх немає. Табло має відкриватися й тоді, коли на екрані
		 * стоїть модалка, — саме тоді воно найпотрібніше.
		 */
		versionSequence.handle(event);
		resetSequence.handle(event);

		// Поки піаніно відкрите, літери належать йому: `T` там нота `F#`, `L` — `D`.
		if (!acceptsShortcut(event)) return;

		/*
		 * WCAG SC 2.1.4 Character Key Shortcuts, рівень A (HOTKEYS-v8 § 3): одиночне
		 * літерне скорочення мусить мати спосіб вимкнути, перепризначити або діяти
		 * лише у фокусі. Тут обрано перше — перемикач у налаштуваннях шапки.
		 *
		 * `Escape` виведено з-під нього навмисно: критерій говорить про клавіші-СИМВОЛИ,
		 * а `Escape` до них не належить. Забрати його разом з рештою означало б лишити
		 * людину в мобільному меню без клавіатурного виходу — тобто виконати § 3 HOTKEYS
		 * ціною § 6 ACCESSIBILITY.
		 */
		if (event.code !== 'Escape' && !ui.hotkeysEnabled) return;

		if (event.code === 'Escape' && (ui.isSettingsOpen || ui.isMenuOpen)) {
			ui.closeSettings();
			ui.closeMenu();
		} else if (event.code === 'KeyT') ui.setTheme(ui.theme === 'light' ? 'dark' : 'light');
		// `get(locale)`, а не `$locale`: підписка тут не потрібна — значення читається
		// в момент натискання, і `$`-форма змусила б компонент перемальовуватися на
		// кожну зміну мови заради обробника, який нічого не малює.
		else if (event.code === 'KeyL') ui.setLanguage(get(locale) === 'uk' ? 'en' : 'uk');
		else if (event.code === 'KeyB') cycleBackground();
		else return;

		// `preventDefault` лише після того, як дія відбулася (HOTKEYS-v8 § 2.4).
		event.preventDefault();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<ServiceBadge />
