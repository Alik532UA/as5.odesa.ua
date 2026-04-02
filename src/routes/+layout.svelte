<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import '$lib/styles/global.css';
	import { seo } from '$lib/services/seo.svelte';
	import '$lib/i18n';
	import { waitLocale, isLoading } from 'svelte-i18n';

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
	<div class="app">
		<Header />
		<main id="main-content">
			{@render children()}
		</main>
		<Footer />
	</div>
{/await}

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		background-color: var(--color-light-blue);
	}
</style>
