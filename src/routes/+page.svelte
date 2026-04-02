<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Departments from '$lib/components/Departments.svelte';
	import News from '$lib/components/News.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
</script>

<Hero />
<Departments />

<ErrorBoundary>
	{#snippet children()}
		<News />
	{/snippet}
	{#snippet fallback()}
		<div style="padding: 4rem; text-align: center; background: #f8f9fa;">
			<p>Тимчасово не вдалося завантажити новини.</p>
		</div>
	{/snippet}
</ErrorBoundary>
