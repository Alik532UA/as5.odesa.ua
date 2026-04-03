<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DynamicBackground from '$lib/components/DynamicBackground.svelte';
	import '$lib/styles/global.css';
	import { seo } from '$lib/services/seo.svelte';
	import '$lib/i18n';
	import { waitLocale, isLoading } from 'svelte-i18n';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { ui } from '$lib/states/ui.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.ogImage} />
	<meta property="og:type" content="website" />
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
		{#if ui.enableDynamicBackground}
			<DynamicBackground backgroundType={ui.backgroundType} theme={ui.theme} />
		{/if}

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