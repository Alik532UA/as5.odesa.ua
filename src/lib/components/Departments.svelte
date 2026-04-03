<script lang="ts">
	// Removed SVG icon imports as we are now using PNG images
	// import PianoIcon from "./icons/PianoIcon.svelte";
	// import StringsIcon from "./icons/StringsIcon.svelte";
	// import VocalIcon from "./icons/VocalIcon.svelte";
	// import PopIcon from "./icons/PopIcon.svelte";
	// import TheoryIcon from "./icons/TheoryIcon.svelte";
	// import FolkIcon from "./icons/FolkIcon.svelte";
	
	import { t } from 'svelte-i18n'; // Ensure t is correctly imported

	interface Department {
		id: string;
		name: string;
		// Changed icon type to string for image path
		iconPath: string; 
	}

	const departments = $derived([
		{ id: "piano", name: $t("departments.list.piano"), iconPath: "/departments/piano.png" },
		{ id: "strings", name: $t("departments.list.strings"), iconPath: "/departments/strings.png" },
		{ id: "vocal", name: $t("departments.list.vocal"), iconPath: "/departments/vocal.png" },
		{ id: "pop", name: $t("departments.list.pop"), iconPath: "/departments/pop.png" },
		{ id: "theory", name: $t("departments.list.theory"), iconPath: "/departments/theory.png" },
		{ id: "folk", name: $t("departments.list.folk"), iconPath: "/departments/folk.png" },
	]);
</script>

{#snippet DeptCard({ name, iconPath, id }: Department)}
	<article class="dept-card" {id}>
		<div class="dept-card__icon-wrap">
			<!-- Render image instead of SVG icon -->
			<img src={iconPath} alt="{name} icon" class="dept-card__icon" width="160" height="160" loading="lazy" decoding="async" />
			<!-- SVG icons were the first version, kept here for reference -->
			<!-- <Icon className="dept-card__icon" size={80} /> -->
		</div>
		<h3 class="dept-card__name">{name}</h3>
	</article>
{/snippet}

<section class="departments" id="departments" aria-label="Відділи школи">
	<div class="container">
		<p class="departments__description">
			{$t('departments.description')}
		</p>
		<div class="departments__grid">
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
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2xl);
	}

	/* Card styles */
	.dept-card {
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
	}

	/* Responsive */
	@media (max-width: 768px) {
		.departments__grid {
			grid-template-columns: 1fr 1fr;
			gap: var(--space-lg);
		}

		.departments {
			padding: var(--space-2xl) 0;
		}
	}

	@media (max-width: 480px) {
		.departments__grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
		}

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

		.departments__description {
			font-size: 1.1rem;
			margin-bottom: var(--space-xl);
		}
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		.departments__grid {
			gap: var(--space-lg);
		}

		.dept-card {
			padding: var(--space-xl) var(--space-lg);
		}
	}
</style>
