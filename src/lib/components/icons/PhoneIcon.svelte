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
		d="M 3,2 L 6,2 L 8,6 L 6,7.5 C 7,10 8,11 11,12.5 L 12.5,10.5 L 16,12.5 L 16,15.5 C 16,16 15.5,16.5 15,16.5 C 8,16 2,10 1.5,3 C 1.5,2.5 2,2 2.5,2 Z"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
	/>
</svg>
