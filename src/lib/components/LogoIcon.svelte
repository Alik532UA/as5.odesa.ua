<script lang="ts">
	import { ui } from "$lib/states/ui.svelte";
	import { asset } from "$app/paths";
	import { t } from "svelte-i18n";

	let { size = 'large' }: { size?: 'large' | 'small' } = $props();

	const dimensions = {
		large: { width: 140, height: 140 },
		small: { width: 80, height: 80 }
	};

	const d = $derived(dimensions[size]);
	const logoSrc = $derived(ui.theme === 'dark' ? asset('/svg/ods-as5-logo-full-inverted.svg') : asset('/svg/ods-as5-logo-full.svg'));
</script>

<!--
	`alt` — зі словника, а не рядком у розмітці.

	Тут він був захардкоджений українською, і це не дрібниця локалізації: логотип
	стоїть у шапці КОЖНОЇ сторінки, тобто англійська версія сайту віддавала
	українське `alt` завжди. Пропустила його не неуважність, а сама команда
	пошуку — `PROJECT-CONTEXT.md` міряв хардкод грепом по `aria-label=`, і `alt`
	у ту команду не входив. Тепер за атрибутами стежить `src/i18n-literals.test.ts`.
-->
<img
	src={logoSrc}
	alt={$t("a11y.logoAlt")}
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
