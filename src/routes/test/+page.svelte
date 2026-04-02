<script lang="ts">
	// Imports from News.svelte
	import Wave from "$lib/components/Wave.svelte"; // Assuming Wave is in lib/components
	import BirdIcon from "$lib/components/icons/BirdIcon.svelte"; // Assuming icons are in lib/components/icons
	import PhotoIcon from "$lib/components/icons/PhotoIcon.svelte"; // Assuming icons are in lib/components/icons
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { replaceState } from "$app/navigation";
	import { onMount, untrack } from "svelte";
	import { validateNews, type NewsItem } from "$lib/schemas/news";

	// Data from News.svelte
	const rawNews = [
		{
			id: 1,
			title: "Осінній фестиваль",
			date: "15 жов. 2024",
			category: "Фестиваль",
			color: "#FF6B6B"
		},
		{
			id: 2,
			title: "Осінній концерт",
			date: "22 лис. 2024",
			category: "Концерт",
			color: "#4ECDC4"
		},
		{
			id: 3,
			title: "Зимовий фестиваль",
			date: "20 гру. 2024",
			category: "Фестиваль",
			color: "#FFE66D"
		},
		{
			id: 4,
			title: "Зимовий концерт",
			date: "15 січ. 2025",
			category: "Концерт",
			color: "#1A535C"
		},
		{
			id: 5,
			title: "Весняний фестиваль",
			date: "20 бер. 2025",
			category: "Фестиваль",
			color: "#F7FFF7"
		},
		{
			id: 6,
			title: "Весняний концерт",
			date: "28 тра. 2025",
			category: "Концерт",
			color: "#FF9F1C"
		},
	];

	const newsItems: NewsItem[] = validateNews(rawNews);

	// Slider logic from News.svelte
	const infiniteNews = [newsItems[newsItems.length - 1], ...newsItems, newsItems[0]];
	let currentIndex = $state(1);
	let isTransitioning = $state(true);
	let mounted = $state(false);

	function next() {
		if (!isTransitioning) return;
		currentIndex++;
		if (currentIndex >= infiniteNews.length - 1) {
			setTimeout(() => {
				isTransitioning = false;
				currentIndex = 1;
				setTimeout(() => (isTransitioning = true), 50);
			}, 700);
		}
	}

	function prev() {
		if (!isTransitioning) return;
		currentIndex--;
		if (currentIndex <= 0) {
			setTimeout(() => {
				isTransitioning = false;
				currentIndex = infiniteNews.length - 2;
				setTimeout(() => (isTransitioning = true), 50);
			}, 700);
		}
	}

	function goTo(i: number) {
		if (!isTransitioning) return;
		currentIndex = i + 1;
	}

	$effect(() => {
		if (!mounted || !browser) return;
		const realIndex = (currentIndex - 1 + newsItems.length) % newsItems.length;
		
		untrack(() => {
			const currentParam = page.url.searchParams.get("news_page");
			if (currentParam === realIndex.toString() && (realIndex !== 0 || !currentParam)) return;

			const url = new URL(page.url.href);
			if (realIndex > 0) {
				url.searchParams.set("news_page", realIndex.toString());
			} else {
				url.searchParams.delete("news_page");
			}
			
			try {
				replaceState(url.toString(), { keepfocus: true });
			} catch (e) {
				// Router might not be ready yet.
			}
		});
	});

	onMount(() => {
		const initial = page.url.searchParams.get("news_page");
		if (initial) {
			currentIndex = parseInt(initial) + 1;
		}
		setTimeout(() => {
			mounted = true;
		}, 100);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (typeof document !== "undefined" && ["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) return;
		if (e.key === "ArrowLeft") prev();
		else if (e.key === "ArrowRight") next();
	}

	// --- Gallery Logic ---
	// Placeholder for gallery data, replace with actual data if needed
	const galleryImages = [
		{ src: '/departments/folk.png', alt: 'Gallery Image 1', title: 'Folk Music Exhibit' },
		{ src: '/departments/piano.png', alt: 'Gallery Image 2', title: 'Piano Recital Photo' },
		{ src: '/departments/pop.png', alt: 'Gallery Image 3', title: 'Pop Music Performance' },
		{ src: '/departments/strings.png', alt: 'Gallery Image 4', title: 'Strings Ensemble' },
		{ src: '/departments/theory.png', alt: 'Gallery Image 5', title: 'Music Theory Workshop' },
		{ src: '/departments/vocal.png', alt: 'Gallery Image 6', title: 'Vocal Performance' },
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- News Section -->
<div class="news-divider news-divider--top" aria-hidden="true">
	<div class="news-divider__wave">
		<Wave
			height={80}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="#005fae"
			strokeWidth={15}
		/>
	</div>
</div>

<section class="news" id="news-section" aria-labelledby="news-title">
	<div class="container">
		<div class="news__header">
			<div class="news__title-group">
				<h2 class="news__title" id="news-title">
					НОВИНИ ТА ПОДІЇ
					<BirdIcon className="news__title-bird" size={45} />
				</h2>
				<p class="news__subtitle">Будьте в курсі життя нашої школи</p>
			</div>
		</div>

		<div class="focus-viewport">
			<div
				class="focus-track"
				style="
					transform: translateX(calc(50% - 300px - {currentIndex * 620}px));
					transition: {isTransitioning ? 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'};
				"
			>
				{#each infiniteNews as item, i}
					<article class="focus-card" class:is-active={currentIndex === i}>
						<div class="focus-card__img-wrap" style="background: linear-gradient(45deg, {(item as any).color || '#eee'}, #fff)">
							<PhotoIcon size={64} className="focus-card__placeholder" />
						</div>
						<div class="focus-card__content">
							<div class="focus-card__meta">
								<span class="tag">{item.category}</span>
								<time datetime="2024" class="date">{item.date}</time>
							</div>
							<h3 class="focus-card__title">{item.title}</h3>
							<p class="focus-card__excerpt">Дізнайтеся більше про останні події, успіхи наших учнів та цікаві заходи у мистецькій школі.</p>
							<a href="/news/{item.id}" class="btn-more">Читати далі →</a>
						</div>
					</article>
				{/each}
			</div>

			<button class="nav-btn nav-btn--prev" onclick={prev} aria-label="Попередній слайд">←</button>
			<button class="nav-btn nav-btn--next" onclick={next} aria-label="Наступний слайд">→</button>
		</div>

		<div class="focus-dots">
			{#each newsItems as _, i}
				<button
					class="f-dot"
					class:active={(currentIndex - 1 + newsItems.length) % newsItems.length === i}
					onclick={() => goTo(i)}
					aria-label="Слайд {i + 1}"
				></button>
			{/each}
		</div>
	</div>
</section>

<div class="news-divider news-divider--bottom" aria-hidden="true">
	<div class="news-divider__wave">
		<Wave
			height={100}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="#005fae"
			strokeWidth={15}
		/>
	</div>
</div>

<!-- Gallery Section -->
<section class="gallery-section" id="gallery-section">
	<div class="container">
		<h2 class="gallery-section__title">Галерея</h2>
		<p class="gallery-section__subtitle">Різноманітні варіанти відображення галереї</p>

		<!-- Gallery Template 1: Grid Layout -->
		<div class="gallery-template-1">
			<h3>Шаблон 1: Стандартна Сітка</h3>
			<div class="gallery-grid">
				{#each galleryImages as img, i}
					<div class="gallery-item">
						<img src={img.src} alt={img.alt} />
						<div class="gallery-caption">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Gallery Template 2: Dynamic Grid Layout -->
		<div class="gallery-template-2">
			<h3>Шаблон 2: Динамічна Сітка</h3>
			<div class="gallery-dynamic-grid">
				{#each galleryImages as img, i}
					<div class="gallery-item-dynamic">
						<img src={img.src} alt={img.alt} />
						<div class="gallery-caption">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Gallery Template 3: Masonry Layout -->
		<div class="gallery-template-3">
			<h3>Шаблон 3: Колонки (Masonry Layout)</h3>
			<div class="gallery-masonry">
				{#each galleryImages as img, i}
					<div class="gallery-item-masonry">
						<img src={img.src} alt={img.alt} />
						<div class="gallery-caption">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Gallery Template 4: Minimalist Card List -->
		<div class="gallery-template-4">
			<h3>Шаблон 4: Мінімалістичний Список</h3>
			<div class="gallery-minimal-list">
				{#each galleryImages as img, i}
					<div class="gallery-item-minimal">
						<img src={img.src} alt={img.alt} />
						<div class="gallery-caption">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Gallery Template 5: Hero Image Gallery -->
		<div class="gallery-template-5">
			<h3>Шаблон 5: Галерея з Акцентом</h3>
			<div class="gallery-hero">
				<div class="gallery-hero-main">
					<img src={galleryImages[0].src} alt={galleryImages[0].alt} />
					<div class="gallery-caption">{galleryImages[0].title}</div>
				</div>
				<div class="gallery-hero-thumbnails">
					{#each galleryImages.slice(1, 4) as img, i}
						<div class="gallery-thumb">
							<img src={img.src} alt={img.alt} />
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Gallery Template 6: Overlay Caption -->
		<div class="gallery-template-6">
			<h3>Шаблон 6: Підписи при Наведенні</h3>
			<div class="gallery-overlay-caption">
				{#each galleryImages as img, i}
					<div class="gallery-item-overlay">
						<img src={img.src} alt={img.alt} />
						<div class="gallery-caption-overlay">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

	</div>
</section>

<style>
	/* === News Section Styles (copied from News.svelte) === */
	.news-divider {
		position: relative;
		height: 80px;
		z-index: 10;
		background: linear-gradient(180deg, #ffffff 0%, var(--color-light-blue) 100%);
	}

	.news-divider--bottom {
		height: 100px;
		background: linear-gradient(180deg, var(--color-light-blue) 0%, #ffffff 100%);
	}

	.news-divider__wave {
		position: absolute;
		left: 0;
		right: 0;
		width: 100%;
		line-height: 0;
	}

	.news-divider--top .news-divider__wave {
		bottom: -1px;
	}

	.news-divider--bottom .news-divider__wave {
		top: -1px;
	}

	.news {
		background: var(--color-light-blue);
		padding: 4rem 0 6rem;
		overflow: hidden;
		position: relative;
	}

	.news__header {
		margin-bottom: 4rem;
		text-align: center;
	}

	.news__title {
		font-family: var(--font-heading);
		font-size: 3rem;
		font-weight: 900;
		color: var(--color-deep-ocean);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 1rem;
	}

	.news__subtitle {
		font-size: 1.2rem;
		color: var(--color-body-text);
		opacity: 0.7;
	}

	.focus-viewport {
		position: relative;
		height: 480px;
		margin: 0 auto;
	}

	.focus-track {
		display: flex;
		gap: 20px;
		align-items: center;
		height: 100%;
		will-change: transform;
	}

	.focus-card {
		flex: 0 0 600px;
		height: 400px;
		background: white;
		border-radius: 40px;
		display: flex;
		overflow: hidden;
		transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
		opacity: 0.3;
		transform: scale(0.85);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.focus-card.is-active {
		opacity: 1;
		transform: scale(1);
		box-shadow: 0 40px 80px rgba(0, 0, 0, 0.12);
	}

	.focus-card__img-wrap {
		flex: 0 0 40%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	:global(.focus-card__placeholder) {
		opacity: 0.2;
		color: var(--color-deep-ocean);
	}

	.focus-card__content {
		padding: 3rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		flex: 1;
	}

	.focus-card__meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.tag {
		background: var(--color-deep-ocean);
		color: white;
		padding: 0.4rem 1rem;
		border-radius: 100px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.date {
		font-size: 0.9rem;
		color: #888;
		font-weight: 500;
	}

	.focus-card__title {
		font-family: var(--font-heading);
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--color-deep-ocean);
		line-height: 1.2;
		margin-bottom: 1rem;
	}

	.focus-card__excerpt {
		color: var(--color-body-text);
		line-height: 1.6;
		margin-bottom: 2rem;
		opacity: 0.8;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.btn-more {
		background: var(--color-deep-ocean);
		color: white;
		text-decoration: none;
		padding: 0.8rem 1.8rem;
		border-radius: 16px;
		font-weight: 700;
		width: fit-content;
		transition: all 0.3s ease;
	}

	.btn-more:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 20px rgba(27, 94, 123, 0.2);
	}

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: white;
		border: none;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		z-index: 10;
		font-size: 1.5rem;
		color: var(--color-deep-ocean);
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-btn:hover {
		background: var(--color-deep-ocean);
		color: white;
		transform: translateY(-50%) scale(1.1);
	}

	.nav-btn--prev {
		left: 40px;
	}
	.nav-btn--next {
		right: 40px;
	}

	.focus-dots {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 4rem;
	}

	.f-dot {
		width: 40px;
		height: 6px;
		border-radius: 3px;
		border: none;
		background: #cbd5e0;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.f-dot.active {
		background: var(--color-deep-ocean);
		width: 80px;
	}

	@media (max-width: 1024px) {
		.focus-card {
			flex: 0 0 500px;
		}
	}

	@media (max-width: 768px) {
		.news {
			padding: 4rem 0;
		}
		.focus-card {
			flex: 0 0 90%;
			flex-direction: column;
			height: auto;
		}
		.focus-card__img-wrap {
			height: 200px;
		}
		.nav-btn {
			display: none;
		}
		.focus-card__content {
			padding: 2rem;
		}
		.focus-card__title {
			font-size: 1.5rem;
		}
		.news__title {
			font-size: 2.2rem;
		}
	}

	/* === Gallery Section Styles === */
	.gallery-section {
		padding: 4rem 0;
		background-color: #f9f9f9; /* Light background for contrast */
		text-align: center;
	}

	.gallery-section__title {
		font-family: var(--font-heading);
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--color-deep-ocean);
		margin-bottom: 1rem;
	}

	.gallery-section__subtitle {
		font-size: 1.1rem;
		color: var(--color-body-text);
		opacity: 0.7;
		margin-bottom: 3rem;
	}

	/* General gallery item styles */
	.gallery-item, .gallery-item-dynamic, .gallery-item-masonry, .gallery-item-minimal, .gallery-item-overlay, .gallery-hero-main, .gallery-thumb {
		background-color: var(--color-white);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		cursor: pointer;
		position: relative; /* For captions and overlays */
	}
	.gallery-item:hover, .gallery-item-dynamic:hover, .gallery-item-masonry:hover, .gallery-item-minimal:hover, .gallery-item-overlay:hover, .gallery-hero-main:hover {
		transform: translateY(-5px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
	}
	.gallery-item img, .gallery-item-dynamic img, .gallery-item-masonry img, .gallery-item-minimal img, .gallery-item-overlay img, .gallery-hero-main img, .gallery-thumb img {
		width: 100%;
		display: block;
		object-fit: cover; /* Ensures images cover their container */
	}
	.gallery-caption, .gallery-caption-overlay {
		padding: 1rem;
		font-size: 0.9rem;
		color: var(--color-body-text);
		background-color: var(--color-white);
	}

	/* Gallery Template 1: Grid Layout */
	.gallery-template-1 h3,
	.gallery-template-2 h3,
	.gallery-template-3 h3,
	.gallery-template-4 h3,
	.gallery-template-5 h3,
	.gallery-template-6 h3 {
		font-family: var(--font-heading);
		font-size: 1.8rem;
		color: var(--color-deep-ocean);
		margin-bottom: 2rem;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 4rem; /* Space between templates */
	}
	.gallery-item img {
		height: 200px; /* Fixed height for grid items */
	}

	/* Gallery Template 2: Dynamic Grid Layout */
	.gallery-dynamic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		grid-auto-flow: dense; /* Allows items to fill gaps */
		gap: 1.5rem;
		margin-bottom: 4rem;
	}
	.gallery-item-dynamic {
		background-color: var(--color-white);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		cursor: pointer;
		grid-column: span 1; /* Default span */
		grid-row: span 1;   /* Default span */
	}
	.gallery-item-dynamic img {
		height: auto; /* Auto height for dynamic items */
	}
	/* Example of making some items span more */
	.gallery-item-dynamic:nth-child(3n+1) { grid-column: span 2; grid-row: span 2; }
	.gallery-item-dynamic:nth-child(4n+2) { grid-column: span 1; grid-row: span 1; }


	/* Gallery Template 3: Masonry Layout */
	.gallery-masonry {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		grid-auto-rows: masonry; /* Enable masonry layout */
		gap: 1.5rem;
		margin-bottom: 4rem;
	}
	.gallery-item-masonry img {
		height: auto; /* Auto height for masonry */
	}

	/* Gallery Template 4: Minimalist Card List */
	.gallery-minimal-list {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin-bottom: 4rem;
		align-items: center; /* Center items if they are narrower than container */
	}
	.gallery-item-minimal {
		max-width: 600px; /* Limit width for better readability */
		width: 100%;
		text-align: left; /* Align caption text left */
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); /* Softer shadow */
	}
	.gallery-item-minimal img {
		height: 200px;
	}
	.gallery-item-minimal .gallery-caption {
		padding: 1.5rem;
	}

	/* Gallery Template 5: Hero Image Gallery */
	.gallery-hero {
		margin-bottom: 4rem;
		display: grid;
		grid-template-columns: 2fr 1fr; /* Main image takes 2/3, thumbnails 1/3 */
		gap: 1.5rem;
		max-width: 1000px; /* Max width for hero gallery */
		margin-left: auto;
		margin-right: auto;
		text-align: left; /* Align caption text left */
	}
	.gallery-hero-main {
		grid-column: 1 / 2;
		grid-row: 1 / 2;
	}
	.gallery-hero-main img {
		height: 400px;
	}
	.gallery-hero-thumbnails {
		grid-column: 2 / 3;
		grid-row: 1 / 2;
		display: grid;
		grid-template-rows: repeat(3, 1fr); /* Three thumbnails stacked */
		gap: 1rem;
	}
	.gallery-thumb img {
		height: calc(400px / 3 - 1rem * 2/3); /* Calculate height based on main image height and gap */
		cursor: pointer;
		transition: opacity 0.3s ease;
	}
	.gallery-thumb:hover img {
		opacity: 0.7;
	}

	/* Gallery Template 6: Overlay Caption */
	.gallery-overlay-caption {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 4rem;
	}
	.gallery-item-overlay {
		aspect-ratio: 3 / 2; /* Maintain aspect ratio */
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 1.5rem;
		font-weight: bold;
		font-family: var(--font-heading);
	}
	.gallery-item-overlay img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.6); /* Darken image for caption overlay */
		transition: filter 0.3s ease;
	}
	.gallery-item-overlay:hover img {
		filter: brightness(0.3); /* Further darken on hover */
	}
	.gallery-caption-overlay {
		position: relative;
		z-index: 1;
		padding: 1rem; /* Re-apply padding as it's absolute positioning */
		background: none; /* Remove background */
		color: white;
		font-size: 1.1rem;
		text-shadow: 1px 1px 5px rgba(0,0,0,0.5); /* Text shadow for readability */
	}

	/* Responsive adjustments */
	@media (max-width: 992px) {
		.gallery-section__title { font-size: 2rem; }
		.gallery-section__subtitle { font-size: 1rem; }
		.gallery-template-1 h3, .gallery-template-2 h3, .gallery-template-3 h3, .gallery-template-4 h3, .gallery-template-5 h3, .gallery-template-6 h3 { font-size: 1.5rem; }

		.gallery-grid, .gallery-masonry, .gallery-dynamic-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
		.gallery-item img, .gallery-item-masonry img { height: 180px; }

		.gallery-hero {
			grid-template-columns: 1fr; /* Stack main and thumbnails on smaller screens */
			grid-template-rows: auto auto;
		}
		.gallery-hero-main { grid-column: 1 / 2; grid-row: 1 / 2; }
		.gallery-hero-main img { height: 300px; } /* Adjust height for stacked view */
		.gallery-hero-thumbnails { grid-column: 1 / 2; grid-row: 2 / 3; grid-template-rows: repeat(auto-fit, minmax(80px, 1fr)); /* Make thumbnails stack */ }
		.gallery-thumb img { height: 80px; }

		.gallery-overlay-caption { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
		.gallery-item-overlay { aspect-ratio: 1/1; } /* Square aspect ratio for overlay */

		.news { padding: 2rem 0; }
		.news__title { font-size: 2.2rem; }
		.focus-viewport { height: 400px; }
	}

	@media (max-width: 576px) {
		.gallery-section { padding: 2rem 0; }
		.gallery-section__title { font-size: 2rem; }
		.gallery-grid, .gallery-masonry, .gallery-dynamic-grid { grid-template-columns: 1fr; }
		.gallery-hero-main img { height: 250px; }
		.gallery-hero-thumbnails { grid-template-rows: repeat(3, 1fr); } /* Ensure 3 thumbnails stack */
		.gallery-thumb img { height: 70px; }

		.news__title { font-size: 1.8rem; gap: 0.8rem; }
		.news__subtitle { font-size: 1rem; }
		.focus-viewport { height: 350px; }
		.focus-card { height: auto; flex-direction: column; }
		.focus-card__img-wrap { height: 180px; }
		.focus-card__content { padding: 1.5rem; }
		.focus-dots { margin-top: 2rem; }
		.nav-btn { display: none; } /* Hide buttons on very small screens */
	}
</style>
