<script lang="ts">
	import { t, locale } from 'svelte-i18n';
	import BetaCheckItem from '$lib/components/beta/BetaCheckItem.svelte';
	import { betaChecklist } from '$lib/states/betaChecklist.svelte';
	import { BETA_TABS, checksByCoverage } from '$lib/config/beta';

	/**
	 * Сторінка чеклиста бета-тестування (BETA-CHECKLIST-v8 § 4).
	 *
	 * ## Наскільки вона прихована
	 *
	 * Рівно настільки: немає в меню, немає в sitemap, віддає `noindex, nofollow`
	 * і не оголошує `canonical`. Це НЕ означає «неможливо знайти»: статичний
	 * сайт із відкритого репозиторію таємниці не тримає, а довжина шляху додає
	 * до захисту приблизно нічого. Адреса працює завжди, і її дають посиланням
	 * тому, хто згодився допомогти.
	 *
	 * `Disallow` у `robots.txt` тут свідомо НЕМАЄ, і це відхилення від § 4
	 * канону. Причина записана в самому `robots.txt`: заборона обходу означає,
	 * що краулер сторінку не завантажує — і `noindex` у ній не читає НІКОЛИ.
	 * Цей проєкт уже наступав на це з `/test`, тому обидві директиви разом тут
	 * не ставляться: діє та, яку краулер справді прочитає.
	 *
	 * ## Назва маршруту
	 *
	 * Довга замість короткої `/beta-test/` — заради однозначності, а не
	 * таємниці: `/beta-test/` читається як «сторінка, де тестують якусь
	 * бета-функцію», тобто як пісочниця.
	 */
	const groups = $derived(checksByCoverage(betaChecklist.activeTab));
	const progress = $derived(betaChecklist.progress);

	let copied = $state(false);

	async function copyReport() {
		const result = await betaChecklist.copyReport();
		copied = result === 'copied';
		if (copied) setTimeout(() => (copied = false), 2500);
	}
</script>

<svelte:head>
	<title>{$t('beta.title')}</title>
</svelte:head>

<section class="beta" data-testid="beta-checklist-section">
	<div class="container">
		<h1 class="beta__title">{$t('beta.title')}</h1>
		<p class="beta__intro">{$t('beta.intro')}</p>

		<p class="beta__progress">
			{$t('beta.progress')}
			<strong data-testid="beta-progress-value">{progress.done} / {progress.total}</strong>
		</p>

		<div class="beta__tabs" role="tablist" aria-label={$t('beta.tabsLabel')}>
			{#each BETA_TABS as tab (tab.id)}
				<button
					type="button"
					role="tab"
					class="beta__tab"
					class:active={betaChecklist.activeTab === tab.id}
					aria-selected={betaChecklist.activeTab === tab.id}
					onclick={() => (betaChecklist.activeTab = tab.id)}
					data-testid="beta-tab-{tab.id}-btn"
				>
					{$locale === 'uk' ? tab.title.uk : tab.title.en}
				</button>
			{/each}
		</div>

		{#each groups as group (group.coverage)}
			<section class="beta__level" data-testid="beta-level-{group.coverage}-section">
				<h2 class="beta__level-title">{$t(`beta.level.${group.coverage}.title`)}</h2>
				<p class="beta__level-hint">{$t(`beta.level.${group.coverage}.hint`)}</p>
				<ul class="beta__list">
					{#each group.checks as check, i (check.id)}
						<BetaCheckItem {check} position={i + 1} />
					{/each}
				</ul>
			</section>
		{/each}

		<div class="beta__actions">
			<button type="button" class="beta__btn" onclick={copyReport} data-testid="beta-report-btn">
				{$t('beta.copyReport')}
			</button>
			<button
				type="button"
				class="beta__btn beta__btn--quiet"
				onclick={() => betaChecklist.clear()}
				data-testid="beta-clear-btn"
			>
				{$t('beta.clearMarks')}
			</button>
		</div>

		{#if copied}
			<p class="beta__hint" role="status" data-testid="beta-report-hint">{$t('beta.copied')}</p>
		{/if}

		{#if betaChecklist.reportFallback}
			<!-- Запасний шлях (§ 6.2): буфер обміну відмовляє буденно — вкладка не
			     у фокусі, сторінка не через https, немає дозволу. Без цього поля
			     кнопка виглядала б натиснутою, а звіту не було б НІДЕ, тобто вся
			     робота тестувальника зникала б на останньому кроці. -->
			<p class="beta__hint" role="alert">{$t('beta.copyFailed')}</p>
			<textarea
				class="beta__report"
				readonly
				rows="14"
				aria-label={$t('beta.reportLabel')}
				data-testid="beta-report-input">{betaChecklist.reportFallback}</textarea
			>
		{/if}
	</div>
</section>

<style>
	.beta {
		padding: 160px 0 6rem;
	}

	.beta__title {
		font-family: var(--font-heading);
		font-size: clamp(1.8rem, 5vw, 3rem);
		color: var(--color-deep-ocean);
		margin-bottom: var(--space-md);
	}

	.beta__intro,
	.beta__progress {
		color: var(--color-body-text);
		line-height: 1.7;
		margin-bottom: var(--space-md);
		max-width: 60ch;
	}

	.beta__tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-xl);
	}

	.beta__tab {
		min-height: 44px;
		padding: 0.5rem 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-white);
		color: var(--color-deep-ocean);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.beta__tab.active {
		border-width: 3px;
		border-color: var(--color-deep-ocean);
		background: var(--color-ice-blue);
		font-weight: 800;
	}

	.beta__level {
		margin-bottom: var(--space-2xl);
	}

	.beta__level-title {
		font-family: var(--font-heading);
		font-size: clamp(1.1rem, 3vw, 1.5rem);
		color: var(--color-deep-ocean);
		margin-bottom: var(--space-xs);
	}

	.beta__level-hint {
		margin: 0 0 var(--space-md);
		font-size: 0.9rem;
		color: var(--color-muted-text);
		max-width: 60ch;
	}

	.beta__list {
		margin: 0;
		padding: 0;
	}

	.beta__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-top: var(--space-xl);
	}

	.beta__btn {
		min-height: 44px;
		padding: 0.6rem 1.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-deep-ocean);
		color: var(--color-white);
		font-weight: 700;
		cursor: pointer;
		transition: opacity var(--transition-fast);
	}

	.beta__btn:hover {
		opacity: 0.88;
	}

	.beta__btn--quiet {
		background: var(--color-ice-blue);
		color: var(--color-deep-ocean);
	}

	.beta__hint {
		margin-top: var(--space-md);
		color: var(--color-body-text);
		font-weight: 600;
	}

	.beta__report {
		width: 100%;
		margin-top: var(--space-sm);
		padding: var(--space-md);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-white);
		color: var(--color-body-text);
		font-family: monospace;
		font-size: 0.85rem;
		line-height: 1.5;
	}
</style>
