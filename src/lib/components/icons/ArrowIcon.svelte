<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 14 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg">
	<path
		d="M2 2L12 12L2 22"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
