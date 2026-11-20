<script lang="ts">
	import type { EducationalProgram } from '$lib/data/educationalPrograms';
	import CurriculumTable from './CurriculumTable.svelte';
	import { asset } from '$app/paths';
	import { t, locale } from 'svelte-i18n';
	import { FileText, Download, ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-svelte';

	interface Props {
		program: EducationalProgram;
		onOpenStamp: (program: EducationalProgram) => void;
	}

	let { program, onOpenStamp }: Props = $props();
	let isPlanOpen = $state(false);

	const isUk = $derived($locale !== 'en');
	const currentTitle = $derived(isUk ? program.title.uk : program.title.en);
	const currentDuration = $derived(isUk ? program.duration.uk : program.duration.en);
	const currentInstruments = $derived(isUk ? program.instruments.uk : program.instruments.en);

	function togglePlan() {
		isPlanOpen = !isPlanOpen;
	}
</script>

<article class="program-card" class:program-card--current={program.isCurrent} data-testid="program-card-{program.id}">
	<div class="program-card__badge-row" data-testid="program-badge-row-{program.id}">
		<span class="program-badge program-badge--level" data-testid="program-badge-level-{program.id}">
			{program.level === 'elementary' ? (isUk ? 'Елементарний підрівень' : 'Elementary Level') : (isUk ? 'Базовий підрівень' : 'Basic Level')}
		</span>
		<span class="program-badge program-badge--year" data-testid="program-badge-year-{program.id}">
			{program.year} {program.isCurrent ? (isUk ? '• Чинна' : '• Current') : (isUk ? '• Архів' : '• Archive')}
		</span>
		<span class="program-badge program-badge--format" data-testid="program-badge-format-{program.id}">
			PDF &bull; {program.pdfSize}
		</span>
		<span class="program-badge program-badge--pages" data-testid="program-badge-pages-{program.id}">
			{program.pdfPages} {$t('documents.pages')}
		</span>
	</div>

	<div class="program-card__header">
		<div class="program-card__icon-box" aria-hidden="true">
			<FileText size={32} />
		</div>
		<div class="program-card__title-area">
			<h3 class="program-card__title" data-testid="program-title-{program.id}">{currentTitle}</h3>
			<p class="program-card__duration" data-testid="program-duration-text-{program.id}">
				<strong>{$t('documents.duration')}</strong> {currentDuration} &bull; <strong>{$t('documents.weeklyLoad')}</strong> {program.weeklyHours}
			</p>
		</div>
	</div>

	<div class="program-card__desc">
		<p class="program-card__instruments" data-testid="program-instruments-text-{program.id}">
			<strong>{$t('documents.instruments')}</strong> {currentInstruments}
		</p>
	</div>

	<!-- Action Toolbar -->
	<div class="program-card__actions" data-testid="program-actions-toolbar-{program.id}">
		<a
			href={asset(program.pdfUrl)}
			download
			class="btn-doc btn-doc--primary touch-target"
			data-testid="program-download-pdf-link-{program.id}"
		>
			<Download size={17} aria-hidden="true" />
			<span>{$t('documents.downloadPdf')}</span>
		</a>

		<a
			href={asset(program.pdfUrl)}
			target="_blank"
			rel="noopener noreferrer"
			class="btn-doc btn-doc--outline touch-target"
			data-testid="program-view-pdf-link-{program.id}"
		>
			<ExternalLink size={17} aria-hidden="true" />
			<span>{$t('documents.openPdf')}</span>
		</a>

		<button
			type="button"
			class="btn-doc btn-doc--outline touch-target"
			onclick={() => onOpenStamp(program)}
			data-testid="program-stamp-btn-{program.id}"
		>
			<ShieldCheck size={17} aria-hidden="true" />
			<span>{$t('documents.stampScan')}</span>
		</button>

		<button
			type="button"
			class="btn-doc btn-doc--text touch-target"
			onclick={togglePlan}
			aria-expanded={isPlanOpen}
			data-testid="program-toggle-plan-btn-{program.id}"
		>
			<span>{$t('documents.curriculumTitle')}</span>
			{#if isPlanOpen}
				<ChevronUp size={16} aria-hidden="true" />
			{:else}
				<ChevronDown size={16} aria-hidden="true" />
			{/if}
		</button>
	</div>

	{#if isPlanOpen}
		<CurriculumTable {program} />
	{/if}
</article>

<style>
	.program-card {
		background: var(--color-white);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		box-shadow: var(--shadow-sm);
		transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
	}

	.program-card--current {
		border-color: color-mix(in srgb, var(--color-sea-blue) 40%, var(--color-border));
		background: linear-gradient(180deg, var(--color-white) 0%, color-mix(in srgb, var(--color-sea-blue) 4%, var(--color-white)) 100%);
	}

	.program-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--color-sea-blue);
	}

	.program-card__badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.program-badge {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.program-badge--level {
		background: var(--color-deep-ocean);
		color: var(--color-white);
	}

	.program-badge--year {
		background: color-mix(in srgb, var(--color-golden) 25%, transparent);
		color: var(--color-deep-ocean);
	}

	.program-badge--format {
		background: #b91c1c;
		color: #ffffff;
	}

	.program-badge--pages {
		background: rgba(0, 0, 0, 0.06);
		color: var(--color-body-text);
	}

	.program-card__header {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.program-card__icon-box {
		width: 52px;
		height: 52px;
		min-width: 52px;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-deep-ocean) 10%, transparent);
		color: var(--color-deep-ocean);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.program-card__title-area {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.program-card__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.25rem;
		color: var(--color-deep-ocean);
		line-height: 1.35;
	}

	.program-card__duration {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-body-text);
	}

	.program-card__instruments {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-body-text);
		opacity: 0.9;
		line-height: 1.5;
	}

	.program-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		padding-top: 10px;
		border-top: 1px solid var(--color-border);
	}

	.btn-doc {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 18px;
		border-radius: var(--radius-full);
		font-size: 0.88rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all var(--transition-base);
		border: 1px solid transparent;
	}

	.btn-doc--primary {
		background: var(--color-deep-ocean);
		color: var(--color-white);
	}

	.btn-doc--primary:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.btn-doc--outline {
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-deep-ocean);
	}

	.btn-doc--outline:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: var(--color-deep-ocean);
	}

	.btn-doc--text {
		background: transparent;
		color: var(--color-sea-blue);
		padding: 9px 12px;
	}

	.btn-doc--text:hover {
		color: var(--color-deep-ocean);
	}

	@media (max-width: 640px) {
		.program-card {
			padding: 16px;
		}

		.program-card__header {
			flex-direction: column;
		}

		.program-card__actions {
			flex-direction: column;
			align-items: stretch;
		}

		.btn-doc {
			width: 100%;
			justify-content: center;
		}
	}
</style>
