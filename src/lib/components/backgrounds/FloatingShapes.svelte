<script lang="ts">
	import { onMount } from "svelte";
	import { FloatingShapesEngine } from "./engine/FloatingShapesEngine";

	let { theme = "light", color = "#0071e3" } = $props<{
		theme?: "light" | "dark";
		color?: string;
	}>();

	let canvas: HTMLCanvasElement;
	let engine: FloatingShapesEngine;

	$effect(() => {
		if (engine) {
			engine.setTheme(theme, color);
		}
	});

	onMount(() => {
		engine = new FloatingShapesEngine(theme, color);
		if (canvas) {
			engine.mount(canvas);
		}

		return () => {
			engine?.unmount();
		};
	});
</script>

<canvas bind:this={canvas} class="bg-canvas" style="background: transparent;"></canvas>

<style>
	.bg-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		pointer-events: none;
		background: transparent;
	}
</style>
