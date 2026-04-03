<script lang="ts">
	import Particles from "./backgrounds/Particles.svelte";
	import Waves from "./backgrounds/Waves.svelte";
	import FloatingShapes from "./backgrounds/FloatingShapes.svelte";
	import { fade } from "svelte/transition";
	import { onMount } from "svelte";

	let { backgroundType = 0, theme = "light" } = $props<{
		backgroundType?: 0 | 1 | 2 | 3;
		theme?: "light" | "dark";
	}>();

	let fixedHeight = $state("100vh");
	let lastWidth = 0;

	onMount(() => {
		const updateHeight = () => {
			const isMobile = window.innerWidth <= 1024;
			const buffer = isMobile ? 300 : 0;
			fixedHeight = window.innerHeight + buffer + "px";
			lastWidth = window.innerWidth;
		};

		updateHeight();

		const handleResize = () => {
			if (window.innerWidth === lastWidth) return;
			updateHeight();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("resize", handleResize);
			}
		};
	});
</script>

{#if backgroundType === 1}
	<div class="bg-transition" style="height: {fixedHeight}" transition:fade={{ duration: 800 }}>
		<Particles {theme} />
	</div>
{:else if backgroundType === 2}
	<div class="bg-transition" style="height: {fixedHeight}" transition:fade={{ duration: 800 }}>
		<Waves {theme} />
	</div>
{:else if backgroundType === 3}
	<div class="bg-transition" style="height: {fixedHeight}" transition:fade={{ duration: 800 }}>
		<FloatingShapes {theme} />
	</div>
{/if}

<style>
	.bg-transition {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 0;
		pointer-events: none;
		opacity: 1;
	}
</style>
