<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DynamicBackground from '$lib/components/DynamicBackground.svelte';
	import '$lib/styles/global.css';
	import '$lib/i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { waitLocale, t, locale } from 'svelte-i18n';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { ui } from '$lib/states/ui.svelte';

	let { children } = $props();

	const SITE_FALLBACK_ORIGIN = 'https://as5.odesa.ua';

	function routeToSeoKey(pathname: string): string {
		switch (pathname) {
			case '/':
				return 'home';
			case '/about':
				return 'about';
			case '/history':
				return 'history';
			case '/competitions':
				return 'competitions';
			case '/admission':
				return 'admission';
			default:
				return 'home';
		}
	}

	const seoKey = $derived(routeToSeoKey(page.url.pathname));
	const brandTitle = $derived($t('seo.brandTitle'));
	const metaTitle = $derived($t(`seo.pages.${seoKey}.title`));
	const metaDescription = $derived($t(`seo.pages.${seoKey}.description`));
	const currentLocale = $derived(($locale as string) || 'uk');
	const baseOrigin = $derived(browser ? window.location.origin : SITE_FALLBACK_ORIGIN);
	const canonicalUrl = $derived(`${baseOrigin}${page.url.pathname}`);
	const ogImageUrl = $derived(`${baseOrigin}/ods-as5-logo-full_AlphaChannel.png`);
	const seoTitle = $derived(`${metaTitle} | ${brandTitle}`);
	const ogLocale = $derived(currentLocale === 'en' ? 'en_US' : 'uk_UA');
	const schemaOrg = $derived({
		'@context': 'https://schema.org',
		'@type': 'EducationalOrganization',
		name: $t('seo.org.name'),
		url: baseOrigin,
		logo: `${baseOrigin}/ods-as5-logo-full.svg`,
		description: $t('seo.org.description'),
		telephone: '+38 048 723 81 10',
		email: 'dmsh-5odesa@ukr.net',
		address: {
			'@type': 'PostalAddress',
			streetAddress: $t('footer.address'),
			addressLocality: 'Odesa',
			addressCountry: 'UA'
		},
		sameAs: [
			'https://www.facebook.com/odesaartschool5',
			'https://www.instagram.com/odesa_art_school_5'
		]
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="canonical" href={canonicalUrl} />
	
	<title>{seoTitle}</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content="index, follow" />
	
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content={ogLocale} />
	<meta property="og:site_name" content={brandTitle} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content={ogImageUrl} />

	<script type="application/ld+json">{JSON.stringify(schemaOrg)}</script>
</svelte:head>

{#await waitLocale()}
	<div style="height: 100vh; display: flex; align-items: center; justify-content: center;">
		<!-- Simple placeholder or nothing during transition -->
	</div>
{:then}
	<!-- Blur overlay for theme/language changes -->
	<div class="theme-transition-overlay" class:active={ui.isThemeChanging || ui.isLangChanging}></div>

	<div class="app" class:with-dynamic-bg={ui.enableDynamicBackground}>
		<div class="app__base-bg" aria-hidden="true"></div>

		<!-- Dynamic background -->
		<!-- Dynamic background - ALWAYS mounted for smooth transitions -->
		<DynamicBackground 
			backgroundType={ui.backgroundType} 
			theme={ui.theme}
			enabled={ui.enableDynamicBackground}
		/>

		<Header />
		<main id="main-content">
			<ErrorBoundary>
				{@render children()}
			</ErrorBoundary>
		</main>
		<Footer />
	</div>
{/await}

<style>
	.theme-transition-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		backdrop-filter: blur(0px);
		transition:
			opacity 0.3s ease-in-out,
			backdrop-filter 0.3s ease-in-out;
		z-index: 9999;
	}

	.theme-transition-overlay.active {
		opacity: 1;
		backdrop-filter: blur(6px);
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		position: relative;
		isolation: isolate;
	}

	.app__base-bg {
		position: fixed;
		inset: 0;
		background: var(--color-light-blue);
		z-index: -2;
		pointer-events: none;
	}

	main {
		flex: 1;
		background: transparent;
		position: relative;
		z-index: 1;
	}
</style>