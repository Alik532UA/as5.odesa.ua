<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Departments from '$lib/components/Departments.svelte';
	import News from '$lib/components/News.svelte';
</script>

<svelte:head>
	<title>Одеська школа мистецтв №5 — Ваш шлях до музичної майстерності</title>
	<meta name="description" content="Одеська школа мистецтв №5 — фортепіано, вокал, інструментальні ансамблі. Класична музична освіта для дітей та молоді в Одесі." />
	<meta property="og:title" content="Одеська школа мистецтв №5" />
	<meta property="og:description" content="Ваш шлях до музичної майстерності. Фортепіано, вокал, інструментальні ансамблі." />
	<meta property="og:type" content="website" />
</svelte:head>

<Hero />
<Departments />
<News />
