<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DynamicBackground from '$lib/components/DynamicBackground.svelte';
	import Seagull from '$lib/components/ui/Seagull.svelte';
	import '$lib/styles/global.css';
	import '$lib/i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { waitLocale, t, locale } from 'svelte-i18n';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { ui } from '$lib/states/ui.svelte';
	import { migrateStorageKeys } from '$lib/utils/storageMigration';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		migrateStorageKeys();
	});

	$effect(() => {
		if (browser) {
			document.body.classList.toggle('page-home', page.route.id === '/');
		}
	});

	const SITE_FALLBACK_ORIGIN = 'https://as5.odesa.ua';
	type SeoPageKey = 'home' | 'about' | 'history' | 'competitions' | 'admission';
	type SeoLangKey = 'uk' | 'en';
	const FALLBACK_LANG: SeoLangKey = 'uk';

	const SEO_FALLBACK = {
		uk: {
			brandTitle: 'Одеська школа мистецтв №5',
			orgName: 'Одеська школа мистецтв №5',
			orgDescription:
				'Одеська школа мистецтв №5: музична освіта для дітей та молоді в Одесі, творчий розвиток та концертна діяльність.',
			pages: {
				home: {
					title: 'Одеська школа мистецтв №5',
					description:
						'Офіційний сайт Одеської школи мистецтв №5. Відділи, галерея, історія, конкурси та умови вступу.'
				},
				about: {
					title: 'Про Школу',
					description:
						'Дізнайтеся більше про Одеську школу мистецтв №5: творче життя, виступи, викладачі та учні.'
				},
				history: {
					title: 'Історія',
					description: 'Історія Одеської школи мистецтв №5 від перших згадок до сучасності.'
				},
				competitions: {
					title: 'Конкурси',
					description:
						'Творчі конкурси та фестивалі Одеської школи мистецтв №5 для підтримки юних талантів.'
				},
				admission: {
					title: 'Для вступу',
					description:
						'Інформація для вступу до Одеської школи мистецтв №5: документи, контакти та умови навчання.'
				}
			}
		},
		en: {
			brandTitle: 'Odesa School of Arts №5',
			orgName: 'Odesa School of Arts №5',
			orgDescription:
				'Odesa School of Arts №5: music education for children and youth in Odesa, creative growth, and concert activity.',
			pages: {
				home: {
					title: 'Odesa School of Arts №5',
					description:
						'Official website of Odesa School of Arts №5. Departments, gallery, history, competitions, and admission details.'
				},
				about: {
					title: 'About School',
					description:
						'Learn more about Odesa School of Arts №5: creative life, performances, teachers, and students.'
				},
				history: {
					title: 'History',
					description: 'The history of Odesa School of Arts №5 from early records to the present day.'
				},
				competitions: {
					title: 'Competitions',
					description:
						'Creative competitions and festivals of Odesa School of Arts №5 that support young talents.'
				},
				admission: {
					title: 'Admission',
					description:
						'Admission information for Odesa School of Arts №5: documents, contacts, and study conditions.'
				}
			}
		}
	} as const;

	function safeT(key: string, fallback: string): string {
		try {
			const result = $t(key);
			// $t returns the key itself if translation not found (locale not loaded yet)
			return (result && result !== key) ? result : fallback;
		} catch {
			return fallback;
		}
	}

	function routeToSeoKey(pathname: string): SeoPageKey {
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
	const currentLocale = $derived(($locale as string) || 'uk');
	const activeLang = $derived<SeoLangKey>(currentLocale === 'en' ? 'en' : FALLBACK_LANG);
	const brandTitle = $derived(safeT('seo.brandTitle', SEO_FALLBACK[activeLang].brandTitle));
	const metaTitle = $derived(
		safeT(`seo.pages.${seoKey}.title`, SEO_FALLBACK[activeLang].pages[seoKey].title)
	);
	const metaDescription = $derived(
		safeT(`seo.pages.${seoKey}.description`, SEO_FALLBACK[activeLang].pages[seoKey].description)
	);
	const canonicalUrl = $derived(data.canonicalUrl || `${SITE_FALLBACK_ORIGIN}${page.url.pathname}`);
	const ogImageUrl = $derived(`${SITE_FALLBACK_ORIGIN}${base}/og/og-default-1200x630.jpg`);
	const seoTitle = $derived(`${metaTitle} | ${brandTitle}`);
	const ogLocale = $derived(currentLocale === 'en' ? 'en_US' : 'uk_UA');
	const schemaOrg = $derived({
		'@context': 'https://schema.org',
		'@type': 'EducationalOrganization',
		name: safeT('seo.org.name', SEO_FALLBACK[activeLang].orgName),
		url: SITE_FALLBACK_ORIGIN,
		logo: `${SITE_FALLBACK_ORIGIN}${base}/ods-as5-logo-full.svg`,
		description: safeT('seo.org.description', SEO_FALLBACK[activeLang].orgDescription),
		telephone: '+38 048 723 81 10',
		email: 'dmsh-5odesa@ukr.net',
		address: {
			'@type': 'PostalAddress',
			streetAddress: safeT('footer.address', 'вулиця Чорноморського Козацтва, 18, Одеса'),
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
	<link rel="icon" type="image/svg+xml" href={`${base}/favicon.svg`} />
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

	<!-- Global decorative seagulls — outside .app for guaranteed viewport-fixed positioning -->
	<Seagull className="hero__seagull hero__seagull--1" size={60} />
	<Seagull className="hero__seagull hero__seagull--2" size={45} />
	<Seagull className="hero__seagull hero__seagull--3" size={35} />
	<Seagull className="hero__seagull hero__seagull--4" size={50} />
	<Seagull className="hero__seagull hero__seagull--5" size={42} />

	<div class="app" class:with-dynamic-bg={ui.enableDynamicBackground} class:page-home={page.route.id === '/'}>
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
	}
</style>