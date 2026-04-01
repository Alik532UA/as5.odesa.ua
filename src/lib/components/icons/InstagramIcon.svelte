<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<rect x="2" y="2" width="20" height="20" rx="5" />
	<circle cx="12" cy="12" r="5" />
	<circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
</svg>
