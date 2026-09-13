<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<section class="page-content container" style="padding: 160px 24px 6rem;">
	<h1 style="font-family: var(--font-heading); font-size: clamp(1.75rem, 8vw, 3rem); color: var(--color-deep-ocean); margin-bottom: 2rem;">{$t('admission.title')}</h1>
	<div style="font-size: 1.2rem; line-height: 1.8; color: var(--color-body-text);">
		<p style="margin-bottom: 1rem; font-weight: bold;">{$t('admission.p1')}</p>
		<p style="margin-bottom: 1rem;">{$t('admission.p2')}</p>
		<p style="margin-bottom: 1rem;">{$t('admission.p3')}</p>
		<p style="margin-bottom: 0.5rem;">{$t('admission.p4')}</p>
		<ul style="margin-bottom: 1.5rem; padding-left: 2rem;">
			<li>{$t('admission.l1')}</li>
			<li>{$t('admission.l2')}</li>
		</ul>
		<p style="margin-bottom: 0.5rem; font-weight: bold;">{$t('admission.p5')}</p>
		<div class="admission__contacts">
			<a
				class="admission__contact"
				href="https://maps.app.goo.gl/khSVpMmKieTdW2Ao7"
				target="_blank"
				rel="noopener noreferrer"
				data-testid="admission-address-link"
			>
				{$t('admission.address')}
			</a>
			<a class="admission__contact" href="tel:+380487238110" data-testid="admission-phone-link">
				{$t('admission.phone')}
			</a>
		</div>
		<p>{$t('admission.p6')}</p>
	</div>
</section>

<style>
	/*
	 * Стовпчик кнопок, кожна завширшки зі свій напис.
	 *
	 * Доти тут стояв `max-width: 400px` на контейнері — і саме він давав те, що
	 * автор назвав «кнопка коротка, хоча місце є»: адреса ламалася після «вул.»,
	 * а номер телефону розривався посеред себе. Ширину задавав контейнер, а не
	 * вміст.
	 *
	 * `align-items: flex-start` замість ширини на дітях: інакше кнопки
	 * розтягувалися б на всю колонку тексту (а це ~1100 px), і напис на 300 px
	 * плавав би посеред порожньої плашки.
	 */
	.admission__contacts {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 1.5rem;
	}

	/*
	 * Кольори — з ТОКЕНІВ теми, а не зашиті. Доти стояв `#0066cc`, тобто синій,
	 * якого в палітрі сайту немає взагалі: у темній темі він лишався тим самим і
	 * не мав стосунку до решти сторінки.
	 *
	 * ПАРА `--color-deep-ocean` + `--color-white`, і саме ця. Перша редакція
	 * узяла `--color-sea-blue`, і гейт `contrast.test.ts` одразу її завернув:
	 * білий на `#2196ba` дає 3,42:1 при порозі 4,5 — тобто «поліпшення» зробило
	 * кнопку гіршою за зашитий синій, який давав 5,9.
	 *
	 * Обидва токени ПЕРЕВЕРТАЮТЬСЯ з темою (`light-dark`), тож пара тримається в
	 * обох: 7,2:1 у світлій (білий на #1b5e7b) і 6,0:1 у темній (#122533 на
	 * #3aacce). Одна пара замість двох різних наборів.
	 *
	 * `max-width: 100%` — щоб на вузькому екрані кнопка не вилізла за колонку:
	 * там напис таки перенесеться, і це правильно. Не переноситься лише номер
	 * усередині себе — нерозривні пробіли стоять у самому рядку перекладу.
	 */
	.admission__contact {
		display: inline-block;
		max-width: 100%;
		padding: 12px 24px;
		border-radius: var(--radius-full);
		background: var(--color-deep-ocean);
		color: var(--color-white);
		font-weight: 600;
		text-align: center;
		text-decoration: none;
		transition: all var(--transition-base);
	}

	/*
	 * Наведення НЕ міняє пару кольорів, і це рішення: будь-який інший синій із
	 * палітри провалює поріг із білим (`--color-sea-blue` — 3,42:1,
	 * `--color-sea-blue-light` іще світліший). Відгук дає підйом, тінь і
	 * обведення акцентом — його видно так само добре, а міряти треба одну пару,
	 * а не по парі на стан.
	 */
	.admission__contact:hover,
	.admission__contact:focus-visible {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		outline: 2px solid var(--color-golden);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.admission__contact {
			transition: none;
		}

		.admission__contact:hover,
		.admission__contact:focus-visible {
			transform: none;
		}
	}
</style>
