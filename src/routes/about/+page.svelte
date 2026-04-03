<script lang="ts">
	import { t } from 'svelte-i18n';

	const galleryImages = $derived([
		{ src: '/photo/photoForAboutPage-01.jpg', alt: 'School Photo 1', title: $t('about.gallery.edu') },
		{ src: '/photo/photoForAboutPage-03.jpg', alt: 'School Photo 3', title: $t('about.gallery.musicians') },
		{ src: '/photo/photoForAboutPage-02.jpg', alt: 'School Photo 2', title: $t('about.gallery.workshop') },
		{ src: '/photo/photoForAboutPage-04.jpg', alt: 'School Photo 4', title: $t('about.gallery.stage') },
		{ src: '/photo/photoForAboutPage-05.jpg', alt: 'School Photo 5', title: $t('about.gallery.lesson') },
		{ src: '/photo/photoForAboutPage-06.jpg', alt: 'School Photo 6', title: $t('about.gallery.talents') },
		{ src: '/photo/photoForAboutPage-07.jpg', alt: 'School Photo 7', title: $t('about.gallery.festival') },
		{ src: '/photo/photoForAboutPage-08.jpg', alt: 'School Photo 8', title: $t('about.gallery.event') },
	]);
</script>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: 3rem; color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('about.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text); margin-bottom: 4rem;">
		<p style="margin-bottom: 1rem;">{$t('about.p1')}</p>
		<p style="margin-bottom: 1rem;">{$t('about.p2')}</p>
		<p style="margin-bottom: 1rem;">{$t('about.p3')}</p>
		<p>{$t('about.p4')}</p>
	</div>

	<div class="g-bento">
		{#each galleryImages as img, i}
			<div class="g-bento__item g-bento__item--{i}">
				<img src={img.src} alt={img.alt} width="1200" height="900" loading="lazy" decoding="async" />
				<div class="g-bento__overlay">
					<span class="g-bento__caption">{img.title}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.g-bento {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-auto-rows: 240px;
		gap: 24px;
	}
	.g-bento__item {
		position: relative;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 0 15px 35px rgba(0,0,0,0.05);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
		cursor: pointer;
	}
	.g-bento__item:hover {
		transform: translateY(-8px);
		box-shadow: 0 30px 60px rgba(0,0,0,0.12);
		z-index: 2;
	}
	.g-bento__item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-bento__item:hover img {
		transform: scale(1.08);
	}
	
	/* Adaptive Grid Spans */
	.g-bento__item--0 { grid-column: span 2; grid-row: span 2; }
	.g-bento__item--1 { grid-column: span 2; grid-row: span 1; }
	.g-bento__item--2 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--3 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--4 { grid-column: span 2; grid-row: span 1; }
	.g-bento__item--5 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--6 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--7 { grid-column: span 2; grid-row: span 1; }

	.g-bento__overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,95,174,0.85), transparent 60%);
		display: flex;
		align-items: flex-end;
		padding: 2rem;
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	.g-bento__item:hover .g-bento__overlay { opacity: 1; }
	.g-bento__caption {
		color: white;
		font-family: var(--font-heading);
		font-size: 1.2rem;
		font-weight: 800;
		transform: translateY(20px);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-bento__item:hover .g-bento__caption { transform: translateY(0); }

	@media (max-width: 1024px) {
		.g-bento { grid-template-columns: repeat(2, 1fr); }
		/* Reset spans for tablet */
		.g-bento__item { grid-column: span 1 !important; grid-row: span 1 !important; }
		.g-bento__item--0 { grid-column: span 2 !important; grid-row: span 2 !important; }
	}

	@media (max-width: 640px) {
		.g-bento { grid-template-columns: 1fr; grid-auto-rows: 200px; }
		.g-bento__item { grid-column: span 1 !important; grid-row: span 1 !important; border-radius: 32px; }
	}
</style>
