<script lang="ts">
	import type { EducationalProgram } from '$lib/data/educationalPrograms';
	import { t } from 'svelte-i18n';

	interface Props {
		program: EducationalProgram;
	}

	let { program }: Props = $props();
</script>

<div class="curriculum-panel" data-testid="program-curriculum-panel-{program.id}">
	<div class="curriculum-table-container" data-testid="program-table-container-{program.id}">
		<table class="curriculum-table">
			<thead>
				<tr>
					<th>{$t('documents.subjectHeader')}</th>
					<th>1 {$t('documents.classHeader')}</th>
					<th>2 {$t('documents.classHeader')}</th>
					<th>3 {$t('documents.classHeader')}</th>
					<th>4 {$t('documents.classHeader')}</th>
					{#if program.level === 'basic'}
						<th>5 {$t('documents.classHeader')}</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each program.curriculum as row, idx (idx)}
					<tr class:row--total={row.isTotal}>
						<td class="cell--subject">{row.subject}</td>
						<td>{row.h1}</td>
						<td>{row.h2}</td>
						<td>{row.h3}</td>
						<td>{row.h4}</td>
						{#if program.level === 'basic'}
							<td>{row.h5 ?? '—'}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="curriculum-note">
		* {$t('documents.originalNote')}
	</p>
</div>

<style>
	.curriculum-panel {
		margin-top: 8px;
		padding: 16px;
		border-radius: var(--radius-md);
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid var(--color-border);
	}

	.curriculum-table-container {
		overflow-x: auto;
	}

	.curriculum-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}

	.curriculum-table th,
	.curriculum-table td {
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		text-align: center;
	}

	.curriculum-table th {
		background: color-mix(in srgb, var(--color-deep-ocean) 8%, var(--color-white));
		color: var(--color-deep-ocean);
		font-weight: 600;
	}

	.cell--subject {
		text-align: left !important;
		font-weight: 500;
	}

	.row--total {
		font-weight: bold;
		background: color-mix(in srgb, var(--color-golden) 15%, transparent);
	}

	.curriculum-note {
		margin: 10px 0 0;
		font-size: 0.82rem;
		color: var(--color-body-text);
		opacity: 0.75;
		font-style: italic;
	}
</style>
