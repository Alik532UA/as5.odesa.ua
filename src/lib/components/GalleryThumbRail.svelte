<script lang="ts">
	import { t } from 'svelte-i18n';

	/**
	 * Стрічка квадратних прев'ю ліворуч від світлини.
	 *
	 * Окремим файлом не через розмір, а через відповідальність: тут своя
	 * прокрутка, свій стан «активне на видноті» й свої розміри, і жодне з
	 * цього лайтбоксу знати не треба — йому досить сказати, яку світлину
	 * обрали.
	 *
	 * Контракт навмисно вужчий за `LightboxImage`: стрічці потрібен лише
	 * шлях до файлу, і просити більше означало б прив'язати її до чужої
	 * структури без причини.
	 */

	interface Props {
		images: { src: string }[];
		/** Номер поточної світлини — підсвічується й тримається на видноті. */
		index: number;
		onpick: (index: number) => void;
	}

	let { images, index, onpick }: Props = $props();

	/** Кнопки прев'ю за номерами — щоб підтягувати активну у видиму частину. */
	const thumbEls: HTMLElement[] = [];

	/**
	 * Стрілками й колесом можна піти далеко за край стрічки; без цього
	 * підсвічене прев'ю опинялося б за екраном, і стрічка показувала б
	 * положення, яке вже неправда.
	 */
	$effect(() => {
		thumbEls[index]?.scrollIntoView({ block: 'nearest' });
	});
</script>

<div class="lightbox-rail" data-testid="photo-lightbox-thumb-list">
	{#each images as img, i (img.src)}
		<button
			type="button"
			class="lightbox-thumb"
			class:lightbox-thumb--active={i === index}
			bind:this={thumbEls[i]}
			onclick={() => onpick(i)}
			aria-label={$t('common.goToPhoto', { values: { number: i + 1 } })}
			aria-current={i === index ? 'true' : undefined}
			data-testid="photo-lightbox-thumb-{i}-btn"
		>
			<img src={img.src} alt="" loading="lazy" decoding="async" />
		</button>
	{/each}
</div>

<style>
	.lightbox-rail {
		/*
		 * `--lightbox-rail` оголошено в `PhotoLightbox.svelte` і приходить сюди
		 * успадкуванням: те саме число задає відступ стрілки «назад» і межу
		 * зображення, тобто живе в батьківському. Виняток названо поіменно в
		 * `CROSS_COMPONENT` (`src/css-variables.test.ts`).
		 */
		/*
		 * Притиснута до краю вікна, а не поставлена першим елементом у ряд.
		 *
		 * У ряді її разом із фотографією центрував `justify-content: center`,
		 * тобто ліворуч лишалася порожнеча — і стрічка починалася не там, де
		 * думала стрілка «назад», яку відсувають на ширину стрічки. Заміряно:
		 * стрічка стояла на 64…168, стрілка — на 128…184, просто поверх неї.
		 * Відступ бере на себе `padding-left` підкладки.
		 */
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--lightbox-rail);
		overflow-y: auto;
		/* Дійшовши до кінця стрічки, колесо не передає прокрутку далі. */
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		/*
		 * `safe`, а не просто `center`.
		 *
		 * Коли прев'ю більше, ніж влазить, звичайне центрування розкидає
		 * надлишок на ОБИДВА боки — і верхні виїжджають за початок прокрутки,
		 * куди доскролити вже неможливо. `safe` у такому разі повертається до
		 * вирівнювання від початку, тож недосяжних прев'ю не буває.
		 */
		justify-content: safe center;
		gap: 10px;
		padding: 1rem 0.75rem;
		z-index: 100001;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
	}

	.lightbox-thumb {
		flex: none;
		width: 100%;
		/* Квадратні незалежно від пропорцій самої світлини. */
		aspect-ratio: 1 / 1;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 10px;
		overflow: hidden;
		background: none;
		cursor: pointer;
		opacity: 0.55;
		transition:
			opacity 0.2s ease,
			border-color 0.2s ease;
	}

	.lightbox-thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.lightbox-thumb:hover,
	.lightbox-thumb:focus-visible {
		opacity: 1;
	}

	.lightbox-thumb--active {
		opacity: 1;
		border-color: #ffffff;
	}

	@media (max-width: 768px) {
		.lightbox-rail {
			gap: 8px;
			padding: 0.75rem 0.5rem;
		}
	}
</style>
