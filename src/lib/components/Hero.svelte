<script lang="ts">
	import Wave from "./Wave.svelte";
	import { t } from "svelte-i18n";
	import { base } from "$app/paths";
</script>

<section class="hero" id="hero-section" aria-label="Головна секція">

	<div class="hero__content container">
		<div class="hero__text">
			<h1 class="hero__title" id="hero-title">
				{$t("hero.title")}
			</h1>
			<p class="hero__subtitle">{$t("hero.subtitle")}</p>
			<p class="hero__story">
				{$t("hero.story")}
			</p>
		</div>

		<div class="hero__image-wrap">
			<div class="hero__image" id="hero-image">
				<img
					src={`${base}/photo/photoForMainPage-02.jpg`}
					alt=""
					width="1200"
					height="900"
					loading="eager"
					fetchpriority="high"
					decoding="async"
				/>
			</div>
			<!-- Decorative blue cloud shapes -->
			<div class="hero__cloud hero__cloud--1" aria-hidden="true"></div>
			<div class="hero__cloud hero__cloud--2" aria-hidden="true"></div>
		</div>
	</div>

	<!-- Wave divider at bottom -->
	<div class="hero__waves" aria-hidden="true">
		<Wave
			className="hero__wave-svg"
			height={110}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="var(--theme-wave-stroke)"
			strokeWidth={15}
		/>
	</div>
</section>

<style>
	.hero {
		position: relative;
		background: linear-gradient(
			180deg,
			var(--color-light-blue) 0%,
			var(--color-sky-blue) 60%,
			var(--color-white) 100%
		);
		padding: calc(var(--header-height) + var(--space-4xl)) 0
			var(--space-4xl);
		overflow: hidden;
		min-height: 600px;
		transition: background 800ms ease-in-out;
	}

	:global(.app.with-dynamic-bg) .hero {
		background: transparent;
	}

	/* Content layout */
	.hero__content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3xl);
		align-items: center;
		position: relative;
	}

	/* Text — Highest Layer */
	.hero__text {
		position: relative;
		z-index: 10;
		animation: fadeInUp 0.8s ease-out;
	}

	.hero__title {
		font-family: var(--font-heading);
		font-size: clamp(2.2rem, 5vw, 3.5rem);
		font-weight: 900;
		text-transform: uppercase;
		color: var(--color-deep-ocean);
		line-height: 1.1;
		margin-bottom: var(--space-lg);
		letter-spacing: -0.01em;
	}

	.hero__subtitle {
		font-family: var(--font-heading);
		font-size: clamp(1rem, 2vw, 1.25rem);
		font-weight: 500;
		color: var(--color-body-text);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xl);
	}

	.hero__story {
		font-family: var(--font-body);
		font-size: 1.1rem;
		line-height: 1.7;
		color: var(--color-body-text);
		background: var(--theme-hero-story-bg);
		padding: var(--space-lg);
		border-left: 4px solid var(--color-golden);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		animation: fadeInUp 0.8s ease-out 0.3s both;
		font-style: italic;
		text-align: left;
	}

	/* Image area — Lower than seagulls */
	.hero__image-wrap {
		position: relative;
		z-index: 2;
		animation: fadeInUp 0.8s ease-out 0.2s both;
	}

	.hero__image {
		width: 100%;
		aspect-ratio: 4 / 3;
		min-height: 300px;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: var(--theme-image-shadow);
		cursor: pointer;
	}

	.hero__image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero__image:hover img {
		transform: scale(1.08);
	}

	/* Decorative clouds */
	.hero__cloud {
		position: absolute;
		border-radius: 50%;
		z-index: -1;
	}

	.hero__cloud--1 {
		width: 200px;
		height: 200px;
		background: radial-gradient(
			circle,
			var(--theme-cloud-strong) 0%,
			transparent 70%
		);
		top: -30px;
		right: -40px;
	}

	.hero__cloud--2 {
		width: 150px;
		height: 150px;
		background: radial-gradient(
			circle,
			var(--theme-cloud-soft) 0%,
			transparent 70%
		);
		bottom: -20px;
		left: -30px;
	}

	/* Wave divider — Lower than seagulls if needed */
	.hero__waves {
		position: absolute;
		bottom: -5px;
		left: 0;
		right: 0;
		z-index: 4;
		line-height: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding-top: calc(var(--header-height) + var(--space-2xl));
			min-height: auto;
		}

		.hero__content {
			grid-template-columns: 1fr;
			gap: var(--space-xl);
			text-align: center;
		}

		.hero__image {
			min-height: 220px;
		}

	}
</style>
