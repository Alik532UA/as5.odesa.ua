<script lang="ts">
	import PianoIcon from "./icons/PianoIcon.svelte";
	import StringsIcon from "./icons/StringsIcon.svelte";
	import VocalIcon from "./icons/VocalIcon.svelte";
	import PopIcon from "./icons/PopIcon.svelte";
	import TheoryIcon from "./icons/TheoryIcon.svelte";
	import FolkIcon from "./icons/FolkIcon.svelte";
	import type { Component } from "svelte";

	interface Department {
		id: string;
		name: string;
		icon: Component<any>;
	}

	const departments: Department[] = [
		{ id: "piano", name: "Фортепіанний відділ", icon: PianoIcon },
		{ id: "strings", name: "Відділ струнно-смичкових інструментів", icon: StringsIcon },
		{ id: "vocal", name: "Відділ сольного співу", icon: VocalIcon },
		{ id: "pop", name: "Естрадний відділ", icon: PopIcon },
		{ id: "theory", name: "Відділ теоретичних дисциплін", icon: TheoryIcon },
		{ id: "folk", name: "Відділ народних інструментів", icon: FolkIcon },
	];
</script>

{#snippet DeptCard({ name, icon: Icon, id }: Department)}
	<article class="dept-card" {id}>
		<div class="dept-card__icon-wrap">
			<Icon className="dept-card__icon" />
		</div>
		<h3 class="dept-card__name">{name}</h3>
	</article>
{/snippet}

<section class="departments" id="departments" aria-label="Відділи школи">
	<div class="container">
		<div class="departments__grid">
			{#each departments as dept (dept.id)}
				{@render DeptCard(dept)}
			{/each}
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
