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
	<circle
		cx="9"
		cy="9"
		r="7.5"
		stroke="#F5A623"
		stroke-width="1.5"
		fill="none"
	/>
	<path
		d="M 1.5,9 Q 5,6 9,9 Q 13,12 16.5,9"
		stroke="#F5A623"
		stroke-width="1.2"
		fill="none"
	/>
	<path
		d="M 1.5,9 Q 5,12 9,9 Q 13,6 16.5,9"
		stroke="#F5A623"
		stroke-width="1.2"
		fill="none"
	/>
</svg>
