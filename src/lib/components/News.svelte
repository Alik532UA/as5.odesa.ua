<script lang="ts">
	import Wave from "./Wave.svelte";
	import BirdIcon from "./icons/BirdIcon.svelte";
	import ArrowIcon from "./icons/ArrowIcon.svelte";
	import PhotoIcon from "./icons/PhotoIcon.svelte";
	import { Carousel } from "$lib/controllers/Carousel.svelte";
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { replaceState } from "$app/navigation";
	import { onMount, untrack } from "svelte";
	import { validateNews, type NewsItem } from "$lib/schemas/news";

	const rawNews = [
		{
			id: 1,
			title: "Осінній фестиваль",
			date: "15 жов. 2024",
			category: "Фестиваль",
		},
		{
			id: 2,
			title: "Осінній концерт",
			date: "22 лис. 2024",
			category: "Концерт",
		},
		{
			id: 3,
			title: "Зимовий фестиваль",
			date: "20 гру. 2024",
			category: "Фестиваль",
		},
		{
			id: 4,
			title: "Зимовий концерт",
			date: "15 січ. 2025",
			category: "Концерт",
		},
		{
			id: 5,
			title: "Весняний фестиваль",
			date: "20 бер. 2025",
			category: "Фестиваль",
		},
		{
			id: 6,
			title: "Весняний концерт",
			date: "28 тра. 2025",
			category: "Концерт",
		},
	];

	const newsItems: NewsItem[] = validateNews(rawNews);

	const visibleCount = 3;
	const carousel = new Carousel(newsItems.length, visibleCount);
	let mounted = $state(false);

	// Sync slide with URL
	$effect(() => {
		const slide = carousel.current;
		if (!mounted || !browser) return;
		
		untrack(() => {
			const url = new URL(page.url.href);
			if (slide > 0) {
				url.searchParams.set("news_page", slide.toString());
			} else {
				url.searchParams.delete("news_page");
			}
			replaceState(url.toString(), {});
		});
	});

	// Initialize from URL
	onMount(() => {
		const initial = page.url.searchParams.get("news_page");
		if (initial) {
			carousel.goTo(parseInt(initial));
		}
		mounted = true;
	});

	function handleKeydown(e: KeyboardEvent) {
		// Only handle keys if no input/textarea is focused
		if (
			typeof document !== "undefined" &&
			["INPUT", "TEXTAREA"].includes(
				(document.activeElement as HTMLElement)?.tagName,
			)
		) {
			return;
		}

		if (e.key === "ArrowLeft") {
			carousel.prev();
		} else if (e.key === "ArrowRight") {
			carousel.next();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<section
	class="news"
	id="news-section"
	aria-labelledby="news-title"
>
	<div class="news__wave-top" aria-hidden="true">
		<Wave
			height={80}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="#005fae"
			strokeWidth={15}
		/>
	</div>

	<div class="container">
		<div class="news__header">
			<div class="news__title-group">
				<h2 class="news__title" id="news-title">
					НОВИНИ ТА ПОДІЇ
					<BirdIcon
						className="news__title-bird"
						size={45}
					/>
				</h2>
				<p class="news__subtitle">Будьте в курсі життя нашої школи</p>
			</div>

			<div class="news__nav-desktop">
				<button
					class="news__nav-btn news__nav-btn--prev"
					onclick={carousel.prev}
					disabled={carousel.current === 0}
					aria-label="Попередній слайд"
				>
					<ArrowIcon
						size={20}
						className="icon-flip"
					/>
				</button>
				<button
					class="news__nav-btn news__nav-btn--next"
					onclick={carousel.next}
					disabled={carousel.current === carousel.max}
					aria-label="Наступний слайд"
				>
					<ArrowIcon size={20} />
				</button>
			</div>
		</div>

		<div class="news__carousel-container" role="region" aria-roledescription="carousel">
			<div
				class="news__track"
				style="transform: translateX(calc(-{carousel.current} * (100% / {carousel.visible} + var(--gap-fix))))"
			>
				{#snippet NewsCard(item: NewsItem)}
					<article class="news-card">
						<div class="news-card__image-wrap">
							<div class="news-card__image image-placeholder">
								<PhotoIcon
									size={48}
									className="news-card__placeholder-icon"
								/>
								<div class="news-card__overlay">
									<span class="news-card__category"
										>{item.category}</span
									>
								</div>
							</div>
						</div>
						<div class="news-card__content">
							<time class="news-card__date" datetime="2024"
								>{item.date}</time
							>
							<h3 class="news-card__card-title">{item.title}</h3>
							<a href="/news/{item.id}" class="news-card__more"
								>Читати повністю →</a
							>
						</div>
					</article>
				{/snippet}

				{#each newsItems as item (item.id)}
					{@render NewsCard(item)}
				{/each}
			</div>
		</div>

		<div class="news__footer">
			<div class="news__progress-wrap">
				<div class="news__progress-bar">
					<div
						class="news__progress-fill"
						style="width: {carousel.progress}%"
					></div>
				</div>
			</div>

			<div class="news__dots">
				{#each { length: carousel.max + 1 } as _, i}
					<button
						class="news__dot"
						class:active={carousel.current === i}
						onclick={() => carousel.goTo(i)}
						aria-label="Слайд {i + 1}"
					></button>
				{/each}
			</div>
		</div>
	</div>

	<div class="news__wave-bottom" aria-hidden="true">
		<Wave
			height={100}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="#005fae"
			strokeWidth={15}
		/>
	</div>
</section>

<style>
	.news {
		background: linear-gradient(
			180deg,
			var(--color-light-blue) 0%,
			#ffffff 100%
		);
		padding: 8rem 0 10rem;
		position: relative;
		overflow: hidden;
		--gap: 2rem;
		--gap-fix: 0.65rem; /* Correction for flex gap in transform */
	}

	.news__wave-top {
		position: absolute;
		top: -40px;
		left: 0;
		right: 0;
		z-index: 5;
	}

	.news__wave-bottom {
		position: absolute;
		bottom: -5px;
		left: 0;
		right: 0;
		z-index: 5;
	}

	.news__header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 3.5rem;
	}

	.news__title {
		font-family: var(--font-heading);
		font-size: 2.8rem;
		font-weight: 900;
		color: var(--color-deep-ocean);
		display: flex;
		align-items: center;
		gap: 1.5rem;
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.news__subtitle {
		font-size: 1.1rem;
		color: var(--color-body-text);
		opacity: 0.8;
	}

	/* Desktop Navigation Buttons */
	.news__nav-desktop {
		display: flex;
		gap: 1rem;
	}

	.news__nav-btn {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		color: var(--color-deep-ocean);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.news__nav-btn:hover:not(:disabled) {
		background: var(--color-deep-ocean);
		color: white;
		transform: translateY(-3px);
		box-shadow: 0 8px 25px rgba(27, 94, 123, 0.25);
	}

	.news__nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	:global(.icon-flip) {
		transform: rotate(180deg);
	}

	/* Carousel Structure */
	.news__carousel-container {
		width: 100%;
		overflow: visible; /* To allow shadows not to be cut */
		padding: 1rem 0;
	}

	.news__track {
		display: flex;
		gap: var(--gap);
		transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
		will-change: transform;
	}

	/* News Card */
	.news-card {
		flex: 0 0 calc((100% - var(--gap) * 2) / 3);
		background: white;
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
		transition: all 0.4s ease;
		display: flex;
		flex-direction: column;
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.news-card:hover {
		transform: translateY(-10px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
	}

	.news-card__image-wrap {
		position: relative;
		overflow: hidden;
		aspect-ratio: 16 / 10;
	}

	.news-card__image {
		width: 100%;
		height: 100%;
		transition: transform 0.7s ease;
	}

	.news-card:hover .news-card__image {
		transform: scale(1.1);
	}

	.news-card__overlay {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
	}

	.news-card__category {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(4px);
		padding: 0.4rem 1rem;
		border-radius: 100px;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-deep-ocean);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.news-card__content {
		padding: 1.8rem;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.news-card__date {
		font-size: 0.85rem;
		color: #888;
		font-weight: 500;
		margin-bottom: 0.8rem;
	}

	.news-card__card-title {
		font-family: var(--font-heading);
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--color-deep-ocean);
		line-height: 1.3;
		margin-bottom: 1.5rem;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.news-card__more {
		margin-top: auto;
		font-size: 0.9rem;
		font-weight: 700;
		color: #40c8f4;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.news-card__more:hover {
		color: var(--color-deep-ocean);
	}

	/* Footer Navigation */
	.news__footer {
		margin-top: 4rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.news__progress-wrap {
		flex: 1;
		max-width: 300px;
	}

	.news__progress-bar {
		height: 4px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 10px;
		overflow: hidden;
	}

	.news__progress-fill {
		height: 100%;
		background: var(--color-deep-ocean);
		transition: width 0.4s ease;
	}

	.news__dots {
		display: flex;
		gap: 0.8rem;
	}

	.news__dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ddd;
		transition: all 0.3s ease;
	}

	.news__dot.active {
		background: var(--color-deep-ocean);
		width: 30px;
		border-radius: 10px;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.news-card {
			flex: 0 0 calc((100% - var(--gap)) / 2);
		}
		.news {
			--gap-fix: 1rem;
		}
	}

	@media (max-width: 768px) {
		.news {
			padding: 4rem 0 6rem;
		}
		.news__title {
			font-size: 2.2rem;
		}
		.news-card {
			flex: 0 0 100%;
		}
		.news__nav-desktop {
			display: none;
		}
		.news__header {
			text-align: center;
			justify-content: center;
		}
		.news__title {
			justify-content: center;
		}
	}
</style>
