<script lang="ts">
	let { size = 40, className = "" } = $props();
	const path = `m125.17 96.19q8.68-13.78 18.81-26.64c21.05-26.75 46.67-50.3 76.33-69.3-14.37 2.47-28.7 6.55-42.74 12.35-24.21 10.01-45.41 24.24-63.09 41.47-35.39-14.97-75.05-19.8-114.25-12.51 33.19 6.48 65.11 18.3 94.45 34.94 10.51 5.96 20.7 12.53 30.49 19.69z`;
</script>

<svg 
	viewBox="0 0 220 97" 
	width={size * 2.2} 
	height={size} 
	class={className}
	style="pointer-events: none;"
>
	<path d={path} fill="currentColor" />
</svg>
