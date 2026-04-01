<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 200 100"
	fill="none"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<path
		d="M 30,46 C 60,44 85,48 108,54 C 130,35 155,25 180,14 C 155,35 135,60 114,82 C 85,65 60,55 30,46 Z"
		fill="#53a8dd"
	/>
</svg>
