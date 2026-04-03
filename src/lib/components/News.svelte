<script lang="ts">
	import Wave from "./Wave.svelte";
	import PhotoIcon from "./icons/PhotoIcon.svelte";
	import BirdIcon from "./icons/BirdIcon.svelte";
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { replaceState } from "$app/navigation";
	import { onMount, untrack } from "svelte";
	import { base } from "$app/paths";
	import { validateNews, type NewsItem } from "$lib/schemas/news";
	import { CarouselController } from "$lib/controllers/Carousel.svelte";

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

	// Логіка для БЕЗКІНЕЧНОГО слайдера
	const infiniteNews = [newsItems[newsItems.length - 1], ...newsItems, newsItems[0]];
	
	const carousel = new CarouselController(infiniteNews.length, 1);
	let mounted = $state(false);

	// Sync slide with URL
	$effect(() => {
		if (!mounted || !browser) return;
		const realIndex = (carousel.currentIndex - 1 + newsItems.length) % newsItems.length;
		
		untrack(() => {
			const currentParam = page.url.searchParams.get("news_page");
			if (currentParam === realIndex.toString() && (realIndex !== 0 || !currentParam)) return;

			const url = new URL(page.url.href);
			if (realIndex > 0) {
				url.searchParams.set("news_page", realIndex.toString());
			} else {
				url.searchParams.delete("news_page");
			}
			
			// Використовуємо спробу-відлов, якщо роутер ще не готовий
			try {
				replaceState(url.toString(), { keepfocus: true });
			} catch (e) {
				// Роутер ще ініціалізується, ігноруємо перший невдалий виклик
			}
		});
	});

	onMount(() => {
		const initial = page.url.searchParams.get("news_page");
		if (initial) {
			carousel.currentIndex = parseInt(initial) + 1;
		}
		// Даємо роутеру трохи часу після монтажу
		setTimeout(() => {
			mounted = true;
		}, 100);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (typeof document !== "undefined" && ["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) return;
		if (e.key === "ArrowLeft") carousel.prev();
		else if (e.key === "ArrowRight") carousel.next();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
					transform: translateX(calc(50% - 300px - {carousel.currentIndex * 620}px));
					transition: {carousel.isTransitioning ? 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'};
				"
			>
				{#each infiniteNews as item, i}
					{@render NewsCard(item, i)}
				{/each}
			</div>

			<button class="nav-btn nav-btn--prev" onclick={carousel.prev} aria-label="Попередній слайд">←</button>
			<button class="nav-btn nav-btn--next" onclick={carousel.next} aria-label="Наступний слайд">→</button>
		</div>

		<div class="focus-dots">
			{#each newsItems as _, i}
				<button
					class="f-dot"
					class:active={(carousel.currentIndex - 1 + newsItems.length) % newsItems.length === i}
					onclick={() => carousel.goTo(i)}
					aria-label="Слайд {i + 1}"
				></button>
			{/each}
		</div>
	</div>
</section>

{#snippet NewsCard(item: any, i: number)}
	<article class="focus-card" class:is-active={carousel.currentIndex === i}>
		<div class="focus-card__img-wrap" style="background: linear-gradient(45deg, {item.color || '#eee'}, #fff)">
			<PhotoIcon size={64} className="focus-card__placeholder" />
		</div>
		<div class="focus-card__content">
			<div class="focus-card__meta">
				<span class="tag">{item.category}</span>
				<time datetime="2024" class="date">{item.date}</time>
			</div>
			<h3 class="focus-card__title">{item.title}</h3>
			<p class="focus-card__excerpt">Дізнайтеся більше про останні події, успіхи наших учнів та цікаві заходи у мистецькій школі.</p>
			<a href={`${base}/news/${item.id}`} class="btn-more">Читати далі →</a>
		</div>
	</article>
{/snippet}

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

<style>
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
</style>
