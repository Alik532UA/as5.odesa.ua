<script lang="ts">
	import DebugSettingsDropdown from "./DebugSettingsDropdown.svelte";
	import { ui } from "$lib/states/ui.svelte";
	import { t, locale } from "svelte-i18n";

	/**
	 * Панель налаштувань шапки: мова, тема — і діагностична частина поруч.
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
	 */
	let { isOpen = false }: { isOpen?: boolean } = $props();

	function toggleTheme() {
		const newTheme = ui.theme === "light" ? "dark" : "light";
		ui.setTheme(newTheme);
	}
</script>

<div class="settings-panel" class:open={isOpen} data-testid="header-settings-panel">
	<!-- `aria-pressed`: стан кнопки жив лише в класі `active`, тобто в кольорі — читалка
	     озвучувала два однакові перемикачі й жодного активного. `aria-keyshortcuts` про
	     скорочення лише ПОВІДОМЛЯЄ (HOTKEYS-v8 § 5) і зникає разом із ним. -->
	<div class="settings-panel__group">
		<span class="settings-panel__label">{$t("settings.language")}</span>
		<div class="settings-panel__options">
			<button
				class="settings-panel__opt"
				class:active={$locale === "uk"}
				aria-pressed={$locale === "uk"}
				aria-keyshortcuts={ui.hotkeysEnabled ? "L" : undefined}
				data-testid="settings-lang-uk-btn"
				onclick={() => ui.setLanguage("uk")}>UA</button
			>
			<button
				class="settings-panel__opt"
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
				class="settings-panel__opt"
				class:active={ui.theme === "light"}
				aria-pressed={ui.theme === "light"}
				aria-keyshortcuts={ui.hotkeysEnabled ? "T" : undefined}
				data-testid="settings-theme-light-btn"
				onclick={() => {
					if (ui.theme === "dark") toggleTheme();
				}}>{$t("settings.light")}</button
			>
			<button
				class="settings-panel__opt"
				class:active={ui.theme === "dark"}
				aria-pressed={ui.theme === "dark"}
				aria-keyshortcuts={ui.hotkeysEnabled ? "T" : undefined}
				data-testid="settings-theme-dark-btn"
				onclick={() => {
					if (ui.theme === "light") toggleTheme();
				}}>{$t("settings.dark")}</button
			>
		</div>
	</div>
</div>

<DebugSettingsDropdown {isOpen} />

<style>
	.settings-panel {
		position: absolute;
		top: 100%;
		right: 0;
		width: 220px;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: var(--space-md);
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		transition: all var(--transition-base);
		z-index: 330;
	}

	.settings-panel.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(5px);
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
</style>
