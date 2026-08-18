<script lang="ts">
	import HeroSection from '$lib/components/HeroSection.svelte';
	import DepartmentsSection from '$lib/components/DepartmentsSection.svelte';
	import WaveBackground from '$lib/components/WaveBackground.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { t } from 'svelte-i18n';
	import { asset } from '$app/paths';

	const galleryImages = $derived([
		{ src: asset('/photo/photoForMainPage-01.jpg'), alt: 'School Life 1', title: $t('gallery.items.process') },
		{ src: asset('/photo/photoForMainPage-03.jpg'), alt: 'School Life 2', title: $t('gallery.items.talents') },
		{ src: asset('/photo/photoForMainPage-04.jpg'), alt: 'School Life 3', title: $t('gallery.items.atmosphere') },
		{ src: asset('/photo/photoForMainPage-06.jpg'), alt: 'School Life 4', title: $t('gallery.items.evenings') },
		{ src: asset('/photo/photoForMainPage-07.jpg'), alt: 'School Life 5', title: $t('gallery.items.virtuosos') },
		{ src: asset('/photo/photoForMainPage-02.jpg'), alt: 'School Life 6', title: $t('gallery.items.harmony') },
	]);
</script>

<ErrorBoundary name="hero">
	<HeroSection />
</ErrorBoundary>

<!--
	Секція відділів рендериться одразу, а не за IntersectionObserver.

	Доти вона стояла під `{#if showDepartments}`, який вмикався лише після
	`onMount` + перетину вʼюпорта. Під час prerender ані того, ані іншого не
	буває, тож у `build/index.html` замість шести відділів школи лежав рядок
	«Завантаження...», і головна сторінка сайту оголошувала пошуковикам, що
	відділів у неї немає (SEO-v8 § 1.1: вміст, якого немає в prerendered HTML,
	для індексу не існує).

	Виграшу в швидкості це не давало НІЯКОГО: `DepartmentsSection`
	імпортується статично, тобто його код усе одно лежить у тому самому чанку
	сторінки й завантажується разом із нею. Відкладався лише рендер шести
	карток, картинки в яких і без того `loading="lazy"`. Тобто ціною була
	видимість вмісту, а купувалося за неї нічого.
-->
<ErrorBoundary name="departments">
	<DepartmentsSection />
</ErrorBoundary>

<!-- Bento Grid 4:3 Section -->
<div class="section-divider section-divider--top" aria-hidden="true">
	<div class="section-divider__wave">
		<WaveBackground
			height={80}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="var(--theme-wave-stroke)"
			strokeWidth={15}
		/>
	</div>
</div>

<section class="gallery-bento" id="gallery-bento" aria-labelledby="gallery-title">
	<div class="container">
		<div class="gallery-bento__header">
			<h2 class="gallery-bento__title" id="gallery-title">{$t('gallery.title')}</h2>
			<p class="gallery-bento__subtitle">{$t('gallery.subtitle')}</p>
		</div>

		<div class="g-bento-4x3">
			{#each galleryImages as img (img.src)}
				<div class="g-bento-4x3__item">
					<img src={img.src} alt={img.alt} width="1200" height="900" loading="lazy" decoding="async" />
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.section-divider {
		position: relative;
		height: 80px;
		z-index: 10;
		background: linear-gradient(180deg, var(--color-white) 0%, var(--color-light-blue) 100%);
		transition: background 800ms ease-in-out;
	}

	:global(.app.with-dynamic-bg) .section-divider {
		background: transparent;
	}

	.section-divider__wave {
		position: absolute;
		left: 0;
		right: 0;
		width: 100%;
		line-height: 0;
	}

	.section-divider--top .section-divider__wave {
		bottom: -1px;
	}

	.gallery-bento {
		background: var(--color-light-blue);
		padding: 4rem 0 6rem;
		overflow: hidden;
		position: relative;
		transition: background 800ms ease-in-out;
	}

	:global(.app.with-dynamic-bg) .gallery-bento {
		background: transparent;
	}

	.gallery-bento__header {
		margin-bottom: 4rem;
		text-align: center;
	}

	.gallery-bento__title {
		font-family: var(--font-heading);
		font-size: 3rem;
		font-weight: 900;
		color: var(--color-deep-ocean);
		margin-bottom: 1rem;
		text-transform: uppercase;
	}

	.gallery-bento__subtitle {
		font-size: 1.2rem;
		color: var(--color-body-text);
		opacity: 0.7;
	}

	.g-bento-4x3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}

	.g-bento-4x3__item {
		position: relative;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 0 15px 30px rgba(0,0,0,0.08);
		cursor: pointer;
		aspect-ratio: 4 / 3;
	}

	.g-bento-4x3__item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.g-bento-4x3__item:hover img {
		transform: scale(1.08);
	}

	@media (max-width: 1024px) {
		.g-bento-4x3 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 768px) {
		.gallery-bento__title {
			font-size: 2.2rem;
		}
		.g-bento-4x3 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
		}
		.g-bento-4x3__item {
			border-radius: 32px;
		}
	}

	@media (max-width: 480px) {
		.g-bento-4x3 {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
