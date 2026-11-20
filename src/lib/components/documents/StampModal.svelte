<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import { isTypingTarget } from '$lib/services/keyboard';
	import { asset } from '$app/paths';
	import { t } from 'svelte-i18n';
	import { X, Download } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		stampUrl: string;
		title: string;
		downloadPdfUrl: string;
	}

	let { isOpen, onClose, stampUrl, title, downloadPdfUrl }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (isTypingTarget(e.target)) return;
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="stamp-modal-backdrop" data-testid="stamp-modal-backdrop">
		<button
			type="button"
			class="stamp-modal-scrim"
			onclick={onClose}
			aria-label={$t('documents.modalClose')}
			tabindex="-1"
		></button>

		<div
			class="stamp-modal"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			use:focusTrap
			data-testid="stamp-modal"
		>
			<div class="stamp-modal__header" data-testid="stamp-modal-header">
				<h3 class="stamp-modal__title" data-testid="stamp-modal-title">{title}</h3>
				<button
					type="button"
					class="stamp-modal__close-btn touch-target"
					onclick={onClose}
					aria-label={$t('documents.modalClose')}
					data-testid="stamp-modal-close-btn"
				>
					<X size={22} aria-hidden="true" />
				</button>
			</div>

			<div class="stamp-modal__body" data-testid="stamp-modal-container">
				<img
					src={asset(stampUrl)}
					alt={title}
					class="stamp-modal__img"
					loading="lazy"
					data-testid="stamp-modal-img"
				/>
			</div>

			<div class="stamp-modal__footer" data-testid="stamp-modal-toolbar">
				<a
					href={asset(downloadPdfUrl)}
					target="_blank"
					rel="noopener noreferrer"
					class="stamp-modal__btn stamp-modal__btn--primary touch-target"
					data-testid="stamp-modal-pdf-link"
				>
					<Download size={18} aria-hidden="true" />
					<span>{$t('documents.downloadPdf')}</span>
				</a>
				<button
					type="button"
					class="stamp-modal__btn stamp-modal__btn--outline touch-target"
					onclick={onClose}
					data-testid="stamp-modal-dismiss-btn"
				>
					{$t('documents.modalClose')}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.stamp-modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.stamp-modal-scrim {
		position: absolute;
		inset: 0;
		background: rgba(10, 25, 35, 0.75);
		backdrop-filter: blur(4px);
		border: none;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.stamp-modal {
		position: relative;
		z-index: 1;
		background: var(--color-white);
		color: var(--color-body-text);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		max-width: 640px;
		width: 100%;
		max-height: 90dvh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.stamp-modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 20px;
		border-bottom: 1px solid var(--color-border);
	}

	.stamp-modal__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: var(--color-deep-ocean);
	}

	.stamp-modal__close-btn {
		background: transparent;
		border: none;
		color: var(--color-body-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		transition: background var(--transition-base);
	}

	.stamp-modal__close-btn:hover {
		background: rgba(0, 0, 0, 0.08);
	}

	.stamp-modal__body {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		justify-content: center;
		background: #f7fafc;
	}

	.stamp-modal__img {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-sm);
	}

	.stamp-modal__footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		padding: 12px 20px;
		border-top: 1px solid var(--color-border);
		background: var(--color-white);
	}

	.stamp-modal__btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: var(--radius-full);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		transition: all var(--transition-base);
	}

	.stamp-modal__btn--primary {
		background: var(--color-deep-ocean);
		color: var(--color-white);
		border: 1px solid transparent;
	}

	.stamp-modal__btn--primary:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.stamp-modal__btn--outline {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-body-text);
	}

	.stamp-modal__btn--outline:hover {
		background: rgba(0, 0, 0, 0.05);
	}
</style>
