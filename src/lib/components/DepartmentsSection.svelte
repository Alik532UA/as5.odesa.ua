<script lang="ts">
	import { asset } from '$app/paths';
	import { t } from 'svelte-i18n';

	interface Department {
		id: string;
		name: string;
		iconPath: string;
		description?: string;
	}

	const departments = $derived([
		{ id: "piano", name: $t("departments.list.piano"), iconPath: asset('/departments/piano.png') },
		{ id: "strings", name: $t("departments.list.strings"), iconPath: asset('/departments/strings.png'), description: $t("departments.descriptions.strings") },
		{ id: "vocal", name: $t("departments.list.vocal"), iconPath: asset('/departments/vocal.png') },
		{ id: "pop", name: $t("departments.list.pop"), iconPath: asset('/departments/pop.png'), description: $t("departments.descriptions.pop") },
		{ id: "theory", name: $t("departments.list.theory"), iconPath: asset('/departments/theory.png') },
		{ id: "folk", name: $t("departments.list.folk"), iconPath: asset('/departments/folk.png'), description: $t("departments.descriptions.folk") },
	]);
</script>

{#snippet DeptCard({ name, iconPath, id, description }: Department)}
	<!-- Обгортка існує рівно заради `container-type`: елемент не може питати
	     власну ширину, бо сам її й задає. Ширину слота призначає сітка, і ніщо
	     всередині картки на неї не впливає — саме тому запит стабільний.
	     Поставити `container-type` на саму `.dept-card` не можна: її паддінг
	     залежав би від заміру, а замір — від паддінга (FLUID-SIZING-v8 § 7A). -->
	<div class="dept-card-slot">
	<article class="dept-card" {id} data-testid="department-card-{id}">
		<div class="dept-card__icon-wrap">
			<!-- Render image instead of SVG icon -->
			<img src={iconPath} alt="{name} icon" class="dept-card__icon" width="160" height="160" loading="lazy" decoding="async" data-testid="department-icon-{id}" />
			<!-- SVG icons were the first version, kept here for reference -->
			<!-- <Icon className="dept-card__icon" size={80} /> -->
		</div>
		<h3 class="dept-card__name">{name}</h3>
		{#if description}
			<p class="dept-card__description">{description}</p>
		{/if}
	</article>
	</div>
{/snippet}

<section class="departments" id="departments" aria-label={$t("a11y.departmentsSection")} data-testid="departments-section">
	<div class="container">
		<p class="departments__description">
			{$t('departments.description')}
		</p>
		<div class="departments__grid" data-testid="departments-list">
			{#each departments as dept (dept.id)}
				{@render DeptCard(dept)}
			{/each}
		</div>
		<p class="departments__additional-info">
			{$t('departments.additional_info')}
		</p>
	</div>
</section>

<style>
	.departments {
		background: var(--color-white);
		padding: var(--space-4xl) 0;
		position: relative;
		transition: background 800ms ease-in-out;
	}

	:global(.app.with-dynamic-bg) .departments {
		background: transparent;
	}

	.departments__description {
		font-family: var(--font-body);
		font-size: 1.25rem;
		color: var(--color-deep-ocean);
		text-align: center;
		margin-bottom: var(--space-3xl);
		font-weight: 500;
	}

	.departments__additional-info {
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--color-body-text);
		line-height: 1.7;
		text-align: center;
		margin-top: 64px;
		margin-bottom: 0px;
		max-width: 800px; /* Constrain width for better readability */
		margin-left: auto;
		margin-right: auto;
	}

	.departments__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-2xl);
	}

	/*
	 * КОНТЕЙНЕР ВИМІРЮВАННЯ (FLUID-SIZING-v8 § 7A, `FS-CONTAINER`, HIGH).
	 *
	 * До 2026-08-28 вигляд картки залежав від ширини ВІКНА, хоч картка стоїть у
	 * сітці й ширину дістає від неї. Заміряно в браузері — ось що з цього
	 * виходило:
	 *
	 *   вікно 769 → 3 колонки → картка 219 px → паддінг 32/24, іконка 80
	 *   вікно 768 → 2 колонки → картка 340 px → паддінг 48/32, іконка 80
	 *   вікно 481 → 2 колонки → картка 197 px → паддінг 48/32, іконка 80
	 *   вікно 480 → 2 колонки → картка 200 px → паддінг 24/8,  іконка 60
	 *
	 * Дві середні пари — це і є дефект у чистому вигляді. Картка на 197 px
	 * діставала НАЙБІЛЬШИЙ паддінг (48 px згори, 32 з боків — тобто на текст
	 * лишалося 133 px), а сусіднє значення 200 px — найменший. Три пікселі
	 * різниці, протилежне оформлення: вікно перетнуло 480, а картка ні.
	 * Дзеркально вгорі: 219 px діставала середній паддінг, а 340 px — більший.
	 *
	 * Тепер поріг стоїть на тому, що справді впливає: на ширині, яку картка
	 * ОТРИМАЛА. Кількість колонок лишається за `@media` — її контейнерним
	 * запитом не порахувати, бо в момент заміру колонок ще немає.
	 */
	.dept-card-slot {
		container-type: inline-size;
		container-name: dept-card;
	}

	/* Card styles */
	.dept-card {
		height: 100%;
		background: var(--color-white);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		transition: all var(--transition-base);
		cursor: default;
	}

	.dept-card:hover {
		transform: translateY(-6px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-sea-blue);
	}

	.dept-card__icon-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-lg);
	}

	/* Image styles */
	.dept-card__icon {
		width: 80px; /* Keep the size from previous step */
		height: 80px;
		object-fit: contain; /* Ensure image is scaled correctly */
		transition: transform var(--transition-base);
	}

	.dept-card:hover .dept-card__icon {
		transform: scale(1.05);
	}

	.dept-card__name {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--color-deep-ocean);
		letter-spacing: 0.02em;
		line-height: 1.3;
		margin-bottom: var(--space-sm);
	}

	.dept-card__description {
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--color-body-text);
		line-height: 1.4;
		margin: 0;
	}

	/*
	 * ВИГЛЯД КАРТКИ — від місця, яке вона отримала.
	 *
	 * Пороги взяті із заміру, а не з круглих чисел: 280 px відділяє картку в
	 * три колонки на широкому екрані (304–347) від тісної (219–263), а 220 px —
	 * той рубіж, за яким на текст лишається менше половини ширини.
	 */
	@container dept-card (max-width: 280px) {
		.dept-card {
			padding: var(--space-xl) var(--space-lg);
		}
	}

	@container dept-card (max-width: 220px) {
		.dept-card {
			padding: var(--space-lg) var(--space-sm);
			border-radius: var(--radius-md);
		}

		.dept-card__icon {
			width: 60px;
			height: 60px;
		}

		.dept-card__name {
			font-size: 0.8rem;
		}

		.dept-card__description {
			font-size: 0.75rem;
		}
	}

	/*
	 * ВІКНО лишається за `@media`, і це не залишки: тут рівно те, що справді є
	 * властивістю сторінки, а не картки, — кількість колонок (контейнерним
	 * запитом її не порахувати: у момент заміру колонок ще немає), відступи
	 * секції та розмір її власного вступного абзацу.
	 */
	@media (max-width: 768px) {
		.departments__grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--space-lg);
		}

		.departments {
			padding: var(--space-2xl) 0;
		}
	}

	@media (max-width: 480px) {
		.departments__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-md);
		}

		.departments__description {
			font-size: 1.1rem;
			margin-bottom: var(--space-xl);
		}
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		.departments__grid {
			gap: var(--space-lg);
		}
	}
</style>
