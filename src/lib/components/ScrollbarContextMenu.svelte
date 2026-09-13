<script lang="ts">
	import { scrollbar } from '$lib/states/scrollbar.svelte';
	import { ui } from '$lib/states/ui.svelte';
	import { SCROLLBAR_MODES, type ScrollbarMode } from '$lib/config/scrollbarModes';
	import { t } from 'svelte-i18n';

	/**
	 * Меню вибору режиму смуги на праву кнопку (SCROLLBAR § 7).
	 *
	 * Живе в КОРЕНІ, а не всередині смуги: меню одне на всі режими, а смуга після
	 * перемикання зникає — разом із меню, просто в мить, коли по ньому клікнули.
	 */

	/** Ширина й висота потрібні, щоб меню не вилазило за край екрана. */
	const WIDTH = 210;
	const ITEM_HEIGHT = 34;
	const PADDING = 12;

	const height = $derived(SCROLLBAR_MODES.length * ITEM_HEIGHT + PADDING * 2 + 24);

	/** Меню відкривається біля курсора, але цілком у межах вікна. */
	const position = $derived.by(() => {
		const { x, y } = scrollbar.menu;
		return {
			// Ліворуч від курсора: смуга притулена до правого краю, і меню
			// праворуч від неї просто не влізло б.
			left: Math.max(PADDING, x - WIDTH - 4),
			top:
				typeof window === 'undefined'
					? y
					: Math.min(Math.max(PADDING, y), window.innerHeight - height - PADDING)
		};
	});

	/** Смуга завширшки в цю зону біля правого краю ловить праву кнопку. */
	const EDGE_PX = 20;

	/**
	 * У режимі `standard` смугу малює браузер, і подій із неї сторінка не
	 * отримує: клік правою просто над нею дає системне меню, і змінити це
	 * неможливо.
	 *
	 * Прозорий елемент поверх неї — гірше рішення, ніж виглядає: він перекрив би
	 * саму смугу, і її стало б не можна ані тягнути, ані клацнути. Тому слухаємо
	 * подію на вікні й дивимося на координату.
	 */
	function onDocumentContextMenu(e: MouseEvent) {
		if (scrollbar.active !== 'native') return;
		// `clientWidth`, а не `innerWidth`: перший не включає нативну смугу, тож
		// зона не залежить від її товщини в системі.
		const edge = document.documentElement.clientWidth;
		if (e.clientX < edge - EDGE_PX || e.clientX > edge) return;
		e.preventDefault();
		scrollbar.openMenu(e.clientX, e.clientY);
	}

	function choose(mode: ScrollbarMode) {
		ui.setScrollbarMode(mode);
		scrollbar.closeMenu();
	}
</script>

<svelte:window oncontextmenu={onDocumentContextMenu} />

{#if scrollbar.menu.open}
	<!-- Тло: перехоплює будь-який натиск поза меню й закриває його. Права кнопка
	     теж закриває, інакше нативне меню з'явилося б поверх нашого. -->
	<div
		class="scrollbar-menu__backdrop"
		data-testid="scrollbar-menu-backdrop"
		role="presentation"
		onpointerdown={scrollbar.closeMenu}
		oncontextmenu={(e) => {
			e.preventDefault();
			scrollbar.closeMenu();
		}}
	></div>

	<div
		class="scrollbar-menu"
		style="left: {position.left}px; top: {position.top}px; width: {WIDTH}px;"
		role="menu"
		tabindex="-1"
		data-testid="scrollbar-context-menu"
		onkeydown={(e) => {
			if (e.key === 'Escape') scrollbar.closeMenu();
		}}
	>
		<span class="scrollbar-menu__title">{$t('settings.scrollbar')}</span>
		{#each SCROLLBAR_MODES as mode (mode.id)}
			<!-- `menuitemradio` з `aria-checked`, а не просто `menuitem`: варіанти
			     взаємовиключні, і читалка мусить сказати, який обраний. -->
			<button
				type="button"
				class="scrollbar-menu__item"
				class:active={ui.scrollbarMode === mode.id}
				role="menuitemradio"
				aria-checked={ui.scrollbarMode === mode.id}
				onclick={() => choose(mode.id)}
				data-testid="scrollbar-menu-{mode.id}-btn"
			>
				{$t(mode.key)}
			</button>
		{/each}
	</div>
{/if}

<style>
	/* Нижче заставки й модалок: меню ніколи не відкрите одночасно з ними. */
	.scrollbar-menu__backdrop {
		position: fixed;
		inset: 0;
		z-index: 9500;
	}

	.scrollbar-menu {
		position: fixed;
		z-index: 9501;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 8px;
		border-radius: var(--radius-lg);
		background: var(--color-white);
		border: 1px solid var(--color-sky-blue);
		box-shadow: var(--shadow-lg);
	}

	.scrollbar-menu__title {
		padding: 2px 10px 8px;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-body-text);
	}

	.scrollbar-menu__item {
		padding: 0.45rem 0.75rem;
		border: none;
		border-radius: var(--radius-md);
		background: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-dark-text);
		text-align: left;
		transition: background var(--transition-fast);
	}

	.scrollbar-menu__item:hover,
	.scrollbar-menu__item:focus-visible {
		background: var(--color-light-blue);
	}

	/* Обраний — суцільним акцентом: пара `--color-deep-ocean` + `--color-white`
	   тримає контраст в обох темах, бо обидва токени перевертаються разом. */
	.scrollbar-menu__item.active {
		background: var(--color-deep-ocean);
		color: var(--color-white);
	}
</style>
