<script lang="ts">
	import { EDUCATIONAL_PROGRAMS, type EducationalProgram } from '$lib/data/educationalPrograms';
	import ProgramCard from '$lib/components/documents/ProgramCard.svelte';
	import StampModal from '$lib/components/documents/StampModal.svelte';
	import { t, locale } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { BookOpen, ShieldCheck, FileCheck, ArrowRight } from 'lucide-svelte';

	let activeTab: 'current' | 'archive' = $state('current');
	let selectedStampProgram: EducationalProgram | null = $state(null);

	const isUk = $derived($locale !== 'en');

	const displayedPrograms = $derived(
		EDUCATIONAL_PROGRAMS.filter((p) => (activeTab === 'current' ? p.isCurrent : !p.isCurrent))
	);

	function openStamp(program: EducationalProgram) {
		selectedStampProgram = program;
	}

	function closeStamp() {
		selectedStampProgram = null;
	}
</script>

<section class="page-content container" style="padding: 160px 24px 6rem;" data-testid="documents-page-section">
	<header class="docs-hero" data-testid="documents-page-header">
		<h1 class="docs-hero__title" data-testid="documents-page-title">{$t('documents.title')}</h1>
		<p class="docs-hero__subtitle" data-testid="documents-page-subtitle-text">{$t('documents.subtitle')}</p>

		<div class="docs-legal-banner" data-testid="documents-legal-banner">
			<div class="docs-legal-banner__icon" aria-hidden="true">
				<ShieldCheck size={26} />
			</div>
			<p class="docs-legal-banner__text" data-testid="documents-legal-text">
				{$t('documents.legalNotice')}
			</p>
		</div>
	</header>

	<!-- Section 1: Educational Programs -->
	<section class="docs-section" data-testid="documents-programs-section">
		<div class="docs-section__header">
			<div class="docs-section__title-wrap">
				<BookOpen size={24} class="docs-section__icon" aria-hidden="true" />
				<h2 class="docs-section__title" data-testid="documents-programs-title">{$t('documents.programsTitle')}</h2>
			</div>
			<p class="docs-section__desc" data-testid="documents-programs-desc-text">{$t('documents.programsDesc')}</p>

			<!-- Year Switcher Tabs -->
			<div class="docs-tabs" role="tablist" aria-label={$t('documents.programsTitle')} data-testid="documents-year-tabs">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === 'current'}
					class="docs-tab touch-target"
					class:active={activeTab === 'current'}
					onclick={() => (activeTab = 'current')}
					data-testid="documents-tab-current"
				>
					{$t('documents.tabCurrent')}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === 'archive'}
					class="docs-tab touch-target"
					class:active={activeTab === 'archive'}
					onclick={() => (activeTab = 'archive')}
					data-testid="documents-tab-archive"
				>
					{$t('documents.tabArchive')}
				</button>
			</div>
		</div>

		<!-- Programs List -->
		<div class="programs-list" data-testid="documents-programs-list">
			{#each displayedPrograms as program (program.id)}
				<ProgramCard {program} onOpenStamp={openStamp} />
			{/each}
		</div>
	</section>

	<!-- Section 2: Constituent Documents and Admission -->
	<section class="docs-section docs-section--secondary" data-testid="documents-constituent-section">
		<div class="docs-section__title-wrap">
			<FileCheck size={24} class="docs-section__icon" aria-hidden="true" />
			<h2 class="docs-section__title" data-testid="documents-constituent-title">{$t('documents.constituentTitle')}</h2>
		</div>

		<div class="info-cards-grid" data-testid="documents-info-cards-list">
			<!-- Admission Card -->
			<div class="info-card" data-testid="documents-admission-card">
				<div class="info-card__content">
					<h3 class="info-card__title" data-testid="documents-admission-title">{$t('documents.admissionTitle')}</h3>
					<p class="info-card__desc" data-testid="documents-admission-desc-text">{$t('documents.admissionDesc')}</p>
				</div>
				<a
					href={resolve('/admission')}
					class="btn-info touch-target"
					data-testid="documents-admission-link"
				>
					<span>{$t('documents.admissionBtn')}</span>
					<ArrowRight size={16} aria-hidden="true" />
				</a>
			</div>

			<!-- Statute Placeholder Card -->
			<div class="info-card info-card--muted" data-testid="documents-statute-card">
				<div class="info-card__content">
					<div class="info-card__badge-row">
						<span class="info-badge" data-testid="documents-statute-badge">{$t('documents.statuteNotice')}</span>
					</div>
					<h3 class="info-card__title" data-testid="documents-statute-title">{$t('documents.statuteTitle')}</h3>
					<p class="info-card__desc" data-testid="documents-statute-desc-text">{$t('documents.statuteDesc')}</p>
				</div>
			</div>
		</div>
	</section>
</section>

<!-- Stamp Scan Modal -->
<StampModal
	isOpen={selectedStampProgram !== null}
	onClose={closeStamp}
	stampUrl={selectedStampProgram?.stampScanUrl ?? ''}
	title={selectedStampProgram ? (isUk ? selectedStampProgram.title.uk : selectedStampProgram.title.en) : ''}
	downloadPdfUrl={selectedStampProgram?.pdfUrl ?? ''}
/>

<style>
	.docs-hero {
		margin-bottom: 3rem;
	}

	.docs-hero__title {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 6vw, 3rem);
		color: var(--color-deep-ocean);
		margin: 0 0 0.75rem;
		line-height: 1.2;
	}

	.docs-hero__subtitle {
		font-size: 1.2rem;
		color: var(--color-body-text);
		margin: 0 0 1.5rem;
		opacity: 0.9;
	}

	.docs-legal-banner {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 16px 20px;
		background: color-mix(in srgb, var(--color-sea-blue) 8%, var(--color-white));
		border: 1px solid color-mix(in srgb, var(--color-sea-blue) 25%, var(--color-border));
		border-radius: var(--radius-md);
	}

	.docs-legal-banner__icon {
		color: var(--color-sea-blue);
		min-width: 26px;
		margin-top: 2px;
	}

	.docs-legal-banner__text {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--color-body-text);
	}

	.docs-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 3.5rem;
	}

	.docs-section__header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.docs-section__title-wrap {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	:global(.docs-section__icon) {
		color: var(--color-deep-ocean);
	}

	.docs-section__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.6rem;
		color: var(--color-deep-ocean);
	}

	.docs-section__desc {
		margin: 0;
		font-size: 1rem;
		color: var(--color-body-text);
		opacity: 0.85;
	}

	.docs-tabs {
		display: flex;
		gap: 8px;
		margin-top: 1rem;
		background: rgba(0, 0, 0, 0.04);
		padding: 4px;
		border-radius: var(--radius-full);
		width: fit-content;
	}

	.docs-tab {
		border: none;
		background: transparent;
		padding: 8px 20px;
		border-radius: var(--radius-full);
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--color-body-text);
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.docs-tab.active {
		background: var(--color-deep-ocean);
		color: var(--color-white);
		box-shadow: var(--shadow-sm);
	}

	.programs-list {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.docs-section--secondary {
		border-top: 1px solid var(--color-border);
		padding-top: 2.5rem;
	}

	.info-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
		gap: 20px;
	}

	.info-card {
		background: var(--color-white);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 24px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 16px;
		box-shadow: var(--shadow-sm);
	}

	.info-card--muted {
		background: color-mix(in srgb, var(--color-border) 20%, var(--color-white));
	}

	.info-card__content {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-card__badge-row {
		display: flex;
	}

	.info-badge {
		background: rgba(0, 0, 0, 0.08);
		color: var(--color-body-text);
		font-size: 0.78rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: var(--radius-full);
	}

	.info-card__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.15rem;
		color: var(--color-deep-ocean);
	}

	.info-card__desc {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--color-body-text);
		opacity: 0.85;
	}

	.btn-info {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border-radius: var(--radius-full);
		background: var(--color-deep-ocean);
		color: var(--color-white);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: all var(--transition-base);
	}

	.btn-info:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	@media (max-width: 640px) {
		.docs-tabs {
			width: 100%;
		}

		.docs-tab {
			flex: 1;
			text-align: center;
			padding: 8px 12px;
		}

		.info-cards-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
