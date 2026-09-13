<script lang="ts">
	import { ChevronLeft, ChevronRight, X } from 'lucide-svelte';
	import { t } from 'svelte-i18n';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { galleryGestures } from '$lib/actions/galleryGestures';
	import GalleryThumbRail from './GalleryThumbRail.svelte';
	import { acceptsShortcut } from '$lib/services/keyboard';
	import { browser } from '$app/environment';

	/**
	 * Портал: переміщує елемент у `document.body`, щоб він вийшов з будь-якого
	 * stacking context предків. Без цього `position: fixed; z-index: 99999` не
	 * допомагає, бо хедер зі `z-index: 100` лежить в іншому контексті.
	 */
	function portal(node: HTMLElement) {
		const target = document.body;
		target.appendChild(node);
		return {
			destroy() {
				if (node.parentNode === target) {
					target.removeChild(node);
				}
			}
		};
	}

	export interface LightboxImage {
		src: string;
		alt?: string;
		title?: string;
	}

	interface Props {
		images: LightboxImage[];
		currentIndex?: number;
		isOpen: boolean;
		onclose: () => void;
	}

	let { images, currentIndex = 0, isOpen, onclose }: Props = $props();

	let index = $state(0);

	$effect(() => {
		if (isOpen) {
			index = currentIndex;
		}
	});

	// Lock body scroll when open
	$effect(() => {
		if (!browser) return;
		if (isOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	});

	function prev() {
		if (images.length <= 1) return;
		index = (index - 1 + images.length) % images.length;
	}

	function next() {
		if (images.length <= 1) return;
		index = (index + 1) % images.length;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		// Конвенція проєкту (HK-TEXT-ENTRY-GUARD): слухач на вікні мусить
		// вийти, коли людина друкує. Усередині лайтбокса полів немає, але
		// правило глобальне, і гейт `hotkeys.test.ts` звіряє саме його.
		if (!acceptsShortcut(e)) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			next();
		}
	}

</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && images.length > 0}
	{@const currentImg = images[index] || images[0]}
	<div
		class="lightbox-backdrop"
		class:has-rail={images.length > 1}
		role="dialog"
		aria-modal="true"
		aria-label={$t('common.gallery')}
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) onclose(); }}
		data-testid="photo-lightbox-backdrop"
		use:portal
		use:focusTrap
		use:galleryGestures={{
			count: images.length,
			next,
			prev,
			// Над стрічкою колесо прокручує саму стрічку: там воно потрібніше.
			ignore: '.lightbox-rail'
		}}
	>
		<!-- Close button -->
		<button
			type="button"
			class="lightbox-close"
			onclick={onclose}
			aria-label={$t('common.close')}
			data-testid="photo-lightbox-close-btn"
		>
			<X size={28} />
		</button>

		<!--
			Стрічка прев'ю. Показані ВСІ світлини галереї, а поточна підсвічена:
			перелік «решти» без поточної не давав би відповіді на питання «де я
			зараз» — а саме його й ставлять, дивлячись на таку стрічку.
		-->
		{#if images.length > 1}
			<GalleryThumbRail {images} {index} onpick={(i) => (index = i)} />
		{/if}

		<!-- Prev button -->
		{#if images.length > 1}
			<button
				type="button"
				class="lightbox-nav lightbox-nav--prev"
				onclick={prev}
				aria-label={$t('common.prev')}
				data-testid="photo-lightbox-prev-btn"
			>
				<ChevronLeft size={36} />
			</button>
		{/if}

		<!-- Main Image container -->
		<div class="lightbox-content">
			<!--
				`{#key}` — щоб зміна кадру була видимою.

				Без нього при гортанні мінявся лише `src` того самого вузла:
				анімація з'яви вже відіграла при відкритті й удруге не
				запускається, тож нова світлина просто підмінялася в тому ж
				місці. Ключ змушує вузол народитися заново — разом з анімацією.

				Порожнього кадру між ними не буває: стрічка прев'ю тягне ТІ САМІ
				файли, тож усі вони вже в кеші браузера.
			-->
			{#key index}
				<img
					src={currentImg.src}
					alt={currentImg.alt || currentImg.title || ''}
					class="lightbox-img"
					data-testid="photo-lightbox-img"
				/>
			{/key}

			<!-- Caption and Counter -->
			<div class="lightbox-footer">
				<!--
					Підпис прибрано на прохання автора — лишається тут, а не
					видаляється, бо може повернутися. Разом із ним закоментовано
					й правило `.lightbox-caption` нижче: `svelte-check` вважає
					селектор без розмітки невикористаним і зробив би з цього
					попередження, а гейт проєкту тримає їх на нулі.
				-->
				<!--
				{#if currentImg.title || currentImg.alt}
					<p class="lightbox-caption">{currentImg.title || currentImg.alt}</p>
				{/if}
				-->
				{#if images.length > 1}
					<span class="lightbox-counter">{index + 1} / {images.length}</span>
				{/if}
			</div>
		</div>

		<!-- Next button -->
		{#if images.length > 1}
			<button
				type="button"
				class="lightbox-nav lightbox-nav--next"
				onclick={next}
				aria-label={$t('common.next')}
				data-testid="photo-lightbox-next-btn"
			>
				<ChevronRight size={36} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.lightbox-backdrop {
		/*
		 * Ширина стрічки прев'ю живе змінною, бо її віднімають одразу троє:
		 * сама стрічка, відступ стрілки «назад» і межа зображення. Без однієї
		 * назви на всіх ці три числа розійшлися б — стрілка налізла б на
		 * стрічку або зависла в порожнечі.
		 */
		--lightbox-rail: 0px;
		position: fixed;
		inset: 0;
		z-index: 99999;
		background: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		display: flex;
		align-items: center;
		justify-content: center;
		/* Місце під стрічку прев'ю: вона виведена з потоку й притиснута до краю,
		   тож центрування нижче рахується вже від її правого боку. */
		padding-left: var(--lightbox-rail);
		animation: lightboxFadeIn 0.25s ease-out;
		user-select: none;
	}

	.lightbox-backdrop.has-rail {
		--lightbox-rail: 104px;
	}

	@keyframes lightboxFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.lightbox-close {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 100001;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ffffff;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.3);
		/* Оберт і масштаб — спільне правило в global.css (UI-ELEMENTS-v9 § 1.1).
		   Власний `transform` тут переважував би його через scoping Svelte. */
	}

	.lightbox-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 100001;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ffffff;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.lightbox-nav:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-50%) scale(1.1);
	}

	.lightbox-nav--prev { left: calc(var(--lightbox-rail) + 1.5rem); }
	.lightbox-nav--next { right: 1.5rem; }

	.lightbox-content {
		/* Займає все, що лишила стрічка, і центрує зображення САМЕ в цьому
		   залишку — інакше воно стояло б по центру екрана, тобто зсунутим
		   праворуч відносно власного вільного місця. */
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		max-width: calc(90vw - var(--lightbox-rail));
		max-height: 85dvh;
		position: relative;
		pointer-events: none;
	}

	.lightbox-img {
		max-width: 100%;
		max-height: 78dvh;
		object-fit: contain;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		pointer-events: auto;
		animation: imgZoomIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* Починається з нуля, а не з 0.8: попереднє значення давало ледь помітний
	   зсув, і перемикання читалося як різка підміна. */
	@keyframes imgZoomIn {
		from { transform: scale(0.96); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.lightbox-footer {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		color: #ffffff;
		text-align: center;
		pointer-events: auto;
	}

	/* Підпис прибрано разом із розміткою вище; правило чекає на повернення.
	.lightbox-caption {
		font-family: var(--font-heading, sans-serif);
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
	}
	*/

	.lightbox-counter {
		font-size: 0.85rem;
		opacity: 0.75;
		background: rgba(255, 255, 255, 0.15);
		padding: 0.2rem 0.8rem;
		border-radius: 12px;
	}

	@media (max-width: 768px) {
		.lightbox-close {
			top: 1rem;
			right: 1rem;
			width: 40px;
			height: 40px;
		}

		.lightbox-nav {
			width: 44px;
			height: 44px;
		}

		.lightbox-nav--prev { left: calc(var(--lightbox-rail) + 0.5rem); }
		.lightbox-nav--next { right: 0.5rem; }

		/* Стрічка лишається ліворуч, але вужча: на телефоні кожен її піксель
		   забирається просто із зображення. */
		.lightbox-backdrop.has-rail {
			--lightbox-rail: 72px;
		}

		.lightbox-img {
			max-width: 100%;
			max-height: 70dvh;
		}
	}
</style>
