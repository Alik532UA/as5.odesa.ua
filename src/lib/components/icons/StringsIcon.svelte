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
	<g transform="translate(26, 12)">
		<path d="M 14,4 Q 10,0 8,4 Q 6,8 10,8" stroke="#1B5E7B" stroke-width="1.8" fill="none" stroke-linecap="round" />
		<line x1="14" y1="4" x2="14" y2="24" stroke="#1B5E7B" stroke-width="2" />
		<line x1="10" y1="8" x2="18" y2="8" stroke="#1B5E7B" stroke-width="1.5" stroke-linecap="round" />
		<line x1="10" y1="13" x2="18" y2="13" stroke="#1B5E7B" stroke-width="1.5" stroke-linecap="round" />
		<path d="M 6,24 Q 2,30 6,36 Q 2,42 6,48 Q 10,54 14,54 Q 18,54 22,48 Q 26,42 22,36 Q 26,30 22,24 Q 18,20 14,20 Q 10,20 6,24 Z" stroke="#1B5E7B" stroke-width="1.8" fill="none" />
		<path d="M 10,30 Q 11,33 10,36" stroke="#1B5E7B" stroke-width="1.2" fill="none" stroke-linecap="round" />
		<path d="M 18,30 Q 17,33 18,36" stroke="#1B5E7B" stroke-width="1.2" fill="none" stroke-linecap="round" />
		<line x1="10" y1="38" x2="18" y2="38" stroke="#1B5E7B" stroke-width="1.2" stroke-linecap="round" />
		<line x1="12" y1="14" x2="12" y2="48" stroke="#1B5E7B" stroke-width="0.6" opacity="0.4" />
		<line x1="14" y1="14" x2="14" y2="48" stroke="#1B5E7B" stroke-width="0.6" opacity="0.4" />
		<line x1="16" y1="14" x2="16" y2="48" stroke="#1B5E7B" stroke-width="0.6" opacity="0.4" />
	</g>
	<circle cx="56" cy="20" r="10" fill="#F5A623" opacity="0.85" />
</svg>
