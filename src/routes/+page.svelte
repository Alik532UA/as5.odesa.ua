<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Departments from '$lib/components/Departments.svelte';
	import Wave from '$lib/components/Wave.svelte';
	import { t } from 'svelte-i18n';
	import { onMount } from 'svelte';
	
	let showDepartments = $state(false);
	let departmentsRef: HTMLElement | null = $state(null);

	onMount(() => {
		if (typeof window !== 'undefined' && 'IntersectionObserver' in window && departmentsRef) {
			const observer = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting) {
					showDepartments = true;
					observer.disconnect();
				}
			}, { rootMargin: '200px' });
			observer.observe(departmentsRef);
			return () => observer.disconnect();
		} else {
			// Fallback if no IntersectionObserver or SSR
			showDepartments = true;
		}
	});

	const galleryImages = $derived([
		{ src: '/photo/photoForMainPage-01.jpg', alt: 'School Life 1', title: $t('gallery.items.process') },
		{ src: '/photo/photoForMainPage-03.jpg', alt: 'School Life 2', title: $t('gallery.items.talents') },
		{ src: '/photo/photoForMainPage-04.jpg', alt: 'School Life 3', title: $t('gallery.items.atmosphere') },
		{ src: '/photo/photoForMainPage-06.jpg', alt: 'School Life 4', title: $t('gallery.items.evenings') },
		{ src: '/photo/photoForMainPage-07.jpg', alt: 'School Life 5', title: $t('gallery.items.virtuosos') },
		{ src: '/photo/photoForMainPage-08.jpg', alt: 'School Life 6', title: $t('gallery.items.harmony') },
	]);
</script>

<Hero />

<div bind:this={departmentsRef} class="lazy-section">
	{#if showDepartments}
		<Departments />
	{:else}
		<div style="height: 600px; display: flex; align-items: center; justify-content: center; background: var(--color-light-blue);">
			Завантаження...
		</div>
	{/if}
</div>

<!-- Bento Grid 4:3 Section -->
<div class="section-divider section-divider--top" aria-hidden="true">
	<div class="section-divider__wave">
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

<section class="gallery-bento" id="gallery-bento">
	<div class="container">
		<div class="gallery-bento__header">
			<h2 class="gallery-bento__title">{$t('gallery.title')}</h2>
			<p class="gallery-bento__subtitle">{$t('gallery.subtitle')}</p>
		</div>

		<div class="g-bento-4x3">
			{#each galleryImages as img}
				<div class="g-bento-4x3__item">
					<img src={img.src} alt={img.alt} />
					<div class="g-bento-4x3__overlay">
						<span class="g-bento-4x3__caption">{img.title}</span>
					</div>
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
		grid-template-columns: repeat(3, 1fr);
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

	.g-bento-4x3__overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,95,174,0.85), transparent 60%);
		display: flex;
		align-items: flex-end;
		padding: 2.5rem;
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.g-bento-4x3__item:hover .g-bento-4x3__overlay {
		opacity: 1;
	}

	.g-bento-4x3__caption {
		display: block;
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		transform: translateY(20px);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.g-bento-4x3__item:hover .g-bento-4x3__caption {
		transform: translateY(0);
	}

	@media (max-width: 1024px) {
		.g-bento-4x3 {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.gallery-bento__title {
			font-size: 2.2rem;
		}
		.g-bento-4x3 {
			grid-template-columns: repeat(2, 1fr);
			gap: 16px;
		}
		.g-bento-4x3__item {
			border-radius: 32px;
		}
	}

	@media (max-width: 480px) {
		.g-bento-4x3 {
			grid-template-columns: 1fr;
		}
	}
</style>
