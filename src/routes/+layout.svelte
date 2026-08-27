<script lang="ts">
	import HeaderSection from '$lib/components/HeaderSection.svelte';
	import FooterSection from '$lib/components/FooterSection.svelte';
	import DynamicBackground from '$lib/components/DynamicBackground.svelte';
	import Seagull from '$lib/components/ui/Seagull.svelte';
	import '$lib/styles/global.css';
	import '$lib/i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { t, locale } from 'svelte-i18n';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ServiceLayer from '$lib/components/ui/ServiceLayer.svelte';
	import { ui } from '$lib/states/ui.svelte';
	import { SITE_ROOT, assetUrl, canonicalUrl as canonicalFor, isHiddenRoute } from '$lib/config/site';
	import { migrateStorageKeys } from '$lib/utils/storageMigration';
	import { safeT } from '$lib/i18n/translate';
	import { onMount } from 'svelte';
	import { trackPageView } from '$lib/services/analytics';
	import { webVitals } from '$lib/controllers/webVitals.svelte';
	import { afterNavigate } from '$app/navigation';

	let { children, data } = $props();

	// Start RUM Core Web Vitals collection (OBSERVABILITY-v8 § 2.1)
	$effect(() => webVitals.start());

	// Fires on the initial load too, so this covers the first view and every
	// client-side move between pages. trackPageView initialises analytics
	// itself, so there is no ordering to get wrong against onMount.
	afterNavigate(() => trackPageView());

	onMount(() => {
		migrateStorageKeys();
	});

	$effect(() => {
		if (browser) {
			document.body.classList.toggle('page-home', page.route.id === '/');
		}
	});

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

	// safeT — спільна функція з `$lib/i18n/translate`: `$t` віддає сам ключ,
	// доки словник не приїхав, і в мета-теги під час prerender потрапляв би
	// `seo.pages.about.title` замість заголовка.

	// Keyed off route.id rather than url.pathname. When the base was still
	// "/as5.odesa.ua", pathname carried it ("/as5.odesa.ua/about"), so none of
	// the cases below ever matched and every page fell through to the default,
	// inheriting the home page's title and description. The base is empty since
	// the move to the custom domain, but route.id stays the right key: it is
	// free of the base whatever it is set to, and of any trailing slash.
	function routeToSeoKey(routeId: string | null): SeoPageKey {
		switch (routeId) {
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

	/**
	 * Службові маршрути: `noindex`, без `canonical`, поза sitemap.
	 *
	 * Перелік живе в `$lib/config/site` — там, де вся політика адрес
	 * (BETA-CHECKLIST-v8 § 4.1). Доти він лежав тут, у layout, і кожна з трьох
	 * вимог трималася окремо; тепер одне рішення закриває всі три, а
	 * `check:build` звіряє їх між собою в зібраному HTML.
	 *
	 * `/test` — чернетка для ручних порівнянь галерей.
	 * `/beta-test-checklists` — чеклист для живої людини.
	 *
	 * `Disallow` у `robots.txt` для них НЕ ставиться: заборона обходу означає,
	 * що краулер сторінку не завантажує — і `noindex` у ній не читає ніколи.
	 */
	const isHidden = $derived(isHiddenRoute(page.route.id));
	const robotsContent = $derived(
		isHidden
			? 'noindex, nofollow'
			: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
	);

	const seoKey = $derived(routeToSeoKey(page.route.id));
	const currentLocale = $derived(($locale as string) || 'uk');
	const activeLang = $derived<SeoLangKey>(currentLocale === 'en' ? 'en' : FALLBACK_LANG);
	const brandTitle = $derived(safeT($t, 'seo.brandTitle', SEO_FALLBACK[activeLang].brandTitle));
	const metaTitle = $derived(
		safeT($t, `seo.pages.${seoKey}.title`, SEO_FALLBACK[activeLang].pages[seoKey].title)
	);
	const metaDescription = $derived(
		safeT($t, `seo.pages.${seoKey}.description`, SEO_FALLBACK[activeLang].pages[seoKey].description)
	);
	const canonicalUrl = $derived(data.canonicalUrl || canonicalFor(page.url.pathname));
	// assetUrl, а не origin + шлях: файл лежить під базою, і без неї адреса
	// вказувала на неіснуючий /og/... у корені домену (lib/config/site.ts).
	const ogImageUrl = $derived(assetUrl('/og/og-default-1200x630.jpg'));
	// The home page title is already the brand; appending it doubled the name.
	const seoTitle = $derived(metaTitle === brandTitle ? brandTitle : `${metaTitle} | ${brandTitle}`);
	const ogLocale = $derived(currentLocale === 'en' ? 'en_US' : 'uk_UA');
	const schemaOrg = $derived({
		'@context': 'https://schema.org',
		'@type': 'EducationalOrganization',
		name: safeT($t, 'seo.org.name', SEO_FALLBACK[activeLang].orgName),
		url: SITE_ROOT,
		logo: assetUrl('/svg/ods-as5-logo-full.svg'),
		description: safeT($t, 'seo.org.description', SEO_FALLBACK[activeLang].orgDescription),
		telephone: '+38 048 723 81 10',
		email: 'dmsh-5odesa@ukr.net',
		address: {
			'@type': 'PostalAddress',
			streetAddress: safeT($t, 'footer.address', 'вулиця Чорноморського Козацтва, 18, Одеса'),
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
	<link rel="icon" type="image/svg+xml" href={asset('/favicon.svg')} />
	{#if !isHidden}
		<link rel="canonical" href={canonicalUrl} />
	{/if}

	<title>{seoTitle}</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content={robotsContent} />

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

	<!-- Svelte does not evaluate expressions inside a <script> element, so the
	     previous form shipped the literal text as the structured data. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${JSON.stringify(schemaOrg)}</` + `script>`}
</svelte:head>

<!-- Rendered unconditionally: the locale is awaited in +layout.ts now. As an
     {#await} block this rendered its pending branch during prerendering, so
     every page shipped an empty placeholder instead of its content. -->

<!-- Blur overlay for theme/language changes -->
<div class="theme-transition-overlay" class:active={ui.isThemeChanging || ui.isLangChanging}></div>

<!-- Global decorative seagulls — outside .app for guaranteed viewport-fixed positioning -->
<Seagull className="hero__seagull hero__seagull--1" size={60} />
<Seagull className="hero__seagull hero__seagull--2" size={45} />
<Seagull className="hero__seagull hero__seagull--3" size={35} />
<Seagull className="hero__seagull hero__seagull--4" size={50} />
<Seagull className="hero__seagull hero__seagull--5" size={42} />

<!-- Клавіші й табло версії. ПОЗА `ErrorBoundary`: межа при падінні замінює дітей
     своєю сторінкою, тобто забрала б і те, чим збирають звіт про це падіння. -->
<ServiceLayer />

<div class="app" class:with-dynamic-bg={ui.enableDynamicBackground} class:page-home={page.route.id === '/'}>
	<div class="app__base-bg" aria-hidden="true"></div>

	<!-- Dynamic background -->
	<!-- Dynamic background - ALWAYS mounted for smooth transitions -->
	<DynamicBackground 
		backgroundType={ui.backgroundType} 
		theme={ui.theme}
		enabled={ui.enableDynamicBackground}
	/>

	<HeaderSection />
	<main id="main-content">
		<ErrorBoundary>
			{@render children()}
		</ErrorBoundary>
	</main>
	<FooterSection />
</div>

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

	/*
	 * `dvh`, а не `vh` (FLUID-SIZING-v8 § 5). `100vh` на мобільному дорівнює
	 * ВЕЛИКОМУ вікну — тому, яке буває лише зі схованою панеллю браузера. Поки
	 * панель видно, обгортка сторінки вища за екран рівно на її висоту, і
	 * коротка сторінка (наприклад, 404) отримує смугу прокрутки нізвідки.
	 * `dvh` — це та висота, яка є ЗАРАЗ.
	 */
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
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