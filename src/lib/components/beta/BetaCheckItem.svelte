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
		{ vote: 'ok', key: 'beta.vote.ok' },
		{ vote: 'fail', key: 'beta.vote.fail' },
		{ vote: 'unclear', key: 'beta.vote.unclear' },
		{ vote: 'skip', key: 'beta.vote.skip' }
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
	class:beta-item--unclear={mark?.vote === 'unclear'}
	class:beta-item--ok={mark?.vote === 'ok'}
	class:beta-item--skip={mark?.vote === 'skip'}
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
		color-scheme: light dark;
		--vote-fail: light-dark(#dc2626, #ef4444);
		--vote-unclear: light-dark(#b45309, #fbbf24);
		--vote-ok: light-dark(#15803d, #22c55e);
		--vote-skip: light-dark(#0284c7, #38bdf8);

		border: 1px solid var(--color-border);
		background: var(--theme-dynamic-card-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
		list-style: none;
		transition: border 0.15s ease;
	}

	.beta-item--fail { border: 2px solid var(--vote-fail); }
	.beta-item--unclear { border: 2px solid var(--vote-unclear); }
	.beta-item--ok { border: 2px solid var(--vote-ok); }
	.beta-item--skip { border: 2px solid var(--vote-skip); }

	.beta-item--stale {
		opacity: 0.75;
	}

	.beta-item__text {
		margin: 0 0 var(--space-sm);
		color: var(--color-body-text);
		line-height: 1.6;
	}

	.beta-item--fail .beta-item__text,
	.beta-item--unclear .beta-item__text {
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
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-white);
		color: var(--color-body-text);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.beta-item__vote--ok { background: color-mix(in srgb, var(--color-white), var(--vote-ok) 8%); border-color: color-mix(in srgb, var(--color-border), var(--vote-ok) 35%); }
	.beta-item__vote--ok:hover { background: color-mix(in srgb, var(--color-white), var(--vote-ok) 14%); border-color: var(--vote-ok); }

	.beta-item__vote--fail { background: color-mix(in srgb, var(--color-white), var(--vote-fail) 8%); border-color: color-mix(in srgb, var(--color-border), var(--vote-fail) 35%); }
	.beta-item__vote--fail:hover { background: color-mix(in srgb, var(--color-white), var(--vote-fail) 14%); border-color: var(--vote-fail); }

	.beta-item__vote--unclear { background: color-mix(in srgb, var(--color-white), var(--vote-unclear) 8%); border-color: color-mix(in srgb, var(--color-border), var(--vote-unclear) 35%); }
	.beta-item__vote--unclear:hover { background: color-mix(in srgb, var(--color-white), var(--vote-unclear) 14%); border-color: var(--vote-unclear); }

	.beta-item__vote--skip { background: color-mix(in srgb, var(--color-white), var(--vote-skip) 8%); border-color: color-mix(in srgb, var(--color-border), var(--vote-skip) 35%); }
	.beta-item__vote--skip:hover { background: color-mix(in srgb, var(--color-white), var(--vote-skip) 14%); border-color: var(--vote-skip); }

	/* Обраний стан несе товсту кольорову рамку, накреслення й акцентний колір */
	.beta-item__vote.active {
		border-width: 4px;
		font-weight: 700;
	}

	.beta-item__vote--ok.active { border-color: var(--vote-ok); color: var(--vote-ok); background: color-mix(in srgb, var(--color-white), var(--vote-ok) 18%); }
	.beta-item__vote--fail.active { border-color: var(--vote-fail); color: var(--vote-fail); background: color-mix(in srgb, var(--color-white), var(--vote-fail) 18%); }
	.beta-item__vote--unclear.active { border-color: var(--vote-unclear); color: var(--vote-unclear); background: color-mix(in srgb, var(--color-white), var(--vote-unclear) 18%); }
	.beta-item__vote--skip.active { border-color: var(--vote-skip); color: var(--vote-skip); background: color-mix(in srgb, var(--color-white), var(--vote-skip) 18%); }
</style>
