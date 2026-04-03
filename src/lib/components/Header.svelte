<script lang="ts">
	import Logo from "./Logo.svelte";
	import SettingsIcon from "./icons/SettingsIcon.svelte";
	import { Menu, X } from "lucide-svelte";
	import { ui } from "$lib/states/ui.svelte";
	import { t, locale } from "svelte-i18n";
	import { page } from "$app/state";

	let scrolled = $state(false);
	let settingsOpen = $state(false);

	function toggleSettings() {
		settingsOpen = !settingsOpen;
	}

	function toggleTheme() {
		const newTheme = ui.theme === "light" ? "dark" : "light";
		ui.setTheme(newTheme);
	}

	function changeLanguage(lang: string) {
		locale.set(lang);
	}

	const navItems = $derived([
		{ label: $t("nav.home"), href: "/" },
		{ label: $t("nav.about"), href: "/about" },
		{ label: $t("nav.history"), href: "/history" },
		{ label: $t("nav.contests"), href: "/competitions" },
	]);

	$effect(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 20;
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	});
</script>

<header class="header" class:scrolled id="main-header">
	<div class="header__logo-area">
		<a
			href="/"
			class="header__logo-link"
			aria-label="На головну"
			onclick={ui.closeMenu}
		>
			<Logo size="large" />
		</a>
	</div>

	<div class="header__bar">
		<nav class="header__nav" aria-label="Головне меню" id="main-nav">
			<ul class="header__nav-list" class:open={ui.isMenuOpen}>
				{#each navItems as item, i}
					<li class="header__nav-item">
						<a
							href={item.href}
							class="header__nav-link"
							class:active={page.url.pathname === item.href}
							id="nav-{item.href.replace('/', '') || 'home'}"
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<a
			href="/admission"
			class="btn btn-outline header__cta"
			id="header-cta"
		>
			{$t("nav.admission")}
		</a>

		<div class="header__settings" class:open={settingsOpen}>
			<button class="header__settings-btn" aria-label="Налаштування" onclick={toggleSettings} aria-expanded={settingsOpen}>
				<SettingsIcon size={24} />
			</button>
			<div class="header__settings-dropdown">
				<div class="header__settings-group">
					<span class="header__settings-label"
						>{$t("settings.language")}</span
					>
					<div class="header__settings-options">
						<button
							class="header__settings-opt"
							class:active={$locale === "uk"}
							onclick={() => changeLanguage("uk")}>UA</button
						>
						<button
							class="header__settings-opt"
							class:active={$locale === "en"}
							onclick={() => changeLanguage("en")}>EN</button
						>
					</div>
				</div>
				<div class="header__settings-group">
					<span class="header__settings-label"
						>{$t("settings.theme")}</span
					>
					<div class="header__settings-options">
						<button
							class="header__settings-opt"
							class:active={ui.theme === "light"}
							onclick={() => {
								if (ui.theme === "dark") toggleTheme();
							}}>{$t("settings.light")}</button
						>
						<button
							class="header__settings-opt"
							class:active={ui.theme === "dark"}
							onclick={() => {
								if (ui.theme === "light") toggleTheme();
							}}>{$t("settings.dark")}</button
						>
					</div>
				</div>
			</div>
		</div>

		<button
			class="header__burger"
			onclick={() => { settingsOpen = false; ui.toggleMenu(); }}
			aria-label="Відкрити меню"
			aria-expanded={ui.isMenuOpen}
			id="burger-menu"
		>
			<Menu size={24} />
		</button>
	</div>

	<!-- Mobile overlay menu -->
	{#if ui.isMenuOpen}
		<div class="header__mobile-overlay" role="dialog" aria-modal="true">
			<button
				class="header__mobile-close"
				onclick={ui.closeMenu}
				aria-label="Закрити меню"
			>
				<X size={24} />
			</button>
			<nav aria-label="Мобільне меню">
				<ul class="header__mobile-list">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class="header__mobile-link"
								onclick={ui.closeMenu}
							>
								{item.label}
							</a>
						</li>
					{/each}
					<li>
						<a
							href="/admission"
							class="btn btn-primary header__mobile-cta"
							onclick={ui.closeMenu}
						>
							{$t("nav.admission")}
						</a>
					</li>
				</ul>
			</nav>
		</div>
	{/if}
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		align-items: flex-start;
		padding: 0;
		transition: all var(--transition-base);
	}

	/* Logo area — positioned to the left, overlapping like in reference */
	.header__logo-area {
		position: absolute;
		top: 10px;
		left: 30px;
		z-index: 300;
		filter: drop-shadow(0 4px 12px rgba(27, 94, 123, 0.15));
		transition: transform var(--transition-base);
	}

	.header__logo-link {
		display: block;
	}

	.scrolled .header__logo-area {
		transform: scale(0.7);
		top: 2px;
		left: 20px;
	}

	/* Navigation bar */
	.header__bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-xl);
		width: 100%;
		padding: var(--space-lg) var(--space-xl) var(--space-lg) 200px;
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-base);
		position: relative;
	}

	.header__bar::before {
		content: '';
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--color-white), transparent 30%);
		backdrop-filter: blur(12px);
		z-index: -1;
	}

	.scrolled .header__bar {
		padding-top: var(--space-md);
		padding-bottom: var(--space-md);
		box-shadow: var(--shadow-md);
	}

	/* Navigation */
	.header__nav {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.header__nav-list {
		display: flex;
		align-items: center;
		gap: var(--space-2xl);
	}

	.header__nav-link {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-dark-text);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
		position: relative;
	}

	.header__nav-link:hover,
	.header__nav-link.active {
		color: var(--color-sea-blue);
	}

	.header__nav-link.active::after {
		content: "";
		position: absolute;
		bottom: -2px;
		left: var(--space-md);
		right: var(--space-md);
		height: 2px;
		background: var(--color-sea-blue);
		border-radius: 1px;
	}

	/* Settings */
	.header__settings {
		position: relative;
		margin-left: var(--space-sm);
	}

	.header__settings-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-deep-ocean);
		transition: all var(--transition-base);
		background: var(--color-ice-blue);
	}

	.header__settings.open .header__settings-btn {
		background: var(--color-sky-blue);
		transform: rotate(45deg);
	}

	.header__settings-dropdown {
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
		z-index: 310;
	}

	.header__settings.open .header__settings-dropdown {
		opacity: 1;
		visibility: visible;
		transform: translateY(5px);
	}

	.header__settings-group {
		margin-bottom: var(--space-md);
	}

	.header__settings-group:last-child {
		margin-bottom: 0;
	}

	.header__settings-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted-text);
		text-transform: uppercase;
		margin-bottom: var(--space-xs);
		letter-spacing: 0.05em;
	}

	.header__settings-options {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-ice-blue);
		padding: 4px;
		border-radius: var(--radius-md);
	}

	.header__settings-opt {
		flex: 1;
		padding: 6px;
		font-size: 0.8rem;
		font-weight: 700;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		color: var(--color-deep-ocean);
	}

	.header__settings-opt:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.header__settings-opt.active {
		background: var(--color-white);
		box-shadow: var(--shadow-sm);
		color: var(--color-golden);
	}

	/* CTA Button */
	.header__cta {
		font-size: 0.8rem;
		padding: 0.6rem 1.5rem;
	}

	/* Burger */
	.header__burger {
		display: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		align-items: center;
		justify-content: center;
		color: var(--color-deep-ocean);
		background: var(--color-ice-blue);
		transition: all var(--transition-base);
		z-index: 120;
	}

	.header__burger:hover {
		background: var(--color-sky-blue);
	}

	/* Mobile overlay */
	.header__mobile-overlay {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--color-white), transparent 2%);
		backdrop-filter: blur(20px);
		z-index: 350;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.header__mobile-close {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-deep-ocean);
		background: var(--color-ice-blue);
		transition: all var(--transition-base);
		z-index: 110;
		border: none;
		cursor: pointer;
	}

	.header__mobile-close:hover {
		background: var(--color-sky-blue);
		transform: rotate(90deg);
	}

	.header__mobile-list {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
	}

	.header__mobile-link {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-deep-ocean);
		transition: color var(--transition-fast);
	}

	.header__mobile-link:hover {
		color: var(--color-golden);
	}

	.header__mobile-cta {
		margin-top: var(--space-lg);
		font-size: 1rem;
		padding: 1rem 2.5rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.header__bar {
			padding-left: 160px;
		}

		.header__logo-area {
			left: 15px;
		}

		.scrolled .header__logo-area {
			left: 10px;
		}
	}

	@media (max-width: 768px) {
		.header__nav,
		.header__cta {
			display: none;
		}

		.header__burger {
			display: flex;
		}

		.header__bar {
			padding-left: 120px;
			justify-content: flex-end;
		}

		.header__logo-area {
			top: 5px;
			left: 10px;
		}

		.header__logo-area :global(.logo-svg) {
			width: 90px;
			height: 90px;
		}

		.scrolled .header__logo-area {
			transform: scale(0.8);
			top: 0;
		}
	}
</style>
