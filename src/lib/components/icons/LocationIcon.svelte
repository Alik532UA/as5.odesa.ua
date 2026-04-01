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
	<path
		d="M 9,1 C 5,1 2,4.5 2,8 C 2,13 9,17 9,17 C 9,17 16,13 16,8 C 16,4.5 13,1 9,1 Z"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
	/>
	<circle
		cx="9"
		cy="8"
		r="2.5"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
	/>
</svg>
