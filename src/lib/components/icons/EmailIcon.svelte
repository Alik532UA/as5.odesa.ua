<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 18 18"
	fill="none"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<rect
		x="1"
		y="3"
		width="16"
		height="12"
		rx="2"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
	/>
	<path
		d="M 1,4 L 9,10 L 17,4"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
		stroke-linecap="round"
	/>
</svg>
