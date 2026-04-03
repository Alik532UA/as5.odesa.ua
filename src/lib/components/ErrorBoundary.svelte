<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}

	let { title = 'Помилка', children }: Props = $props();

	let hasError = $state(false);
	let errorMessage = $state('');

	function handleError(error: unknown, reset: () => void) {
		const err = error instanceof Error ? error : new Error(String(error));
		console.error('[ErrorBoundary] Error caught:', err);
		hasError = true;
		errorMessage = err.message;
	}
</script>

<svelte:boundary onerror={handleError}>
	{@render children()}

	{#snippet failed(error, reset)}
		<div class="error-boundary" role="alert" aria-live="assertive">
			<div class="error-content">
				<h2>⚠️ {title}</h2>
				<p class="error-message">
					{#if import.meta.env.DEV}
						{error instanceof Error ? error.message : String(error)}
					{:else}
						Вибачте, сталася помилка. Спробуйте оновити сторінку.
					{/if}
				</p>
				<div class="error-actions">
					<button onclick={reset}>Спробувати знову</button>
					<button onclick={() => location.reload()}>Оновити сторінку</button>
				</div>
			</div>
		</div>
	{/snippet}
</svelte:boundary>

<style>
	.error-boundary {
		padding: 20px;
		margin: 20px 0;
		background-color: #fee;
		border: 2px solid #fcc;
		border-radius: 8px;
		color: #c33;
	}

	.error-content h2 {
		margin-top: 0;
		color: #c33;
	}

	.error-message {
		font-family: monospace;
		font-size: 0.9rem;
		padding: 10px;
		background-color: rgba(255, 0, 0, 0.05);
		border-radius: 4px;
		overflow-x: auto;
	}

	.error-actions {
		display: flex;
		gap: 10px;
		margin-top: 12px;
	}

	button {
		padding: 8px 16px;
		background-color: #c33;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background-color: #a22;
	}
</style>
