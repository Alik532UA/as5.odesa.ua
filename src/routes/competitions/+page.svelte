<script lang="ts">
	import { t, json } from 'svelte-i18n';

	/**
	 * Один пункт списку — це не рядок, а речення з посиланням усередині
	 * (I18N-v8 § 4.1: речення не склеюється з шматків у розмітці). Тому в
	 * словнику під `competitions.l2` лежить об'єкт, а не текст.
	 *
	 * Читається він через `json`, а не через `$t`. `$t` — форматувальник
	 * повідомлень: на об'єкті він друкує в консоль
	 *
	 *     [svelte-i18n] Message with id "competitions.l2" must be of type
	 *     "string", found: "object". Gettin its value through the "$format"
	 *     method is deprecated; use the "json" method instead.
	 *
	 * і робить це на КОЖНОМУ рендері, зокрема під час prerender — попередження
	 * було видно в логах збірки. Разом із ним ішов `as any` над результатом:
	 * тип брався зі стелі, і словник міг розійтися з розміткою мовчки.
	 *
	 * `json` віддає `unknown`, тому нижче стоїть справжня перевірка, а не `as`
	 * (AGENTS.md: «`as` нічого не звіряє»). Якщо ключ зникне або зміниться —
	 * пункт покажеться простим текстом замість того, щоб упасти з
	 * `Cannot read properties of undefined`.
	 */
	type CompetitionLink = {
		prefix: string;
		url: string;
		linkText: string;
		suffix: string;
	};

	function isCompetitionLink(value: unknown): value is CompetitionLink {
		if (typeof value !== 'object' || value === null) return false;
		const v = value as Record<string, unknown>;
		return (
			typeof v.prefix === 'string' &&
			typeof v.url === 'string' &&
			typeof v.linkText === 'string' &&
			typeof v.suffix === 'string'
		);
	}

	const l2raw = $derived($json('competitions.l2'));
	const l2 = $derived(isCompetitionLink(l2raw) ? l2raw : null);
</script>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('competitions.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem;">{$t('competitions.p1')}</p>
		<ul style="margin-bottom: 1rem; list-style-type: none; padding: 0;">
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l1')}</li>
			{#if l2}
				<li style="margin-bottom: 0.5rem;">
					{l2.prefix}
					<a href={l2.url} target="_blank" rel="noopener noreferrer"
					   data-testid="competitions-modern-view-link"
					   style="display: inline-block; padding: 8px 14px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 9999px; transition: all 0.3s; font-weight: 500; margin: 0 4px;">
						{l2.linkText}
					</a>
					{l2.suffix}
				</li>
			{/if}
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l3')}</li>
		</ul>
		<p style="margin-bottom: 1rem;">{$t('competitions.p2')}</p>
		<p>{$t('competitions.p3')}</p>
	</div>
</section>

<style>
	:global(a[href*="modern-view.in.ua"]:hover) {
		background-color: #004999 !important;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 51, 102, 0.3);
	}
</style>
