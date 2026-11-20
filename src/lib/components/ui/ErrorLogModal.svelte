<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import { errorLogger, type LoggedError } from '$lib/services/errorLogger.svelte';
	import { AlertCircle, AlertTriangle, Bug, Check, Copy, Info, Trash2, X } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import { t } from 'svelte-i18n';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen, onclose }: Props = $props();

	type FilterType = 'all' | 'error' | 'warn' | 'info';
	let activeFilter = $state<FilterType>('all');
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	let cache = $state<LoggedError[]>([]);

	$effect(() => {
		if (isOpen) {
			cache = errorLogger.getCache();
		}
	});

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	const errorCount = $derived(cache.filter((e) => (e.level ?? 'error') === 'error').length);
	const warnCount = $derived(cache.filter((e) => e.level === 'warn').length);
	const infoCount = $derived(cache.filter((e) => e.level === 'info').length);

	const filteredList = $derived(
		(activeFilter === 'all'
			? cache
			: cache.filter((e) => (activeFilter === 'error' ? (e.level ?? 'error') === 'error' : e.level === activeFilter))
		)
			.slice()
			.reverse()
	);

	async function handleCopy() {
		const report = errorLogger.getReport();
		try {
			await navigator.clipboard.writeText(report);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			errorLogger.warn('ErrorLogModal', 'не вдалося скопіювати звіт з модалки', error);
		}
	}

	function handleClear() {
		errorLogger.clearCache();
		cache = [];
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
	}

	function formatTime(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		} catch {
			return iso;
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="error-log-modal-title"
		data-testid="error-log-modal-overlay"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={handleKeydown}
		use:focusTrap
	>
		<div class="modal-card" data-testid="error-log-modal-container">
			<div class="modal-header" data-testid="error-log-modal-header">
				<div class="header-left">
					<div class="icon-wrap">
						<Bug size={18} />
					</div>
					<div>
						<h2 id="error-log-modal-title" class="modal-title" data-testid="error-log-modal-title">
							Журнал помилок та подій
						</h2>
						<span class="version-badge">v{errorLogger.appVersion}</span>
					</div>
				</div>
				<button
					type="button"
					class="btn-close"
					onclick={onclose}
					aria-label={$t ? $t('common.close') : 'Закрити'}
					data-testid="error-log-modal-close-btn"
				>
					<X size={18} />
				</button>
			</div>

			<div class="modal-toolbar">
				<div class="tabs" role="tablist" data-testid="error-log-modal-tabs">
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'all'}
						class="tab"
						class:tab--active={activeFilter === 'all'}
						onclick={() => (activeFilter = 'all')}
						data-testid="error-log-modal-all-tab"
					>
						Всі <span class="tab-badge">{cache.length}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'error'}
						class="tab"
						class:tab--active={activeFilter === 'error'}
						onclick={() => (activeFilter = 'error')}
						data-testid="error-log-modal-error-tab"
					>
						Помилки <span class="tab-badge tab-badge--error">{errorCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'warn'}
						class="tab"
						class:tab--active={activeFilter === 'warn'}
						onclick={() => (activeFilter = 'warn')}
						data-testid="error-log-modal-warn-tab"
					>
						Увага <span class="tab-badge tab-badge--warn">{warnCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'info'}
						class="tab"
						class:tab--active={activeFilter === 'info'}
						onclick={() => (activeFilter = 'info')}
						data-testid="error-log-modal-info-tab"
					>
						Інфо <span class="tab-badge tab-badge--info">{infoCount}</span>
					</button>
				</div>

				<div class="actions">
					<button
						type="button"
						class="btn-action"
						class:btn-action--copied={copied}
						onclick={handleCopy}
						data-testid="error-log-modal-copy-btn"
						aria-label="Copy report"
					>
						{#if copied}
							<Check size={14} />
							<span>Скопійовано</span>
						{:else}
							<Copy size={14} />
							<span>Копіювати звіт</span>
						{/if}
					</button>
					<button
						type="button"
						class="btn-action btn-action--danger"
						onclick={handleClear}
						disabled={cache.length === 0}
						data-testid="error-log-modal-clear-btn"
						aria-label="Clear logs"
					>
						<Trash2 size={14} />
						<span>Очистити</span>
					</button>
				</div>
			</div>

			<div class="modal-body" data-testid="error-log-modal-list">
				{#if filteredList.length === 0}
					<div class="empty-state" data-testid="error-log-modal-empty-message">
						<Check size={28} class="empty-icon" />
						<p class="empty-text">Журнал порожній. Жодної події не зафіксовано!</p>
					</div>
				{:else}
					<div class="event-list">
						{#each filteredList as item (item.id)}
							<div class="event-card event-card--{item.level ?? 'error'}">
								<div class="event-header">
									<div class="event-tags">
										{#if (item.level ?? 'error') === 'error'}
											<span class="level-pill level-pill--error">
												<AlertCircle size={11} /> ERROR
											</span>
											{#if item.severity}
												<span class="severity-pill severity-pill--{item.severity}">{item.severity}</span>
											{/if}
										{:else if item.level === 'warn'}
											<span class="level-pill level-pill--warn">
												<AlertTriangle size={11} /> WARN
											</span>
										{:else}
											<span class="level-pill level-pill--info">
												<Info size={11} /> INFO
											</span>
										{/if}
										<span class="meta-pill">{item.context?.component || 'app'}</span>
										{#if item.context?.page}
											<span class="meta-pill">{item.context.page}</span>
										{/if}
									</div>
									<time class="event-time" title={item.context?.timestamp}>
										{formatTime(item.context?.timestamp || '')}
									</time>
								</div>
								<div class="event-message">{item.message}</div>
								{#if item.stack}
									<details class="event-stack">
										<summary>Стек викликів</summary>
										<pre>{item.stack}</pre>
									</details>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10001;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}
	.modal-card {
		background: var(--theme-dynamic-surface-bg);
		color: var(--color-body-text);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		width: 100%;
		max-width: 800px;
		max-height: 85dvh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 18px;
		border-bottom: 1px solid var(--color-border));
		background: rgba(255, 255, 255, 0.03);
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: rgba(201, 42, 42, 0.2);
		color: #c92a2a;
	}
	.modal-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.2;
		color: var(--color-body-text);
	}
	.version-badge {
		font-size: 0.6875rem;
		font-family: ui-monospace, monospace;
		opacity: 0.6;
	}
	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-body-text);
		opacity: 0.7;
		cursor: pointer;
		transition: opacity 0.15s ease, background 0.15s ease;
	}
	.btn-close:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}
	.modal-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 18px;
		border-bottom: 1px solid var(--color-border));
		background: rgba(0, 0, 0, 0.15);
		flex-wrap: wrap;
	}
	.tabs {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-body-text);
		opacity: 0.7;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.tab:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.05);
	}
	.tab--active {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--color-border));
		font-weight: 600;
	}
	.tab-badge {
		font-size: 0.6875rem;
		padding: 1px 5px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.15);
	}
	.tab-badge--error {
		background: #c92a2a;
		color: #ffffff;
	}
	.tab-badge--warn {
		background: #f59e0b;
		color: #000000;
	}
	.tab-badge--info {
		background: #1d4ed8;
		color: #ffffff;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.btn-action {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid var(--color-border));
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-body-text);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.btn-action:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
	}
	.btn-action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn-action--copied {
		background: #237a35 !important;
		color: #ffffff !important;
		border-color: #237a35 !important;
	}
	.btn-action--danger:hover:not(:disabled) {
		color: #c92a2a;
		border-color: rgba(201, 42, 42, 0.4);
		background: rgba(201, 42, 42, 0.1);
	}
	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 16px 18px;
		min-height: 200px;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 16px;
		opacity: 0.7;
	}
	.empty-text {
		margin: 0;
		font-size: 0.9375rem;
	}
	:global(.empty-icon) {
		color: #22c55e;
	}
	.event-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.event-card {
		padding: 10px 14px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border));
		border-left-width: 4px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.event-card--error {
		border-left-color: #c92a2a;
	}
	.event-card--warn {
		border-left-color: #f59e0b;
	}
	.event-card--info {
		border-left-color: #1d4ed8;
	}
	.event-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
	}
	.event-tags {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.level-pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-weight: 700;
		font-size: 0.625rem;
		padding: 1px 5px;
		border-radius: 4px;
		text-transform: uppercase;
	}
	.level-pill--error {
		background: #c92a2a;
		color: #ffffff;
	}
	.level-pill--warn {
		background: #f59e0b;
		color: #000000;
	}
	.level-pill--info {
		background: #1d4ed8;
		color: #ffffff;
	}
	.severity-pill {
		font-size: 0.625rem;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.1);
		text-transform: uppercase;
	}
	.meta-pill {
		font-size: 0.6875rem;
		opacity: 0.6;
		font-family: ui-monospace, monospace;
	}
	.event-time {
		opacity: 0.5;
		font-family: ui-monospace, monospace;
		font-size: 0.6875rem;
	}
	.event-message {
		font-size: 0.8125rem;
		word-break: break-word;
		line-height: 1.4;
	}
	.event-stack {
		margin-top: 4px;
		font-size: 0.75rem;
		opacity: 0.8;
	}
	.event-stack summary {
		cursor: pointer;
		user-select: none;
		font-size: 0.6875rem;
		opacity: 0.6;
	}
	.event-stack summary:hover {
		opacity: 1;
	}
	.event-stack pre {
		margin: 6px 0 0;
		padding: 8px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.4);
		font-family: ui-monospace, monospace;
		font-size: 0.6875rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
