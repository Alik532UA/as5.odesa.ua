<script lang="ts">
	import PianoModal from "./ui/PianoModal.svelte";
	import Wave from "./Wave.svelte";
	import BirdIcon from "./icons/BirdIcon.svelte";
	import LocationIcon from "./icons/LocationIcon.svelte";
	import PhoneIcon from "./icons/PhoneIcon.svelte";
	import EmailIcon from "./icons/EmailIcon.svelte";
	import FacebookIcon from "./icons/FacebookIcon.svelte";
	import InstagramIcon from "./icons/InstagramIcon.svelte";
	import { t } from "svelte-i18n";

	let isPianoOpen = $state(false);
</script>

<footer class="footer" id="main-footer">
	<!-- Top wave divider -->
	<div class="footer__wave-top" aria-hidden="true">
		<Wave
			height={100}
			amplitude={15}
			frequency={5}
			speed={0.003}
			color="#005fae"
			strokeWidth={15}
		/>
	</div>

	<!-- Decorative seagulls -->
	<BirdIcon className="footer__seagull-1" size={30} />
	<BirdIcon className="footer__seagull-2" size={22} />

	<div class="container">
		<div class="footer__content">
			<!-- 1. Button "грати" - Piano Keyboard Style -->
			<button
				class="footer__btn-piano"
				onclick={() => (isPianoOpen = true)}
				aria-label={$t("footer.play")}
			>
				<div class="footer__piano-visual">
					<span class="footer__piano-white"></span>
					<span class="footer__piano-white"></span>
					<span class="footer__piano-white"></span>
					<span class="footer__piano-white"></span>
					<span class="footer__piano-white"></span>
					<span class="footer__piano-black" style="left: 20%"></span>
					<!-- <span class="footer__piano-black" style="left: 35%"></span> -->
					<span class="footer__piano-black" style="left: 60%"></span>
					<span class="footer__piano-black" style="left: 80%"></span>
				</div>
				<span class="footer__btn-piano-text">{$t("footer.play")}</span>
			</button>

			<!-- 2. Contacts Group -->
			<div class="footer__contacts">
				<!-- Address -->
				<div class="footer__info" id="footer-address">
					<div class="footer__info-item">
						<LocationIcon className="footer__icon" size={18} />
						<a href="https://maps.app.goo.gl/khSVpMmKieTdW2Ao7" target="_blank" rel="noopener noreferrer" class="footer__link">
							{$t("footer.address")}
						</a>
					</div>
				</div>
				<div class="footer__info" id="footer-phones">
					<div class="footer__info-item">
						<PhoneIcon className="footer__icon" size={18} />
						<div>
							<a href="tel:+380487238110" class="footer__link"
								>{$t("footer.phone")}</a
							>
						</div>
					</div>
				</div>

				<div class="footer__info" id="footer-email">
					<div class="footer__info-item">
						<EmailIcon className="footer__icon" size={18} />
						<div>
							<a
								href="mailto:{$t('footer.email')}"
								class="footer__link">{$t("footer.email")}</a
							>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Social icons -->
			<div class="footer__social" id="footer-social">
				<a
					href={$t("footer.facebook")}
					class="footer__social-link"
					aria-label="Facebook"
					target="_blank"
					rel="noopener noreferrer"
				>
					<FacebookIcon size={24} />
				</a>
				<a
					href={$t("footer.instagram")}
					class="footer__social-link"
					aria-label="Instagram"
					target="_blank"
					rel="noopener noreferrer"
				>
					<InstagramIcon size={24} />
				</a>
			</div>

			<!-- 4. Button "замовити сайт" -->
			<a
				href="https://t.me/ozapolnov"
				target="_blank"
				class="footer__btn-order"
			>
				{$t("footer.order")}
			</a>
		</div>
	</div>

	<!-- Bottom wave decoration -->
	<div class="footer__wave-bottom" aria-hidden="true">
		<svg viewBox="0 0 1440 30" preserveAspectRatio="none" fill="none">
			<path
				d="M0,15 Q120,5 240,15 Q360,25 480,15 Q600,5 720,15 Q840,25 960,15 Q1080,5 1200,15 Q1320,25 1440,15"
				stroke="#D6EEF5"
				stroke-width="1.5"
				fill="none"
			/>
		</svg>
	</div>
</footer>

<PianoModal isOpen={isPianoOpen} onClose={() => (isPianoOpen = false)} />

<style>
	.footer {
		background: var(--color-white);
		padding: var(--space-xl) 0;
		position: relative;
		border: none;
		margin-top: 100px; /* Space for the wave */
	}

	.footer__wave-top {
		position: absolute;
		top: -100px;
		left: 0;
		right: 0;
		height: 100px;
		line-height: 0;
		z-index: 5;
		background: linear-gradient(180deg, var(--color-light-blue) 0%, var(--color-white) 100%);
	}

	/* Seagulls */
	:global(.footer__seagull-1) {
		position: absolute;
		top: 15px;
		left: 15%;
		animation: seagullFly 5s ease-in-out infinite;
	}

	:global(.footer__seagull-2) {
		position: absolute;
		top: 8px;
		left: 22%;
		animation: seagullFly 5s ease-in-out infinite;
		animation-delay: 2s;
	}

	/* Content layout */
	.footer__content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	/* Piano Button Style (Keyboard Segment) */
	.footer__btn-piano {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		width: 120px;
		height: 36px;
		background: #000;
		border: 2px solid #000;
		border-radius: 4px 4px 6px 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 3px 0 #000;
		overflow: hidden;
		padding: 0;
	}

	.footer__piano-visual {
		position: absolute;
		inset: 0;
		display: flex;
		background: #000;
	}

	.footer__piano-white {
		flex: 1;
		background: #fff;
		border-right: 1px solid #ddd;
		height: 100%;
	}

	.footer__piano-white:last-child {
		border-right: none;
	}

	.footer__piano-black {
		position: absolute;
		top: 0;
		width: 12%;
		height: 60%;
		background: #000;
		border-radius: 0 0 2px 2px;
		transform: translateX(-50%);
		z-index: 1;
	}

	.footer__btn-piano:hover {
		transform: translateY(1.5px);
		box-shadow: 0 1.5px 0 #000;
	}

	.footer__btn-piano:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 #000;
	}

	.footer__btn-piano-text {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #000;
		z-index: 2;
		background: rgba(255, 255, 255, 0.7);
		padding: 1px 4px;
		border-radius: 3px;
		pointer-events: none;
		margin-bottom: 2px;
	}

	/* Order Button Style */
	.footer__btn-order {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 120px;
		height: 36px;
		background: transparent;
		color: var(--color-deep-ocean);
		border: 2px solid var(--color-deep-ocean);
		border-radius: var(--radius-full);
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all var(--transition-base);
		text-align: center;
		line-height: 1.1;
	}

	.footer__btn-order:hover {
		background: var(--color-deep-ocean);
		color: white;
		transform: translateY(-2px);
	}

	.footer__contacts {
		display: flex;
		gap: var(--space-lg);
		align-items: center;
	}

	.footer__info-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.8rem;
		color: var(--color-body-text);
		white-space: nowrap;
	}

	.footer__link {
		transition: color var(--transition-fast);
	}

	.footer__link:hover {
		color: var(--color-deep-ocean);
	}

	/* Social */
	.footer__social {
		display: flex;
		gap: var(--space-sm);
	}

	.footer__social-link {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-deep-ocean);
		color: var(--color-white);
		transition: all var(--transition-base);
	}

	.footer__social-link:hover {
		background: var(--color-golden);
		transform: translateY(-3px);
	}

	/* Bottom wave */
	.footer__wave-bottom {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		line-height: 0;
	}

	.footer__wave-bottom svg {
		width: 100%;
		height: 15px;
	}

	/* Responsive */
	@media (max-width: 1200px) {
		.footer__contacts {
			gap: var(--space-md);
		}
		.footer__info-item {
			font-size: 0.75rem;
		}
	}

	@media (max-width: 1024px) {
		.footer__content {
			flex-wrap: wrap;
			justify-content: center;
			gap: var(--space-lg);
		}
		.footer__contacts {
			order: 1;
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 768px) {
		.footer__contacts {
			flex-direction: column;
			gap: var(--space-sm);
		}
		.footer__content {
			flex-direction: column;
		}
		:global(.footer__seagull-1),
		:global(.footer__seagull-2) {
			display: none;
		}
	}
</style>
