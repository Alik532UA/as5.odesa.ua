<script lang="ts">
	import Logo from "./Logo.svelte";
	import BirdIcon from "./icons/BirdIcon.svelte";
	import LocationIcon from "./icons/LocationIcon.svelte";
	import PhoneIcon from "./icons/PhoneIcon.svelte";
	import EmailIcon from "./icons/EmailIcon.svelte";
	import GlobeIcon from "./icons/GlobeIcon.svelte";
	import FacebookIcon from "./icons/FacebookIcon.svelte";
	import InstagramIcon from "./icons/InstagramIcon.svelte";
	import TikTokIcon from "./icons/TikTokIcon.svelte";
</script>

<footer class="footer" id="main-footer">
	<!-- Decorative seagulls -->
	<BirdIcon className="footer__seagull-1" size={30} />
	<BirdIcon className="footer__seagull-2" size={22} />

	<div class="container">
		<div class="footer__content">
			<!-- Logo -->
			<div class="footer__logo">
				<Logo size="small" />
			</div>

			<!-- Address -->
			<div class="footer__info" id="footer-address">
				<div class="footer__info-item">
					<LocationIcon className="footer__icon" size={18} />
					<span>Лермонтовський пров.,<br />д. 2, Одеса</span>
				</div>
			</div>

			<!-- Phones -->
			<div class="footer__info" id="footer-phones">
				<div class="footer__info-item">
					<PhoneIcon className="footer__icon" size={18} />
					<div>
						<a href="tel:+380000000000" class="footer__link"
							>+380 00 000 00 00</a
						><br />
						<a href="tel:+380000000000" class="footer__link"
							>+380 00 000 00 00</a
						>
					</div>
				</div>
			</div>

			<!-- Email -->
			<div class="footer__info" id="footer-email">
				<div class="footer__info-item">
					<EmailIcon className="footer__icon" size={18} />
					<div>
						<a
							href="mailto:example@gmail.com"
							class="footer__link">example@gmail.com</a
						>
					</div>
				</div>
				<div class="footer__info-item">
					<GlobeIcon className="footer__icon" size={18} />
					<a
						href="mailto:example@gmail.com"
						class="footer__link">example@gmail.com</a
					>
				</div>
			</div>

			<!-- Social icons -->
			<div class="footer__social" id="footer-social">
				<a
					href="https://facebook.com"
					class="footer__social-link"
					aria-label="Facebook"
					target="_blank"
					rel="noopener noreferrer"
				>
					<FacebookIcon size={24} />
				</a>
				<a
					href="https://instagram.com"
					class="footer__social-link"
					aria-label="Instagram"
					target="_blank"
					rel="noopener noreferrer"
				>
					<InstagramIcon size={24} />
				</a>
				<a
					href="https://tiktok.com"
					class="footer__social-link"
					aria-label="TikTok"
					target="_blank"
					rel="noopener noreferrer"
				>
					<TikTokIcon size={24} />
				</a>
			</div>
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

<style>
	.footer {
		background: var(--color-white);
		padding: var(--space-2xl) 0;
		position: relative;
		border-top: 1px solid var(--color-border);
	}

	/* Seagulls */
	:global(.footer__seagull-1) {
		position: absolute;
		top: 15px;
		left: 15%;
		animation: seagullFly 5s ease-in-out infinite;
		animation-delay: 0.5s;
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
		gap: var(--space-xl);
		flex-wrap: wrap;
	}

	.footer__logo {
		flex-shrink: 0;
	}

	/* Info items */
	.footer__info {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.footer__info-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		font-size: 0.85rem;
		color: var(--color-body-text);
		line-height: 1.5;
	}

	:global(.footer__icon) {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.footer__link {
		color: var(--color-body-text);
		transition: color var(--transition-fast);
	}

	.footer__link:hover {
		color: var(--color-deep-ocean);
	}

	/* Social */
	.footer__social {
		display: flex;
		gap: var(--space-md);
	}

	.footer__social-link {
		width: 40px;
		height: 40px;
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
		box-shadow: var(--shadow-md);
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
		height: 20px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.footer__content {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: var(--space-lg);
		}

		.footer__info-item {
			justify-content: center;
		}

		:global(.footer__seagull-1),
		:global(.footer__seagull-2) {
			display: none;
		}
	}
</style>
yle>
