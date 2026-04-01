<script lang="ts">
	let { size = 'large' }: { size?: 'large' | 'small' } = $props();

	const dimensions = {
		large: { width: 140, height: 140 },
		small: { width: 80, height: 80 }
	};

	const d = $derived(dimensions[size]);
</script>

<img
	src="/ods-as5-logo-full_AlphaChannel.png"
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
