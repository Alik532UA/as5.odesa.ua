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
	<g transform="translate(22, 10)">
		<path d="M 18,8 Q 30,12 32,28 Q 34,44 26,54 Q 18,60 10,54 Q 2,44 4,28 Q 6,16 18,8 Z" stroke="#1B5E7B" stroke-width="1.8" fill="none" />
		<path d="M 18,8 L 14,0" stroke="#1B5E7B" stroke-width="2" stroke-linecap="round" />
		<circle cx="14" cy="0" r="2" stroke="#1B5E7B" stroke-width="1.2" fill="none" />
		<circle cx="18" cy="34" r="5" stroke="#1B5E7B" stroke-width="1.2" fill="none" />
		<line x1="14" y1="4" x2="10" y2="50" stroke="#1B5E7B" stroke-width="0.5" opacity="0.4" />
		<line x1="16" y1="6" x2="14" y2="52" stroke="#1B5E7B" stroke-width="0.5" opacity="0.4" />
		<line x1="18" y1="8" x2="18" y2="52" stroke="#1B5E7B" stroke-width="0.5" opacity="0.4" />
		<line x1="20" y1="10" x2="22" y2="52" stroke="#1B5E7B" stroke-width="0.5" opacity="0.4" />
		<line x1="22" y1="12" x2="26" y2="50" stroke="#1B5E7B" stroke-width="0.5" opacity="0.4" />
		<circle cx="12" cy="20" r="1" fill="#1B5E7B" opacity="0.3" />
		<circle cx="24" cy="22" r="1" fill="#1B5E7B" opacity="0.3" />
	</g>
	<circle cx="56" cy="18" r="10" fill="#F5A623" opacity="0.85" />
</svg>
