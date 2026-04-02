<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$t('admission.title')} | Одеська школа мистецтв №5</title>
</svelte:head>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('admission.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem; font-weight: bold;">{$t('admission.p1')}</p>
		<p style="margin-bottom: 1rem;">{$t('admission.p2')}</p>
		<p style="margin-bottom: 1rem;">{$t('admission.p3')}</p>
		<p style="margin-bottom: 0.5rem;">{$t('admission.p4')}</p>
		<ul style="margin-bottom: 1.5rem; padding-left: 2rem;">
			<li>{$t('admission.l1')}</li>
			<li>{$t('admission.l2')}</li>
		</ul>
		<p style="margin-bottom: 0.5rem; font-weight: bold;">{$t('admission.p5')}</p>
		<p style="margin-bottom: 0.5rem;">
			{$t('admission.address')}<br>
			{$t('admission.phone')}
		</p>
		<p>{$t('admission.p6')}</p>
	</div>
</section>
