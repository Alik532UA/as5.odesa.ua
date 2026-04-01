<script lang="ts">
	import Logo from "./Logo.svelte";

	let scrolled = $state(false);
	let mobileMenuOpen = $state(false);

	const navItems = [
		{ label: "Головна", href: "/" },
		{ label: "Про Школу", href: "/pro-shkolu" },
		{ label: "Історія", href: "/istoriia" },
		{ label: "Конкурси", href: "/konkursy" },
		{ label: "Оголошення", href: "/oholoshennia" },
	];

	$effect(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 20;
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	});

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<header class="header" class:scrolled id="main-header">
	<div class="header__logo-area">
		<a href="/" class="header__logo-link" aria-label="На головну">
			<Logo size="large" />
		</a>
	</div>

	<div class="header__bar">
		<nav class="header__nav" aria-label="Головне меню" id="main-nav">
			<ul class="header__nav-list" class:open={mobileMenuOpen}>
				{#each navItems as item, i}
					<li class="header__nav-item">
						<a
							href={item.href}
							class="header__nav-link"
							class:active={item.href === "/"}
							id="nav-{item.href.replace('/', '') || 'home'}"
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<a href="/vstup" class="btn btn-outline header__cta" id="header-cta">
			ДЛЯ ВСТУПУ
		</a>

		<button
			class="header__burger"
			onclick={toggleMobileMenu}
			aria-label={mobileMenuOpen ? "Закрити меню" : "Відкрити меню"}
			aria-expanded={mobileMenuOpen}
			id="burger-menu"
		>
			<span class="header__burger-line" class:open={mobileMenuOpen}
			></span>
			<span class="header__burger-line" class:open={mobileMenuOpen}
			></span>
			<span class="header__burger-line" class:open={mobileMenuOpen}
			></span>
		</button>
	</div>

	<!-- Mobile overlay menu -->
	{#if mobileMenuOpen}
		<div class="header__mobile-overlay" role="dialog" aria-modal="true">
			<nav aria-label="Мобільне меню">
				<ul class="header__mobile-list">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class="header__mobile-link"
								onclick={() => (mobileMenuOpen = false)}
							>
								{item.label}
							</a>
						</li>
					{/each}
					<li>
						<a
							href="/vstup"
							class="btn btn-primary header__mobile-cta"
							onclick={() => (mobileMenuOpen = false)}
						>
							ДЛЯ ВСТУПУ
						</a>
					</li>
				</ul>
			</nav>
		</div>
	{/if}
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		align-items: flex-start;
		padding: 0;
		transition: all var(--transition-base);
	}

	/* Logo area — positioned to the left, overlapping like in reference */
	.header__logo-area {
		position: absolute;
		top: 10px;
		left: 30px;
		z-index: 110;
		filter: drop-shadow(0 4px 12px rgba(27, 94, 123, 0.15));
		transition: transform var(--transition-base);
	}

	.header__logo-link {
		display: block;
	}

	.scrolled .header__logo-area {
		transform: scale(0.7);
		top: 2px;
		left: 20px;
	}

	/* Navigation bar */
	.header__bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-xl);
		width: 100%;
		padding: var(--space-lg) var(--space-xl) var(--space-lg) 200px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-base);
	}

	.scrolled .header__bar {
		padding-top: var(--space-md);
		padding-bottom: var(--space-md);
		box-shadow: var(--shadow-md);
	}

	/* Navigation */
	.header__nav {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.header__nav-list {
		display: flex;
		align-items: center;
		gap: var(--space-2xl);
	}

	.header__nav-link {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-dark-text);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
		position: relative;
	}

	.header__nav-link:hover,
	.header__nav-link.active {
		color: var(--color-deep-ocean);
	}

	.header__nav-link.active::after {
		content: "";
		position: absolute;
		bottom: -2px;
		left: var(--space-md);
		right: var(--space-md);
		height: 2px;
		background: var(--color-deep-ocean);
		border-radius: 1px;
	}

	/* CTA Button */
	.header__cta {
		font-size: 0.8rem;
		padding: 0.6rem 1.5rem;
	}

	/* Burger */
	.header__burger {
		display: none;
		flex-direction: column;
		gap: 5px;
		width: 30px;
		padding: 4px 0;
		z-index: 120;
	}

	.header__burger-line {
		width: 100%;
		height: 2.5px;
		background: var(--color-deep-ocean);
		border-radius: 2px;
		transition: all var(--transition-base);
		transform-origin: center;
	}

	.header__burger-line.open:nth-child(1) {
		transform: rotate(45deg) translate(5px, 5px);
	}

	.header__burger-line.open:nth-child(2) {
		opacity: 0;
	}

	.header__burger-line.open:nth-child(3) {
		transform: rotate(-45deg) translate(6px, -6px);
	}

	/* Mobile overlay */
	.header__mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(255, 255, 255, 0.98);
		backdrop-filter: blur(20px);
		z-index: 105;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.3s ease;
	}

	.header__mobile-list {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
	}

	.header__mobile-link {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-deep-ocean);
		transition: color var(--transition-fast);
	}

	.header__mobile-link:hover {
		color: var(--color-golden);
	}

	.header__mobile-cta {
		margin-top: var(--space-lg);
		font-size: 1rem;
		padding: 1rem 2.5rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.header__bar {
			padding-left: 160px;
		}

		.header__logo-area {
			left: 15px;
		}

		.scrolled .header__logo-area {
			left: 10px;
		}
	}

	@media (max-width: 768px) {
		.header__nav,
		.header__cta {
			display: none;
		}

		.header__burger {
			display: flex;
		}

		.header__bar {
			padding-left: 120px;
			justify-content: flex-end;
		}

		.header__logo-area {
			top: 5px;
			left: 10px;
		}

		.header__logo-area :global(.logo-svg) {
			width: 90px;
			height: 90px;
		}

		.scrolled .header__logo-area {
			transform: scale(0.8);
			top: 0;
		}
	}
</style>
