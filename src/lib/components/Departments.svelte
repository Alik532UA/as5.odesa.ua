<script lang="ts">
	import PianoIcon from "./icons/PianoIcon.svelte";
	import StringsIcon from "./icons/StringsIcon.svelte";
	import VocalIcon from "./icons/VocalIcon.svelte";
	import PopIcon from "./icons/PopIcon.svelte";
	import TheoryIcon from "./icons/TheoryIcon.svelte";
	import FolkIcon from "./icons/FolkIcon.svelte";
</script>

<section class="departments" id="departments" aria-label="Відділи школи">
	<div class="container">
		<div class="departments__grid">
			<!-- Фортепіанний відділ -->
			<article class="dept-card" id="dept-piano">
				<div class="dept-card__icon-wrap">
					<PianoIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Фортепіанний відділ</h3>
			</article>

			<!-- Відділ струнно-смичкових інструментів -->
			<article class="dept-card" id="dept-strings">
				<div class="dept-card__icon-wrap">
					<StringsIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Відділ струнно-смичкових інструментів</h3>
			</article>

			<!-- Відділ сольного співу -->
			<article class="dept-card" id="dept-vocal">
				<div class="dept-card__icon-wrap">
					<VocalIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Відділ сольного співу</h3>
			</article>

			<!-- Естрадний відділ -->
			<article class="dept-card" id="dept-pop">
				<div class="dept-card__icon-wrap">
					<PopIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Естрадний відділ</h3>
			</article>

			<!-- Відділ теоретичних дисциплін -->
			<article class="dept-card" id="dept-theory">
				<div class="dept-card__icon-wrap">
					<TheoryIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Відділ теоретичних дисциплін</h3>
			</article>

			<!-- Відділ народних інструментів -->
			<article class="dept-card" id="dept-folk">
				<div class="dept-card__icon-wrap">
					<FolkIcon className="dept-card__icon" />
				</div>
				<h3 class="dept-card__name">Відділ народних інструментів</h3>
			</article>
		</div>
	</div>
</section>

<style>
	.departments {
		background: var(--color-white);
		padding: var(--space-4xl) 0;
		position: relative;
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

	:global(.dept-card__icon) {
		transition: transform var(--transition-base);
	}

	.dept-card:hover :global(.dept-card__icon) {
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
			grid-template-columns: 1fr;
			max-width: 320px;
			margin: 0 auto;
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
