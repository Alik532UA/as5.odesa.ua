<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 64 64"
	fill="none"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<circle
		cx="32"
		cy="32"
		r="30"
		stroke="currentColor"
		stroke-width="2"
		fill="none"
	/>
	<path
		d="M 20,42 L 20,28 L 28,28 L 32,22 L 36,28 L 44,28 L 44,42 Z"
		stroke="currentColor"
		stroke-width="1.5"
		fill="none"
	/>
	<circle
		cx="32"
		cy="34"
		r="4"
		stroke="currentColor"
		stroke-width="1.5"
		fill="none"
	/>
</svg>
