<script lang="ts">
	import Wave from "./Wave.svelte";
	import Seagull from "./ui/Seagull.svelte";
	import { t } from "svelte-i18n";
</script>

<section class="hero" id="hero-section" aria-label="Головна секція">
	<!-- Decorative seagulls — adjusted sizes -->
	<Seagull className="hero__seagull hero__seagull--1" size={60} />
	<Seagull className="hero__seagull hero__seagull--2" size={45} />
	<Seagull className="hero__seagull hero__seagull--3" size={35} />
	<Seagull className="hero__seagull hero__seagull--4" size={50} />
	<Seagull className="hero__seagull hero__seagull--5" size={42} />

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
					src="/photo/photoForMainPage-02.jpg"
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
			color="#005fae"
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
	}

	:global(.app.with-dynamic-bg) .hero {
		background: linear-gradient(
			180deg,
			rgba(234, 246, 251, 0.86) 0%,
			rgba(214, 238, 245, 0.78) 60%,
			rgba(255, 255, 255, 0.72) 100%
		);
	}

	:global(.dark-theme .app.with-dynamic-bg) .hero {
		background: linear-gradient(
			180deg,
			rgba(13, 31, 45, 0.86) 0%,
			rgba(26, 58, 74, 0.78) 60%,
			rgba(18, 37, 51, 0.72) 100%
		);
	}

	/* Seagulls Layering */
	:global(.hero__seagull) {
		position: absolute;
		animation: seagullFly 4s ease-in-out infinite;
		z-index: 5; /* Above images and buttons, below text */
		color: #36c7f3;
		opacity: 0.8;
	}

	:global(.hero__seagull--1) {
		top: 18%;
		right: 35%;
		animation-delay: 0s;
	}

	:global(.hero__seagull--2) {
		top: 16%;
		right: 14%;
		animation-delay: 1s;
	}

	:global(.hero__seagull--3) {
		top: 25%;
		right: 45%;
		animation-delay: 2s;
	}

	:global(.hero__seagull--4) {
		top: 14%;
		right: 62%;
		animation-delay: 0.5s;
	}

	:global(.hero__seagull--5) {
		top: 30%;
		right: 68%;
		animation-delay: 1.5s;
	}

	/* Content layout */
	.hero__content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3xl);
		align-items: center;
		position: relative;
		z-index: 1; /* Base layer */
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
		background: rgba(255, 255, 255, 0.5);
		padding: var(--space-lg);
		border-left: 4px solid var(--color-golden);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		animation: fadeInUp 0.8s ease-out 0.3s both;
		font-style: italic;
		text-align: left;
	}

	:global(.dark-theme) .hero__story {
		background: rgba(255, 255, 255, 0.05);
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
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
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
			rgba(33, 150, 186, 0.15) 0%,
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
			rgba(33, 150, 186, 0.1) 0%,
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

		:global(.hero__seagull--1) {
			top: 24%;
			right: 48%;
		}

		:global(.hero__seagull--2) {
			top: 10%;
			right: 8%;
		}

		:global(.hero__seagull--3),
		:global(.hero__seagull--4),
		:global(.hero__seagull--5) {
			display: none;
		}
	}
</style>
