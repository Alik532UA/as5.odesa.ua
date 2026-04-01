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
	<g transform="translate(28, 14)">
		<rect x="6" y="0" width="14" height="28" rx="7" fill="none" stroke="#1B5E7B" stroke-width="2" />
		<path d="M 0,20 Q 0,36 13,36 Q 26,36 26,20" stroke="#1B5E7B" stroke-width="2" fill="none" stroke-linecap="round" />
		<line x1="13" y1="36" x2="13" y2="46" stroke="#1B5E7B" stroke-width="2" stroke-linecap="round" />
		<line x1="6" y1="46" x2="20" y2="46" stroke="#1B5E7B" stroke-width="2" stroke-linecap="round" />
		<line x1="9" y1="8" x2="17" y2="8" stroke="#1B5E7B" stroke-width="1" opacity="0.5" />
		<line x1="9" y1="12" x2="17" y2="12" stroke="#1B5E7B" stroke-width="1" opacity="0.5" />
		<line x1="9" y1="16" x2="17" y2="16" stroke="#1B5E7B" stroke-width="1" opacity="0.5" />
	</g>
	<circle cx="56" cy="20" r="12" fill="#F5A623" opacity="0.85" />
</svg>
