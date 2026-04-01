<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		amplitude?: number;
		frequency?: number;
		speed?: number;
		color?: string;
		strokeWidth?: number;
		opacity?: number;
		height?: number;
		className?: string;
	}

	let {
		amplitude = 20,
		frequency = 2,
		speed = 0.02,
		color = '#005fae',
		strokeWidth = 4,
		opacity = 1,
		height = 100,
		className = ''
	}: Props = $props();

	let phase = $state(0);
	const width = 1440; // Base SVG width
	const points = 100; // Number of points for the curve
	const step = width / points;

	// Formula: y = A * sin(2 * PI * f * (x/W) + phase) + baseline
	let pathData = $derived.by(() => {
		const baseline = height / 2;
		let d = `M 0 ${baseline + amplitude * Math.sin(phase)}`;

		for (let i = 1; i <= points; i++) {
			const x = i * step;
			const y = baseline + amplitude * Math.sin((i / points) * Math.PI * 2 * frequency + phase);
			d += ` L ${x} ${y}`;
		}

		return d;
	});

	onMount(() => {
		let frame: number;
		const animate = () => {
			phase -= speed; // Move right to left (positive phase moves left, negative moves right)
			frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="wave-container {className}" style:height="{height}px">
	<svg
		viewBox="0 0 {width} {height}"
		preserveAspectRatio="none"
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
		height: 100%;
		display: block;
	}
</style>
