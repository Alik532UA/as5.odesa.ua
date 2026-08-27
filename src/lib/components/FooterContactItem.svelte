<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Один контакт підвалу: іконка + посилання.
	 *
	 * ## Чому окремий компонент
	 *
	 * Три контакти були трьома копіями тієї самої розмітки, і копії вже почали
	 * розходитися: адреса лежала прямо в `.footer__info-item`, телефон і пошта —
	 * ще й у зайвому `<div>`. Ціна такої трійки не в довжині: правило WCAG про
	 * розмір цілі довелося б писати тричі, а забути в одному місці — один раз.
	 *
	 * Разом із розміткою сюди переїхали і її стилі: скоуп Svelte до дочірнього
	 * компонента не дістає, а попередження про це не буває (SVELTE-UI-v8 § 3.5).
	 *
	 * ## Чому іконка — сніпет, а не пропс-компонент
	 *
	 * Сніпети — канонічна форма композиції у Svelte 5 (SVELTE-UI-v8): тип
	 * перевіряється, і виклик лишається звичайним `{@render}`, а не окремим
	 * механізмом підстановки компонента.
	 */
	let {
		href,
		label,
		icon,
		external = false
	}: {
		href: string;
		label: string;
		icon: Snippet;
		/** Зовнішня адреса відкривається в новій вкладці з `rel="noopener"`. */
		external?: boolean;
	} = $props();
</script>

<div class="footer__info-item">
	{@render icon()}
	<!-- `resolve()` тут не застосовний за побудовою: сюди приходять `tel:`,
		 `mailto:` і зовнішня `https:` — жодна з них не маршрут цього сайту, а
		 `resolve()` зрізав би схему. Це та сама межа правила, що вже описана в
		 `FooterSection.svelte` для «Замовити сайт».

		 `href` стоїть на рядку `<a` навмисно: правило звітує про рядок
		 АТРИБУТА, і перенесений вниз `href` лишився б поза дією придушення
		 (AI-AGENT-PITFALLS-v8 § 5.7). -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href}
		class="footer__link"
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
	>
		{label}
	</a>
</div>

<style>
	.footer__info-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.8rem;
		color: var(--color-body-text);
		white-space: nowrap;
	}

	/*
	 * WCAG 2.2 SC 2.5.8 (Target Size Minimum, рівень AA): ціль не менша за
	 * 24×24 CSS px. Заміряно в браузері 2026-08-28 — усі три контакти підвалу,
	 * тобто КОЖНА сторінка сайту:
	 *
	 *     адреса  264×19    телефон 110×14    пошта 145×14
	 *
	 * Виняток «ціль у реченні» тут не діє: це не слова в абзаці, а самостійні
	 * рядки з іконкою. Висота бралася від рядка тексту, тож `font-size: 0.8rem`
	 * одразу давав порушення — і жоден гейт його не бачив: `PROJECT-CONTEXT.md`
	 * доти відносив розмір цілей до ручного пункта `common_8`.
	 *
	 * Текст не змінюється — росте лише сама ціль. На дотику канон вимагає 44×44
	 * (UI-ELEMENTS-v8 § 1), і `pointer: coarse` — саме та ознака: мишею зайва
	 * висота нічого не дає, а рядки підвалу розсунула б помітно.
	 */
	.footer__link {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		transition: color var(--transition-fast);
	}

	@media (pointer: coarse) {
		.footer__link {
			min-height: 44px;
		}
	}

	.footer__link:hover {
		color: var(--color-deep-ocean);
	}

	@media (max-width: 1200px) {
		.footer__info-item {
			font-size: 0.75rem;
		}
	}
</style>
