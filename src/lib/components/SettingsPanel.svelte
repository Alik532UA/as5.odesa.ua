<script lang="ts">
	import DebugSettingsDropdown from "./DebugSettingsDropdown.svelte";
	import { anchoredPanel } from "$lib/actions/anchoredPanel";
	import { ui } from "$lib/states/ui.svelte";
	import { t, locale } from "svelte-i18n";

	/**
	 * Панель налаштувань шапки: мова, тема — і діагностична картка поруч.
	 *
	 * ## Чому вона поїхала з `HeaderSection.svelte`
	 *
	 * Розмітка панелі й сімдесят рядків її стилів лежали в шапці, а видимістю
	 * керувало правило `.header__settings.open .header__settings-dropdown`, тобто
	 * СТАН БАТЬКА через CSS. Рівно те, що `DebugSettingsDropdown` уже одного разу
	 * розібрав у себе (SVELTE-UI-v8 § 3.5): панель не можна було показати ніде,
	 * крім тієї конкретної шапки, а `HeaderSection` тримав чотири
	 * відповідальності замість однієї й на 110 SLOC перевищував межу
	 * PROJECT-STRUCTURE-v8 § 7.
	 *
	 * Відкриття тепер виражає проп, а не селектор через батька, — і панель стала
	 * тим, чим виглядала: самостійним компонентом зі своїми стилями.
	 *
	 * ## Чому дві картки лежать в одному контейнері
	 *
	 * Доти їх було дві незалежні `position: absolute`-панелі, і друга ставала на
	 * місце числом: `top: calc(100% + 170px)`, де 170 — виміряна колись висота
	 * першої (насправді 166). Отже кожен доданий рядок у верхню картку залазив
	 * під нижню, і побачити це можна було лише очима.
	 *
	 * Тепер позиціонується сам контейнер, а картки лежать у ньому потоком. Разом
	 * із `max-height` це й робить стек досяжним на короткому вікні: 544 px панелі
	 * не вміщаються в телефон у ландшафті ЖОДНИМ розміщенням — їх можна лише
	 * прокрутити (FLUID-SIZING-v8 § 4 і § 5, `$lib/actions/anchoredPanel`).
	 */
	let { isOpen = false }: { isOpen?: boolean } = $props();

	function toggleTheme() {
		const newTheme = ui.theme === "light" ? "dark" : "light";
		ui.setTheme(newTheme);
	}

	/**
	 * Наведення на кнопку теми ПОКАЗУЄ цю тему на всій сторінці, поки курсор там
	 * (THEME-SWITCHER § 3). Підпис каже назву, сторінка — усі кольори; вибір
	 * стає видимим до кліку.
	 *
	 * ТІЛЬКИ МИША. `pointerenter` приходить і від тапу, а `pointerleave` на
	 * дотику — ні: тема застрягла б показаною, доки людина не торкнеться чогось
	 * іншого. Клавіатура має свій шлях — `T` перемикає тему по-справжньому.
	 */
	function previewOn(t: "light" | "dark", e: PointerEvent) {
		if (e.pointerType === "mouse") ui.previewTheme(t);
	}

	function previewOff(e: PointerEvent) {
		if (e.pointerType === "mouse") ui.previewTheme(null);
	}

	/*
	 * Панель зникає разом із курсором на ній — її закривають клавішею або кліком
	 * поза нею. `pointerleave` тоді не приходить, і сторінка лишилася б у
	 * показаній темі назавжди.
	 */
	$effect(() => () => ui.previewTheme(null));
</script>

<div
	class="settings-panel"
	class:open={isOpen}
	use:anchoredPanel={{ open: isOpen }}
	data-testid="header-settings-panel"
>
	<div class="settings-panel__card">
		<!-- `aria-pressed`: стан кнопки жив лише в класі `active`, тобто в кольорі — читалка
		     озвучувала два однакові перемикачі й жодного активного. `aria-keyshortcuts` про
		     скорочення лише ПОВІДОМЛЯЄ (HOTKEYS-v8 § 5) і зникає разом із ним. -->
		<div class="settings-panel__group">
			<span class="settings-panel__label">{$t("settings.language")}</span>
			<div class="settings-panel__options">
				<button
					class="settings-panel__opt touch-target"
					class:active={$locale === "uk"}
					aria-pressed={$locale === "uk"}
					aria-keyshortcuts={ui.hotkeysEnabled ? "L" : undefined}
					data-testid="settings-lang-uk-btn"
					onclick={() => ui.setLanguage("uk")}>UA</button
				>
				<button
					class="settings-panel__opt touch-target"
					class:active={$locale === "en"}
					aria-pressed={$locale === "en"}
					aria-keyshortcuts={ui.hotkeysEnabled ? "L" : undefined}
					data-testid="settings-lang-en-btn"
					onclick={() => ui.setLanguage("en")}>EN</button
				>
			</div>
		</div>
		<div class="settings-panel__group">
			<span class="settings-panel__label">{$t("settings.theme")}</span>
			<div class="settings-panel__options">
				<button
					class="settings-panel__opt settings-panel__theme touch-target"
					class:active={ui.theme === "light"}
					aria-pressed={ui.theme === "light"}
					aria-keyshortcuts={ui.hotkeysEnabled ? "T" : undefined}
					data-theme-key="light"
					data-testid="settings-theme-light-btn"
					onpointerenter={(e) => previewOn("light", e)}
					onpointerleave={previewOff}
					onclick={() => {
						if (ui.theme === "dark") toggleTheme();
					}}>{$t("settings.light")}</button
				>
				<button
					class="settings-panel__opt settings-panel__theme touch-target"
					class:active={ui.theme === "dark"}
					aria-pressed={ui.theme === "dark"}
					aria-keyshortcuts={ui.hotkeysEnabled ? "T" : undefined}
					data-theme-key="dark"
					data-testid="settings-theme-dark-btn"
					onpointerenter={(e) => previewOn("dark", e)}
					onpointerleave={previewOff}
					onclick={() => {
						if (ui.theme === "light") toggleTheme();
					}}>{$t("settings.dark")}</button
				>
			</div>
		</div>
	</div>

	<DebugSettingsDropdown />
</div>

<style>
	.settings-panel {
		/*
		 * Типові значення, доки дія не виміряла: пререндер і вимкнений JS мусять
		 * давати робочу панель, а не порожнє `var()`.
		 */
		--panel-shift-x: 0px;
		--panel-max-height: 100dvh;

		position: absolute;
		top: 100%;
		right: var(--panel-shift-x);
		/*
		 * Ширина, вужча за вікно із зазорами. Без цього повернути панель у межі
		 * не можна В ПРИНЦИПІ: 220 px не вміщаються у 216 px, які лишає шапка на
		 * екрані 320 px, і зсув лише переносив би обрізаний бік з одного на інший.
		 */
		width: min(220px, calc(100dvw - 2 * var(--space-sm)));
		max-height: var(--panel-max-height);
		/*
		 * Страховка, а не механізм (FLUID-SIZING-v8 § 4): 544 px двох карток не
		 * вміщаються в телефон у ландшафті нічим, тож прокрутка тут — єдиний
		 * спосіб дістатися нижньої. Зайвий бік `overflow-x` неминучий: браузер не
		 * дає лишити одну вісь `visible`, коли друга — ні.
		 */
		overflow-y: auto;
		/* Тіні карток малюються ЗА їхнім боксом, а контейнер із overflow їх зріже. */
		padding: 4px;
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		/*
		 * Перелічені властивості, а не `all`: `right` і `max-height` тепер пише
		 * дія, і під `all` кожен її замір їхав би анімацією.
		 */
		transition:
			opacity var(--transition-base),
			visibility var(--transition-base),
			transform var(--transition-base);
		z-index: 330;
	}

	.settings-panel.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(5px);
	}

	.settings-panel__card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: var(--space-md);
	}

	.settings-panel__group {
		margin-bottom: var(--space-md);
	}

	.settings-panel__group:last-child {
		margin-bottom: 0;
	}

	.settings-panel__label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted-text);
		text-transform: uppercase;
		margin-bottom: var(--space-xs);
		letter-spacing: 0.05em;
	}

	.settings-panel__options {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-ice-blue);
		padding: 4px;
		border-radius: var(--radius-md);
	}

	.settings-panel__opt {
		/* Підпис лишається по центру, коли на дотику ціль виростає до 44 px. */
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 6px;
		font-size: 0.8rem;
		font-weight: 700;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		color: var(--color-deep-ocean);
	}

	.settings-panel__opt:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.settings-panel__opt.active {
		background: var(--color-white);
		box-shadow: var(--shadow-sm);
		color: var(--color-golden);
	}

	/*
	 * КНОПКА ТЕМИ ПОКАЗУЄ СВОЮ ТЕМУ, а не поточну (THEME-SWITCHER § 4).
	 *
	 * Значення взяті з `styles/themes/light.css`: перший аргумент `light-dark()`
	 * — світле, другий — темне. Стоять ЛІТЕРАЛАМИ навмисно: кнопка теми `dark`
	 * мусить лишатися темною й у світлій темі, тобто саме тут токени не діють —
	 * інакше обидві кнопки знову були б однакові.
	 *
	 * Подвійний клас (`__opt.__theme`, вага 0,2,0) — щоб `__opt:hover` і
	 * `__opt.active` вище не перефарбовували кнопку акцентом ПОТОЧНОЇ теми
	 * (§ 4.2). За рівної ваги виграло б те правило, що стоїть пізніше.
	 *
	 * Контраст (WCAG AA): спокій 11,9:1 і 15,4:1; наведення 5,8:1 (#1a3a4a на
	 * #f5a623) і 8,9:1 (#0a1622 на #f5a623).
	 */
	.settings-panel__opt.settings-panel__theme {
		border: 1px solid var(--color-golden);
	}

	/* Обрана лишається СВОЇХ кольорів — інакше обрана тема єдина перестала б
	   показувати себе. Вибір позначає обведення, а не заливка. */
	.settings-panel__opt.settings-panel__theme.active {
		box-shadow: 0 0 0 2px var(--color-golden);
	}

	.settings-panel__opt.settings-panel__theme[data-theme-key="light"] {
		background: #f5fafd;
		color: #1a3a4a;
	}

	.settings-panel__opt.settings-panel__theme[data-theme-key="light"]:hover,
	.settings-panel__opt.settings-panel__theme[data-theme-key="light"]:focus-visible {
		background: #f5a623;
		color: #1a3a4a;
	}

	.settings-panel__opt.settings-panel__theme[data-theme-key="dark"] {
		background: #0a1622;
		color: #eaf6fb;
	}

	.settings-panel__opt.settings-panel__theme[data-theme-key="dark"]:hover,
	.settings-panel__opt.settings-panel__theme[data-theme-key="dark"]:focus-visible {
		background: #f5a623;
		color: #0a1622;
	}
</style>
