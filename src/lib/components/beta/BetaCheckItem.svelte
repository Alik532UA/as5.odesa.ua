<script lang="ts">
	import { t, locale } from 'svelte-i18n';
	import { betaChecklist } from '$lib/states/betaChecklist.svelte';
	import type { BetaCheck, Vote } from '$lib/config/beta';

	/**
	 * Один пункт чеклиста з чотирма станами відповіді.
	 *
	 * Стан позначається НЕ лише кольором (ACCESSIBILITY-v8): у нього є рамка,
	 * її товщина, накреслення тексту й `aria-pressed` на кнопці. Той, хто не
	 * розрізняє кольори, і той, хто слухає читалку, отримують ту саму
	 * інформацію, що й решта.
	 */
	interface Props {
		check: BetaCheck;
		/** Номер малює список із ПОЗИЦІЇ. Вписаний у текст, він розійшовся б із нею на першій же вставці. */
		position: number;
	}

	let { check, position }: Props = $props();

	const VOTES: { vote: Vote; key: string }[] = [
		{ vote: 'fail', key: 'beta.vote.fail' },
		{ vote: 'weird', key: 'beta.vote.weird' },
		{ vote: 'ok', key: 'beta.vote.ok' }
	];

	const mark = $derived(betaChecklist.markOf(check.id));
	const stale = $derived(betaChecklist.isStale(check.id));
	// Тексти пунктів живуть у даних, а не у словнику інтерфейсу: їх десятки, і
	// вони змінюються іншим циклом. Решта мов бачить англійський.
	const uk = $derived($locale === 'uk');
	const text = $derived(uk ? check.text.uk : check.text.en);
	const category = $derived(uk ? check.category.uk : check.category.en);

	/**
	 * Локатор бере `id` пункта в kebab-case (§ 5.6, `BETA-LOCATOR-PER-CHECK`).
	 *
	 * Доти `check.id` підставлявся ЯК Є, і `common_1` давав
	 * `beta-check-common_1-item` — назву, яку TESTID-AND-NAMING § 1.2 забороняє.
	 * Обидва правила стояли в каноні, і не падало жодне: за форму `id` і за
	 * форму локатора відповідали різні перевірки, а перехід одного в друге не
	 * дивився ніхто. Заміна `_` → `-` однозначна в обидва боки, тож локатор
	 * лишається ПОХІДНИМ від `id`, а не другим іменем, яке треба узгоджувати.
	 */
	const tid = $derived(check.id.replace(/_/g, '-'));
</script>

<li
	class="beta-item"
	class:beta-item--fail={mark?.vote === 'fail'}
	class:beta-item--weird={mark?.vote === 'weird'}
	class:beta-item--ok={mark?.vote === 'ok'}
	class:beta-item--stale={stale}
	data-testid="beta-check-{tid}-item"
>
	<!--
		РОЗДІЛ УСЕРЕДИНІ ВКЛАДКИ (§ 2.4).

		Доти категорії не було зовсім, і вкладка «Спільне для сайту» показувала
		двадцять один пункт суцільним стовпцем: тема, клавіатура, шрифт, смуга
		прокрутки й читалка — усе поряд, без жодного шва.
	-->
	<p class="beta-item__category" data-testid="beta-check-{tid}-category-text">{category}</p>

	<p class="beta-item__text" data-testid="beta-check-{tid}-text">
		<span class="beta-item__num">{position}.</span>
		{text}
		{#if check.negative}
			<span class="beta-item__flag">{$t('beta.negative')}</span>
		{/if}
	</p>

	<!--
		Назва тесту під покритим пунктом (§ 8.7): коли тут щось ламається, видно,
		ЯКИЙ САМЕ тест збрехав, — і це важливіше за звичайний баг, бо знецінює
		всі зелені прогони.
	-->
	{#if check.test}
		<p class="beta-item__test">{check.test}</p>
	{/if}

	{#if stale}
		<p class="beta-item__stale" data-testid="beta-check-{tid}-stale-hint">
			{$t('beta.staleMark', { values: { version: mark?.version } })}
		</p>
	{/if}

	<div class="beta-item__votes" role="group" aria-label={text}>
		{#each VOTES as option (option.vote)}
			<button
				type="button"
				class="beta-item__vote beta-item__vote--{option.vote}"
				class:active={mark?.vote === option.vote}
				aria-pressed={mark?.vote === option.vote}
				onclick={() => betaChecklist.vote(check.id, option.vote)}
				data-testid="beta-vote-{tid}-{option.vote}-btn"
			>
				{$t(option.key)}
			</button>
		{/each}
	</div>
</li>

<style>
	.beta-item {
		/* Рамка ліворуч — носій стану поряд із кольором: її товщина видима і в
		   градаціях сірого, і на монохромному екрані. */
		border-left: 4px solid var(--color-border);
		background: var(--theme-dynamic-card-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
		list-style: none;
	}

	.beta-item--fail {
		border-left-width: 10px;
		border-left-color: #b3261e;
	}

	.beta-item--weird {
		border-left-width: 10px;
		border-left-style: dashed;
		border-left-color: var(--color-golden);
	}

	.beta-item--ok {
		border-left-width: 10px;
		border-left-color: #1b5e20;
	}

	.beta-item--stale {
		opacity: 0.75;
	}

	.beta-item__text {
		margin: 0 0 var(--space-sm);
		color: var(--color-body-text);
		line-height: 1.6;
	}

	.beta-item--fail .beta-item__text,
	.beta-item--weird .beta-item__text {
		font-weight: 700;
	}

	.beta-item__num {
		font-weight: 700;
		color: var(--color-deep-ocean);
		margin-right: 0.35em;
	}

	.beta-item__flag {
		display: inline-block;
		margin-left: 0.4em;
		padding: 0 0.5em;
		border: 1px solid var(--color-deep-ocean);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--color-deep-ocean);
		white-space: nowrap;
	}

	.beta-item__category {
		margin: 0 0 0.2em;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted-text);
	}

	.beta-item__test,
	.beta-item__stale {
		margin: 0 0 var(--space-sm);
		font-size: 0.8rem;
		font-style: italic;
		color: var(--color-muted-text);
	}

	.beta-item__test {
		font-style: normal;
		/* Моноширинний шрифт літералом: змінної на нього в палітрі немає, а
		   посилання на неоголошену назву ловить `src/css-variables.test.ts`. */
		font-family: monospace;
		word-break: break-all;
	}

	.beta-item__votes {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.beta-item__vote {
		/* 44×44 — мінімальна сенсорна зона (ACCESSIBILITY-v8, UI-ELEMENTS-v8 § 1). */
		min-height: 44px;
		min-width: 44px;
		flex: 1 1 auto;
		padding: 0.5rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-white);
		color: var(--color-body-text);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.beta-item__vote:hover {
		border-color: var(--color-deep-ocean);
	}

	/* Обраний стан несе і рамку, і накреслення — не лише колір. */
	.beta-item__vote.active {
		border-width: 3px;
		border-color: var(--color-deep-ocean);
		background: var(--color-ice-blue);
		font-weight: 800;
	}
</style>
