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
	<g transform="translate(24, 10)">
		<rect x="13" y="0" width="6" height="10" rx="2" stroke="#1B5E7B" stroke-width="1.5" fill="none" />
		<rect x="14" y="10" width="4" height="22" stroke="#1B5E7B" stroke-width="1.5" fill="none" />
		<line x1="14" y1="16" x2="18" y2="16" stroke="#1B5E7B" stroke-width="0.8" opacity="0.5" />
		<line x1="14" y1="21" x2="18" y2="21" stroke="#1B5E7B" stroke-width="0.8" opacity="0.5" />
		<line x1="14" y1="26" x2="18" y2="26" stroke="#1B5E7B" stroke-width="0.8" opacity="0.5" />
		<path d="M 6,32 Q 0,38 4,46 Q 8,54 16,56 Q 24,54 28,46 Q 32,38 26,32 Q 22,28 16,28 Q 10,28 6,32 Z" stroke="#1B5E7B" stroke-width="1.8" fill="none" />
		<circle cx="16" cy="42" r="5" stroke="#1B5E7B" stroke-width="1.2" fill="none" />
		<circle cx="10" cy="36" r="1.5" fill="#1B5E7B" opacity="0.4" />
		<circle cx="22" cy="36" r="1.5" fill="#1B5E7B" opacity="0.4" />
	</g>
	<circle cx="56" cy="18" r="10" fill="#F5A623" opacity="0.85" />
</svg>
