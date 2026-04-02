<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, fallback }: { children: Snippet, fallback?: Snippet } = $props();
	let error = $state<Error | null>(null);

	function handleError(e: any, reset: () => void) {
		console.error("ErrorBoundary caught:", e);
		error = e;
	}
</script>

<svelte:boundary onerror={handleError}>
	{#if error}
		{#if fallback}
			{@render fallback()}
		{:else}
			<div class="error-container">
				<h2>Ой, сталася помилка!</h2>
				<p>Щось пішло не так під час завантаження цього компонента.</p>
				<button onclick={() => error = null}>Спробувати знову</button>
			</div>
		{/if}
	{:else}
		{@render children()}
	{/if}
</svelte:boundary>

<style>
	.error-container {
		padding: 2rem;
		text-align: center;
		background: #fee2e2;
		color: #991b1b;
		border-radius: 12px;
		margin: 1rem 0;
	}
	button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
</style>