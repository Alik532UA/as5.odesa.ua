<script lang="ts">
	import Particles from "./backgrounds/Particles.svelte";
	import Waves from "./backgrounds/Waves.svelte";
	import FloatingShapes from "./backgrounds/FloatingShapes.svelte";
	import { onMount } from "svelte";

	let { backgroundType = 0, theme = "light", enabled = false } = $props<{
		backgroundType?: 0 | 1 | 2 | 3;
		theme?: "light" | "dark";
		enabled?: boolean;
	}>();

	let fixedHeight = $state("100vh");
	let lastWidth = 0;
	let prevState: { enabled: boolean; backgroundType: 0 | 1 | 2 | 3 } | null = null;
	let isVisible = $derived(enabled && backgroundType !== 0);

	// Debug logs - expanded logging for transitions
	$effect(() => {
		const from = prevState;
		const to = { enabled, backgroundType };

		console.log("[DynamicBackground] State changed:", {
			from,
			to,
			isVisible,
			timestamp: new Date().toISOString(),
		});

		prevState = to;
	});

	onMount(() => {
		console.log("[DynamicBackground] Component mounted");

		const updateHeight = () => {
			const isMobile = window.innerWidth <= 1024;
			const buffer = isMobile ? 300 : 0;
			fixedHeight = window.innerHeight + buffer + "px";
			lastWidth = window.innerWidth;
			console.log("[DynamicBackground] Height recalculated:", {
				fixedHeight,
				isMobile,
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		updateHeight();

		const handleResize = () => {
			if (window.innerWidth === lastWidth) return;
			updateHeight();
		};

		window.addEventListener("resize", handleResize);

		return () => {
			console.log("[DynamicBackground] Component unmounting");
			if (typeof window !== "undefined") {
				window.removeEventListener("resize", handleResize);
			}
		};
	});
</script>

<!-- Always mounted container for guaranteed smooth fade to/from "none" -->
<div
	class="bg-container"
	style="height: {fixedHeight}; opacity: {isVisible ? 1 : 0};"
	data-type={backgroundType}
	data-visible={isVisible ? 'true' : 'false'}
>
	<div class="bg-layer" class:active={backgroundType === 1}>
		<Particles {theme} />
	</div>
	<div class="bg-layer" class:active={backgroundType === 2}>
		<Waves {theme} />
	</div>
	<div class="bg-layer" class:active={backgroundType === 3}>
		<FloatingShapes {theme} />
	</div>
</div>

<style>
	.bg-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 0;
		background: transparent;
		pointer-events: none;
		transition: opacity 800ms ease-in-out;
	}

	.bg-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		pointer-events: none;
		opacity: 0;
		transition: opacity 800ms ease-in-out;
	}

	.bg-layer.active {
		opacity: 1;
	}
</style>
