<script lang="ts">
	import { t } from 'svelte-i18n';

	// Get the l2 competition object from translations
	let l2: { prefix: string; url: string; linkText: string; suffix: string } = $derived(
		$t('competitions.l2') as any
	);
</script>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('competitions.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem;">{$t('competitions.p1')}</p>
		<ul style="margin-bottom: 1rem; list-style-type: none; padding: 0;">
			<li style="margin-bottom: 0.5rem;">{$t('competitions.l1')}</li>
			<li style="margin-bottom: 0.5rem;">
				{l2.prefix}
				<a href={l2.url} target="_blank" rel="noopener noreferrer" 
				   style="display: inline-block; padding: 8px 14px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 9999px; transition: all 0.3s; font-weight: 500; margin: 0 4px;">
					{l2.linkText}
				</a>
				{l2.suffix}
			</li>
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
