<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

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
		<div style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
			<a href="https://maps.app.goo.gl/khSVpMmKieTdW2Ao7" target="_blank" rel="noopener noreferrer"
			   style="display: block; padding: 12px 16px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 9999px; transition: all 0.3s; font-weight: 500; text-align: center;">
				{$t('admission.address')}
			</a>
			<a href="tel:+380487238110" 
			   style="display: block; padding: 12px 16px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 9999px; transition: all 0.3s; font-weight: 500; text-align: center;">
				{$t('admission.phone')}
			</a>
		</div>
		<p>{$t('admission.p6')}</p>
	</div>
</section>

<style>
	:global(a[href*="maps.app.goo.gl"]:hover),
	:global(a[href*="tel:+380"]:hover) {
		background-color: #004999 !important;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 51, 102, 0.3);
	}
</style>
