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
	<g transform="translate(20, 16)">
		<path d="M 20,4 Q 10,0 0,4 L 0,44 Q 10,40 20,44" stroke="#1B5E7B" stroke-width="1.8" fill="none" />
		<path d="M 20,4 Q 30,0 40,4 L 40,44 Q 30,40 20,44" stroke="#1B5E7B" stroke-width="1.8" fill="none" />
		<line x1="20" y1="4" x2="20" y2="44" stroke="#1B5E7B" stroke-width="1" opacity="0.3" />
		<line x1="4" y1="16" x2="17" y2="16" stroke="#1B5E7B" stroke-width="0.6" opacity="0.3" />
		<line x1="4" y1="20" x2="17" y2="20" stroke="#1B5E7B" stroke-width="0.6" opacity="0.3" />
		<line x1="4" y1="24" x2="17" y2="24" stroke="#1B5E7B" stroke-width="0.6" opacity="0.3" />
		<line x1="4" y1="28" x2="17" y2="28" stroke="#1B5E7B" stroke-width="0.6" opacity="0.3" />
		<line x1="4" y1="32" x2="17" y2="32" stroke="#1B5E7B" stroke-width="0.6" opacity="0.3" />
		<ellipse cx="8" cy="28" rx="3" ry="2.5" fill="#1B5E7B" transform="rotate(-15 8 28)" />
		<line x1="11" y1="16" x2="11" y2="26" stroke="#1B5E7B" stroke-width="1.5" stroke-linecap="round" />
		<path d="M 28,14 Q 26,18 28,22 Q 30,26 28,30 Q 26,34 28,38" stroke="#1B5E7B" stroke-width="1.5" fill="none" stroke-linecap="round" />
		<circle cx="28" cy="30" r="3" stroke="#1B5E7B" stroke-width="1" fill="none" />
	</g>
	<circle cx="58" cy="18" r="10" fill="#F5A623" opacity="0.85" />
</svg>
