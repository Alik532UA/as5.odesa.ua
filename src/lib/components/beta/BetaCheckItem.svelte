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
	const text = $derived($locale === 'uk' ? check.text.uk : check.text.en);
</script>

<li
	class="beta-item"
	class:beta-item--fail={mark?.vote === 'fail'}
	class:beta-item--weird={mark?.vote === 'weird'}
	class:beta-item--ok={mark?.vote === 'ok'}
	class:beta-item--stale={stale}
	data-testid="beta-check-{check.id}-item"
>
	<p class="beta-item__text" data-testid="beta-check-{check.id}-text">
		<span class="beta-item__num">{position}.</span>
		{text}
		{#if check.negative}
			<span class="beta-item__flag">{$t('beta.negative')}</span>
		{/if}
	</p>

	{#if stale}
		<p class="beta-item__stale" data-testid="beta-check-{check.id}-stale-hint">
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
				data-testid="beta-vote-{check.id}-{option.vote}-btn"
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

	.beta-item__stale {
		margin: 0 0 var(--space-sm);
		font-size: 0.8rem;
		font-style: italic;
		color: var(--color-muted-text);
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
