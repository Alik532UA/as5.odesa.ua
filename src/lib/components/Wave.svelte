<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
		amplitude?: number;
		frequency?: number;
		speed?: number;
		color?: string;
		strokeWidth?: number;
		opacity?: number;
		height?: number;
		className?: string;
		showFish?: boolean;
	}

	let {
		amplitude = 20,
		frequency = 2,
		speed = 0.02,
		color = "#005fae",
		strokeWidth = 4,
		opacity = 1,
		height = 100,
		className = "",
		showFish = false,
	}: Props = $props();

	let phase = $state(0);
	const width = 1440; // Base SVG width
	const points = 100; // Number of points for the curve
	const step = width / points;

	// Fish state
	let fishX = $state(-100);
	let isFishActive = $state(false);
	const fishSpeed = 1; // Швидкість рибки

	// Formula: y = A * sin(2 * PI * f * (x/W) + phase) + baseline
	let pathData = $derived.by(() => {
		const baseline = height / 2;
		let d = `M 0 ${baseline + amplitude * Math.sin(phase)}`;

		for (let i = 1; i <= points; i++) {
			const x = i * step;
			const y =
				baseline +
				amplitude *
					Math.sin((i / points) * Math.PI * 2 * frequency + phase);
			d += ` L ${x} ${y}`;
		}

		return d;
	});

	// Fish Y calculation based on current wave shape
	let fishY = $derived.by(() => {
		const baseline = height / 2;
		// Normalize fishX to 0..1 range relative to SVG width
		const normalizedX = fishX / width;
		return (
			baseline +
			amplitude * Math.sin(normalizedX * Math.PI * 2 * frequency + phase)
		);
	});

	onMount(() => {
		let frame: number;
		const animate = () => {
			phase += speed; // Changed to += for Right to Left direction

			if (showFish && isFishActive) {
				fishX += fishSpeed;
				if (fishX > width + 100) {
					isFishActive = false;
					fishX = -100;
				}
			}

			frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);

		// Fish spawn timer (every 5 seconds)
		let fishInterval: any;
		if (showFish) {
			fishInterval = setInterval(() => {
				if (!isFishActive) {
					isFishActive = true;
					fishX = -100;
				}
			}, 5000);
		}

		return () => {
			cancelAnimationFrame(frame);
			if (fishInterval) clearInterval(fishInterval);
		};
	});

	const fishPath =
		"m468.36 305.34l-196.26-113.31-0.05 0.09c-1.21-0.75-2.41-1.51-3.65-2.23-62.8-36.26-143.11-14.74-179.37 48.06-36.2 62.69-14.81 142.82 47.73 179.17l-24.07 6.45 6.73 25.12-0.08 0.13q-0.16-0.09-0.33-0.18c-113.84-65.73-152.32-212.2-85.95-327.16 66.37-114.96 212.46-154.87 326.3-89.15 96.56 55.75 138.87 169.58 109 273.01zm-49.47-116.43c-7.42-4.28-16.88-1.75-21.16 5.67-4.28 7.42-1.75 16.88 5.67 21.16 7.42 4.28 16.88 1.75 21.16-5.67 4.28-7.42 1.75-16.88-5.67-21.16z";
</script>

<div class="wave-container {className}">
	<svg
		viewBox="0 0 {width} {height}"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d={pathData}
			stroke={color}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
			style:opacity
		/>

		{#if showFish && isFishActive}
			<g
				class="wave__fish"
				transform="translate({fishX}, {fishY - 15}) scale(0.08)"
			>
				<path d={fishPath} fill="#fcb712" />
			</g>
		{/if}
	</svg>
</div>

<style>
	.wave-container {
		width: 100%;
		overflow: hidden;
		line-height: 0;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
	}
</style>
