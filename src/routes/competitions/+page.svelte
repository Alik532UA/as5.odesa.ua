<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$t('competitions.title')} | Одеська школа мистецтв №5</title>
</svelte:head>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('competitions.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem;">{$t('competitions.p1')}</p>
		<ul style="margin-bottom: 1rem; list-style-type: none; padding: 0;">
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l1')}</li>
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l2')}</li>
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l3')}</li>
		</ul>
		<p style="margin-bottom: 1rem;">{$t('competitions.p2')}</p>
		<p>{$t('competitions.p3')}</p>
	</div>
</section>
