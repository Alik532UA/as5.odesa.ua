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
		showFish = true,
	}: Props = $props();

	let phase = $state(0);
	const width = 1440; // Base SVG width
	const points = 100; // Number of points for the curve
	const step = width / points;

	// Fish state
	let fishX = $state(-100);
	let fishDirection = $state(1); // 1 for right, -1 for left
	let isFishActive = $state(false);
	const fishSpeed = 1; // Швидкість рибки

	// Jump state
	let isJumping = $state(false);
	let jumpProgress = $state(0);
	let currentJumpHeight = $state(0);
	let currentJumpLength = $state(0);

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

	// Fish Y calculation based on current wave shape and jump offset
	let fishY = $derived.by(() => {
		const baseline = height / 2;
		const normalizedX = fishX / width;
		const waveY =
			baseline +
			amplitude * Math.sin(normalizedX * Math.PI * 2 * frequency + phase);

		let jumpOffset = 0;
		if (isJumping) {
			const progressRatio = jumpProgress / currentJumpLength;
			jumpOffset = -(
				4 *
				currentJumpHeight *
				progressRatio *
				(1 - progressRatio)
			);
		}

		return waveY + jumpOffset;
	});

	let clipPathData = $derived(`${pathData} L ${width} -1000 L 0 -1000 Z`);
	const clipId = `wave-clip-${Math.random().toString(36).slice(2, 9)}`;

	// Fish Rotation calculation
	let fishRotation = $derived.by(() => {
		const normalizedX = fishX / width;
		// Derivative of the sine wave
		const waveDerivative =
			amplitude *
			Math.cos(normalizedX * Math.PI * 2 * frequency + phase) *
			((Math.PI * 2 * frequency) / width);

		let jumpDerivative = 0;
		if (isJumping) {
			const progressRatio = jumpProgress / currentJumpLength;
			// Derivative of the parabola
			jumpDerivative =
				-(4 * currentJumpHeight * (1 - 2 * progressRatio)) /
				currentJumpLength;
		}

		// Combined slope
		const totalSlope = waveDerivative + jumpDerivative * fishDirection;
		return Math.atan(totalSlope) * (180 / Math.PI);
	});

	onMount(() => {
		let frame: number;
		const animate = () => {
			phase += speed; // Changed to += for Right to Left direction

			if (showFish && isFishActive) {
				fishX += fishSpeed * fishDirection;

				if (isJumping) {
					jumpProgress += fishSpeed;
					if (jumpProgress >= currentJumpLength) {
						isJumping = false;
						isFishActive = false;
					}
				}

				if (fishX > width + 100 || fishX < -100) {
					isFishActive = false;
					isJumping = false;
					fishX = -100;
				}
			}

			frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);

		let fishInterval: ReturnType<typeof setTimeout>;
		if (showFish) {
			const scheduleNextFish = () => {
				const nextTime = 300 + Math.random() * 700; // Debug: 10x faster (was 3000 + 7000)
				fishInterval = setTimeout(() => {
					if (!isFishActive) {
						isFishActive = true;
						fishDirection = Math.random() > 0.5 ? 1 : -1;
						isJumping = true;
						jumpProgress = 0;
						// Randomize jump parameters
						currentJumpHeight = 40 + Math.random() * 80; // height above wave (40 to 120px)
						currentJumpLength = 150 + Math.random() * 200; // length of the jump (150 to 350px)
						
						// Random jump starting position across the whole width
						if (fishDirection === 1) {
							fishX = Math.random() * (width - currentJumpLength);
						} else {
							fishX = currentJumpLength + Math.random() * (width - currentJumpLength);
						}
					}
					scheduleNextFish();
				}, nextTime);
			};
			fishInterval = setTimeout(scheduleNextFish, Math.random() * 500); // Debug: 10x faster (was 5000)
		}

		return () => {
			cancelAnimationFrame(frame);
			if (fishInterval) clearTimeout(fishInterval);
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
		{#if showFish && isFishActive}
			<defs>
				<clipPath id={clipId}>
					<path d={clipPathData} />
				</clipPath>
			</defs>
			<g clip-path="url(#{clipId})">
				<g
					class="wave__fish"
					transform="translate({fishX}, {fishY - 15}) rotate({fishRotation}) scale({0.08 * fishDirection}, 0.08)"
				>
					<g transform="translate(-250, -240)">
						<path d={fishPath} fill="#fcb712" />
					</g>
				</g>
			</g>
		{/if}

		<path
			d={pathData}
			stroke={color}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
			style:opacity
		/>
	</svg>
</div>

<style>
	.wave-container {
		width: 100%;
		overflow-y: visible;
		overflow-x: clip;
		line-height: 0;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}
</style>
