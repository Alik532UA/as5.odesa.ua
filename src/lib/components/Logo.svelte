<script lang="ts">
	import { ui } from "$lib/states/ui.svelte";
	import { base } from "$app/paths";

	let { size = 'large' }: { size?: 'large' | 'small' } = $props();

	const dimensions = {
		large: { width: 140, height: 140 },
		small: { width: 80, height: 80 }
	};

	const d = $derived(dimensions[size]);
	const logoSrc = $derived(ui.theme === 'dark' ? `${base}/ods-as5-logo-full-inverted.svg` : `${base}/ods-as5-logo-full.svg`);
</script>

<img
	src={logoSrc}
	alt="Логотип Одеської школи мистецтв №5"
	class="logo-img"
	width={d.width}
	height={d.height}
/>

<style>
	.logo-img {
		flex-shrink: 0;
		object-fit: contain;
		display: block;
	}
</style>
