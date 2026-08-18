<script lang="ts">
	import { fly } from "svelte/transition";
	import { cubicInOut } from "svelte/easing";
	import { X } from "lucide-svelte";
	import { t } from "svelte-i18n";
	import { resolve } from "$app/paths";
	import { focusTrap } from "$lib/actions/focusTrap";
	import type { NavItem } from "$lib/config/nav";

	/**
	 * Мобільне меню на весь екран.
	 *
	 * Винесене з `HeaderSection.svelte` разом зі своїми стилями — саме разом
	 * (SVELTE-UI-v8 § 3.5). Шапка тримала чотири відповідальності в одному
	 * файлі й через це стояла в списку перевищень розміру `structure.test.ts`;
	 * меню — найбільша з них і найменш повʼязана з рештою.
	 *
	 * `scrolled` приходить пропом, а не читається з чужого DOM. Правило було
	 * `.header.scrolled .header__mobile-close`, тобто вигляд кнопки залежав від
	 * класу на батьківському елементі; у дочірньому компоненті це зажадало б
	 * `:global`, і компонент неможливо було б показати ніде, крім тієї шапки.
	 */
	interface Props {
		/** Пункти меню з уже перекладеними підписами. */
		items: (NavItem & { label: string })[];
		/** Чи активний поточний пункт — рахує батько за `page.route.id`. */
		isActive: (routeId: string) => boolean;
		/** Стан шапки: прокручена сторінка підтягує кнопку закриття вгору. */
		scrolled?: boolean;
		onClose: () => void;
	}

	let { items, isActive, scrolled = false, onClose }: Props = $props();

	/**
	 * Escape закриває меню. Доти виходом були лише хрестик і перехід за
	 * посиланням: `role="dialog"` був, а способу вийти з клавіатури — не було
	 * (ACCESSIBILITY-v8 § 6).
	 */
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- `use:focusTrap` + `tabindex="-1"`: `aria-modal="true"` ОБІЦЯЄ читалці, що
     поза меню зараз нічого немає, і без утримання фокусу Tab виходив із нього
     у шапку й далі по сторінці, якої не видно під оверлеєм. -->
<div
	class="mobile-menu"
	role="dialog"
	aria-modal="true"
	aria-label={$t("a11y.mobileMenu")}
	tabindex="-1"
	data-testid="mobile-menu-modal"
	use:focusTrap
	in:fly={{ y: -24, duration: 260, opacity: 0.2, easing: cubicInOut }}
	out:fly={{ y: -24, duration: 220, opacity: 0.2, easing: cubicInOut }}
>
	<button
		type="button"
		class="mobile-menu__close"
		class:scrolled
		onclick={onClose}
		aria-label={$t("a11y.closeMenu")}
		data-testid="mobile-menu-close-btn"
	>
		<X size={24} aria-hidden="true" />
	</button>
	<nav aria-label={$t("a11y.mobileMenu")}>
		<ul class="mobile-menu__list" data-testid="mobile-menu-list">
			{#each items as item (item.key)}
				<li>
					<a
						href={item.href}
						class="mobile-menu__link"
						class:active={isActive(item.routeId)}
						aria-current={isActive(item.routeId) ? "page" : undefined}
						onclick={onClose}
						data-testid="mobile-nav-{item.key}-link"
					>
						{item.label}
					</a>
				</li>
			{/each}
			<li>
				<a
					href={resolve("/admission")}
					class="btn btn-primary mobile-menu__cta"
					onclick={onClose}
					data-testid="mobile-nav-admission-link"
				>
					{$t("nav.admission")}
				</a>
			</li>
		</ul>
	</nav>
</div>

<style>
	.mobile-menu {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--color-white), transparent 2%);
		backdrop-filter: blur(20px);
		z-index: 250;
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform, opacity;
	}

	.mobile-menu__close {
		position: fixed;
		top: var(--space-lg);
		right: var(--space-xl);
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

	.mobile-menu__close.scrolled {
		top: var(--space-md);
	}

	.mobile-menu__close:hover {
		background: var(--color-sky-blue);
		transform: rotate(90deg);
	}

	.mobile-menu__list {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
	}

	.mobile-menu__link {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-deep-ocean);
		transition: color var(--transition-fast);
	}

	.mobile-menu__link:hover {
		color: var(--color-golden);
	}

	/* Поточна сторінка. Позначки не було зовсім: у десктопному меню `.active`
	   малює підкреслення, а мобільне лишалося рівним списком. */
	.mobile-menu__link.active {
		color: var(--color-sea-blue);
		text-decoration: underline;
		text-underline-offset: 6px;
	}

	.mobile-menu__cta {
		margin-top: var(--space-lg);
		font-size: 1rem;
		padding: 1rem 2.5rem;
	}
</style>
