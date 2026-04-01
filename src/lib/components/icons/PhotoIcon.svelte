<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 48 48"
	fill="none"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<rect
		x="2"
		y="2"
		width="44"
		height="44"
		rx="4"
		stroke="currentColor"
		stroke-width="1.5"
		fill="none"
	/>
	<circle
		cx="16"
		cy="16"
		r="4"
		stroke="currentColor"
		stroke-width="1.5"
		fill="none"
	/>
	<path
		d="M 4,38 L 16,26 L 24,34 L 32,22 L 44,34 L 44,44 Q 44,46 42,46 L 6,46 Q 4,46 4,44 Z"
		stroke="currentColor"
		stroke-width="1"
		fill="none"
		opacity="0.5"
	/>
</svg>
