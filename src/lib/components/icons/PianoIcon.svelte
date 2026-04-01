<script lang="ts">
	let { size = 24, className = "" }: { size?: number; className?: string } = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 80 80"
	fill="none"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg">
	<circle cx="40" cy="40" r="38" fill="#EAF6FB" stroke="#D6EEF5" stroke-width="1.5" />
	<g transform="translate(18, 20)">
		<rect x="0" y="0" width="8" height="40" rx="1" fill="white" stroke="#1B5E7B" stroke-width="1.5" />
		<rect x="8" y="0" width="8" height="40" rx="1" fill="white" stroke="#1B5E7B" stroke-width="1.5" />
		<rect x="16" y="0" width="8" height="40" rx="1" fill="white" stroke="#1B5E7B" stroke-width="1.5" />
		<rect x="24" y="0" width="8" height="40" rx="1" fill="white" stroke="#1B5E7B" stroke-width="1.5" />
		<rect x="32" y="0" width="8" height="40" rx="1" fill="white" stroke="#1B5E7B" stroke-width="1.5" />
		<rect x="5" y="0" width="6" height="24" rx="1" fill="#1B5E7B" />
		<rect x="13" y="0" width="6" height="24" rx="1" fill="#1B5E7B" />
		<rect x="25" y="0" width="6" height="24" rx="1" fill="#1B5E7B" />
		<rect x="33" y="0" width="6" height="24" rx="1" fill="#1B5E7B" />
	</g>
	<circle cx="58" cy="18" r="10" fill="#F5A623" opacity="0.85" />
</svg>
