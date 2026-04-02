<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$t('history.title')} | Одеська школа мистецтв №5</title>
</svelte:head>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('history.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem;">{$t('history.p1')}</p>
		<p style="margin-bottom: 1rem;">{$t('history.p2')}</p>
		<p style="margin-bottom: 1rem;">{$t('history.p3')}</p>
		<p>{$t('history.p4')}</p>
	</div>
</section>
