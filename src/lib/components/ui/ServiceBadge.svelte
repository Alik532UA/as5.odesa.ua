<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { Bug, Check, Copy, EyeOff, Trash2 } from 'lucide-svelte';
	import { debugMode } from '$lib/services/debugMode.svelte';
	import { errorLogger } from '$lib/services/errorLogger.svelte';
	import ErrorLogModal from './ErrorLogModal.svelte';

	/**
	 * Службове табло: номер версії, лічильник помилок, контекстне меню дій та перегляд логів.
	 */
	let copied = $state(false);
	let fallbackReport = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	let menuOpen = $state(false);
	let modalOpen = $state(false);
	let userDismissed = $state(false);

	$effect(() => {
		if (debugMode.enabled) userDismissed = false;
	});

	const urlDebug = $derived(browser && page.url.searchParams.get('debug') === '1');
	const isVisible = $derived(!userDismissed && (urlDebug || debugMode.enabled));

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	async function copyReport() {
		const report = errorLogger.getReport();
		try {
			await navigator.clipboard.writeText(report);
			fallbackReport = null;
			copied = true;
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			errorLogger.warn('ServiceBadge', 'не вдалося скопіювати звіт', error);
			fallbackReport = report;
		}
	}

	async function handleAction(action: 'copy' | 'modal' | 'clear' | 'hide') {
		menuOpen = false;
		if (action === 'copy') await copyReport();
		else if (action === 'modal') modalOpen = true;
		else if (action === 'clear') errorLogger.clearCache();
		else if (action === 'hide') {
			userDismissed = true;
			if (debugMode.enabled) debugMode.toggle();
		}
	}

	function handleWindowClick(e: MouseEvent) {
		if (!menuOpen) return;
		const target = e.target as HTMLElement | null;
		if (!target?.closest('.service-badge-wrapper')) {
			menuOpen = false;
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && menuOpen) {
			menuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

{#if fallbackReport}
	<textarea
		class="log-fallback"
		readonly
		value={fallbackReport}
		aria-label="Debug report fallback"
		data-testid="debug-log-fallback-input"
	></textarea>
{/if}

{#if isVisible}
	<div class="service-badge-wrapper">
		{#if menuOpen}
			<div class="menu" role="menu" data-testid="service-badge-context-menu">
				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={() => handleAction('copy')}
					data-testid="service-badge-copy-report-btn"
				>
					<Copy size={14} aria-hidden="true" />
					<span class="menu-item__text">Скопіювати повний звіт</span>
				</button>
				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={() => handleAction('modal')}
					data-testid="service-badge-view-errors-btn"
				>
					<Bug size={14} aria-hidden="true" />
					<span class="menu-item__text">Переглянути помилки</span>
					<span class="menu-item__count" class:menu-item__count--has-errors={errorLogger.errorCount > 0}>
						{errorLogger.errorCount > 99 ? '99+' : errorLogger.errorCount}
					</span>
				</button>
				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={() => handleAction('clear')}
					data-testid="service-badge-clear-btn"
				>
					<Trash2 size={14} aria-hidden="true" />
					<span class="menu-item__text">Скинути лічильник</span>
				</button>
				<div class="menu-separator" role="separator"></div>
				<button
					type="button"
					class="menu-item menu-item--hide"
					role="menuitem"
					onclick={() => handleAction('hide')}
					data-testid="service-badge-hide-btn"
				>
					<EyeOff size={14} aria-hidden="true" />
					<span class="menu-item__text">Приховати табло</span>
				</button>
			</div>
		{/if}

		<button
			type="button"
			class="badge"
			class:badge--has-errors={errorLogger.errorCount > 0}
			class:badge--copied={copied}
			onclick={() => (menuOpen = !menuOpen)}
			oncontextmenu={(e) => {
				e.preventDefault();
				menuOpen = true;
			}}
			aria-label={`Копіювати звіт / Copy report — ${errorLogger.appVersion}`}
			aria-haspopup="menu"
			aria-expanded={menuOpen}
			data-testid="app-version-value"
		>
			{#if copied}
				<Check size={14} class="badge__hint" />
			{:else if errorLogger.errorCount > 0}
				<span class="badge__count">
					{errorLogger.errorCount > 99 ? '99+' : errorLogger.errorCount}
				</span>
			{:else}
				<Copy size={12} class="badge__hint" />
			{/if}
			<span class="badge__version">{errorLogger.appVersion}</span>
		</button>
	</div>
{/if}

<ErrorLogModal isOpen={modalOpen} onclose={() => (modalOpen = false)} />

<style>
	.service-badge-wrapper {
		display: contents;
	}
	.menu {
		position: fixed;
		bottom: 56px;
		left: 16px;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		min-width: 210px;
		padding: 6px;
		border-radius: 12px;
		background: var(--theme-dynamic-surface-bg, #1e1e24);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 7px 10px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--color-body-text, #ffffff);
		cursor: pointer;
		font-size: 0.8125rem;
		text-align: left;
		transition: background 0.15s ease;
	}
	.menu-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.menu-item__text {
		flex: 1;
	}
	.menu-item__count {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-body-text, #ffffff);
	}
	.menu-item__count--has-errors {
		background: #7f1d1d;
		color: #ffffff;
	}
	.menu-separator {
		height: 1px;
		background: var(--color-border, rgba(255, 255, 255, 0.1));
		margin: 4px 0;
	}
	.menu-item--hide {
		opacity: 0.8;
	}
	.menu-item--hide:hover {
		opacity: 1;
		color: #ef4444;
	}
	.badge {
		position: fixed;
		bottom: 16px;
		left: 16px;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 32px;
		padding: 0 8px;
		border-radius: 16px;
		background: var(--theme-dynamic-surface-bg);
		color: var(--color-body-text);
		border: 2px solid var(--color-border);
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: transform 0.2s ease;
	}
	.badge:hover {
		transform: scale(1.05);
	}
	.badge__version {
		font-size: 10px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		line-height: 1;
		white-space: nowrap;
	}
	.badge :global(.badge__hint) {
		opacity: 0.6;
		flex: none;
	}
	.badge--has-errors {
		background: #c92a2a;
		color: #ffffff;
		border-color: #7f1d1d;
	}
	.badge--copied {
		background: #237a35;
		color: #ffffff;
		border-color: #1b5e20;
	}
	.badge__count {
		font-weight: 700;
		font-size: 0.75rem;
		line-height: 1;
		padding: 2px 5px;
		border-radius: 8px;
		background: #7f1d1d;
		color: #ffffff;
	}
	@media (hover: none) {
		.badge {
			min-height: 44px;
			padding: 0 12px;
			border-radius: 22px;
		}
		.badge__version {
			font-size: 12px;
		}
		.menu {
			bottom: 68px;
		}
	}
	@media print {
		.badge,
		.menu,
		.log-fallback {
			display: none !important;
		}
	}
	.log-fallback {
		position: fixed;
		bottom: 76px;
		left: 16px;
		width: min(38rem, calc(100vw - 32px));
		height: min(40dvh, 20rem);
		z-index: 9999;
		padding: 8px;
		font-family: monospace;
		font-size: 0.75rem;
		background: #1e1e1e;
		color: #ffffff;
		border: 2px solid #ef4444;
		border-radius: 8px;
		resize: none;
	}
</style>
