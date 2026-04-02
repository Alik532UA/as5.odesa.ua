<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, fallback }: { children: Snippet, fallback: Snippet } = $props();
	let error = $state<Error | null>(null);

	function handleError(e: any) {
		console.error("UI Error Boundary caught error:", e);
		error = e;
	}
</script>

<svelte:boundary onerror={handleError}>
	{#if error}
		{@render fallback()}
	{:else}
		{@render children()}
	{/if}
</svelte:boundary>
