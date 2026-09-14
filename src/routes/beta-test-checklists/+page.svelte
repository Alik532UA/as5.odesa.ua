<script lang="ts">
	import { onDestroy } from 'svelte';
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

	/**
	 * Таймер підпису «скопійовано» — з дескриптором (§ 7.5).
	 *
	 * Дві причини, і жодна не теоретична. Натиснути вдруге, не помітивши
	 * реакції, — звичайна поведінка: перший таймер лишався б живим і гасив
	 * підпис, який щойно поставив ДРУГИЙ клік. І піти з чеклиста одразу після
	 * копіювання — теж звичайний шлях, тобто таймер стріляв би в знищену
	 * сторінку.
	 */
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(copiedTimer));

	async function copyReport() {
		const result = await betaChecklist.copyReport();
		copied = result === 'copied';
		if (copied) {
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (copied = false), 2500);
		}
	}
</script>

<!--
	Власного `<svelte:head>` тут НЕМА, і саме тому заголовок цієї сторінки
	перестав суперечити її ж `og:title`.

	`<title>` тут стояв разом із тим, що ставить макет. Svelte із двох лишає
	один — тобто в зібраному HTML дефекту не видно, а в мета-тегах сторінка
	називалася двома різними іменами: `<title>` — «Чеклист бета-тестування»,
	`og:title` — «Одеська школа мистецтв №5» (макет брав ключ `home`, бо
	службові маршрути падали в `default`). Тепер у макета є власний ключ `beta`,
	і обидва теги беруть один рядок (SEO-v9 § 4.4, `SEO-HEAD-SINGLE-OWNER`).
-->
<section class="beta" data-testid="beta-checklist-section">
	<div class="container">
		<h1 class="beta__title">{$t('beta.title')}</h1>
		<p class="beta__intro">{$t('beta.intro')}</p>

		<p class="beta__progress">
			{$t('beta.progress')}
			<strong data-testid="beta-progress-value">{progress.done} / {progress.total}</strong>
		</p>

		<!--
			ЗВИЧАЙНІ КНОПКИ, А НЕ ARIA-ТАБИ (§ 8.2, `BETA-TABS-NOT-ARIA`).

			Доти тут стояли `role="tablist"` і `role="tab"` — і це було гірше за
			відсутність ролі. Роль `tab` — обіцянка цілого віджета: `role="tabpanel"`
			на вмісті, `aria-controls` на кожній вкладці, і СТРІЛКИ ← → замість
			`Tab` для переходу між ними (`Tab` мусить виводити зі смужки одразу до
			вмісту). Тут не було нічого з цього: читалка оголошувала віджет, якого
			немає, і людина, яка слухає, тиснула стрілки, а нічого не відбувалося.

			Смужка вкладок чеклиста — набір перемикачів, і `aria-pressed` описує її
			чесно. Реалізувати повний патерн теж можна було б, але тоді повністю,
			разом зі стрілками й roving tabindex — заради трьох кнопок це не
			окупається.
		-->
		<nav class="beta__tabs" aria-label={$t('beta.tabsLabel')}>
			{#each BETA_TABS as tab (tab.id)}
				{@const tabDone = betaChecklist.progressOf(tab.id)}
				<button
					type="button"
					class="beta__tab"
					class:active={betaChecklist.activeTab === tab.id}
					aria-pressed={betaChecklist.activeTab === tab.id}
					onclick={() => (betaChecklist.activeTab = tab.id)}
					data-testid="beta-tab-{tab.id}-btn"
				>
					{$locale === 'uk' ? tab.title.uk : tab.title.en}
					<span class="beta__tab-count" data-testid="beta-tab-{tab.id}-progress-text">
						{tabDone.done}/{tabDone.total}
					</span>
				</button>
			{/each}
		</nav>

		{#each groups as group, levelIndex (group.coverage)}
			<!--
				Нумерація НАСКРІЗНА по вкладці (§ 2.2), а не з одиниці в кожному рівні.
				Рівнів на екрані до трьох, і три пункти «1.» роблять номер марним саме
				тоді, коли він потрібен: людина каже «зламалося на третьому».
			-->
			{@const offset = groups.slice(0, levelIndex).reduce((n, g) => n + g.checks.length, 0)}
			<section class="beta__level" data-testid="beta-level-{group.coverage}-section">
				<h2 class="beta__level-title">
					{$t(`beta.level.${group.coverage}.title`)}
					<span class="beta__level-count">{group.checks.length}</span>
				</h2>
				<p class="beta__level-hint">{$t(`beta.level.${group.coverage}.hint`)}</p>
				<ul class="beta__list">
					{#each group.checks as check, i (check.id)}
						<BetaCheckItem {check} position={offset + i + 1} />
					{/each}
				</ul>
			</section>
		{/each}

		<div class="beta__actions">
			<button type="button" class="beta__btn" onclick={copyReport} data-testid="beta-report-btn">
				{$t('beta.copyReport')}
			</button>
			<!--
				Стирання у ДВА кроки (§ 6.3): це єдина незворотна дія на сторінці, і
				стоїть вона в тому самому рядку, що й кнопка звіту, до якої тягнуться
				щоразу. Ціна помилки несиметрична — година роботи проти зайвого кліка.
			-->
			<button
				type="button"
				class="beta__btn beta__btn--quiet"
				class:beta__btn--armed={betaChecklist.clearArmed}
				onclick={() => betaChecklist.requestClear()}
				data-testid="beta-clear-btn"
			>
				{betaChecklist.clearArmed ? $t('beta.clearConfirm') : $t('beta.clearMarks')}
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

	/* Рівна ширина цифр: лічильники в ряду вкладок не мусять стрибати. */
	.beta__tab-count {
		margin-inline-start: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.beta__level-count {
		margin-inline-start: 0.4rem;
		padding: 0.05rem 0.45rem;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		font-size: 0.75rem;
		color: var(--color-muted-text);
		font-variant-numeric: tabular-nums;
	}

	/*
	 * Зведена кнопка стирання (§ 6.3). Стан НЕ лише кольором: рамка з'являється,
	 * напис стає жирнішим, і сам текст кнопки міняється на питання.
	 */
	.beta__btn--armed {
		border: 2px solid var(--color-deep-ocean);
		font-weight: 800;
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
