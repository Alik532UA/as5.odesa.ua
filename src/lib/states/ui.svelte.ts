class UIState {
	isMenuOpen = $state(false);
	theme = $state<'light' | 'dark'>('light');
	backgroundType = $state<0 | 1 | 2 | 3>(2);
	isThemeChanging = $state(false);
	isLangChanging = $state(false);
	// Debug toggles
	enableDynamicBackground = $state(true);
	enableBlurEffect = $state(true);

	constructor() {
		if (typeof window !== 'undefined') {
			// Read theme from localStorage or OS settings
			const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
			if (savedTheme) {
				this.setTheme(savedTheme, { withBlur: false });
			} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
				this.setTheme('dark', { withBlur: false });
			} else {
				this.setTheme('light', { withBlur: false });
			}
			
			// Read background type from localStorage
			const savedBg = localStorage.getItem('backgroundType') as '0' | '1' | '2' | '3' | null;
			if (savedBg) {
				this.backgroundType = parseInt(savedBg) as 0 | 1 | 2 | 3;
			}

			// Read debug settings from localStorage
			const enableDynBg = localStorage.getItem('enableDynamicBackground');
			if (enableDynBg !== null) {
				this.enableDynamicBackground = enableDynBg === 'true';
			}
			const enableBlur = localStorage.getItem('enableBlurEffect');
			if (enableBlur !== null) {
				this.enableBlurEffect = enableBlur === 'true';
			}
			
			// Listen to OS theme changes
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
				if (!localStorage.getItem('theme')) {
					this.setTheme(e.matches ? 'dark' : 'light');
				}
			});
		}
	}

	toggleMenu = () => {
		this.isMenuOpen = !this.isMenuOpen;
		// Блокуємо скрол при відкритому меню
		if (typeof document !== 'undefined') {
			document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
		}
	};

	closeMenu = () => {
		this.isMenuOpen = false;
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	};

	setTheme = async (t: 'light' | 'dark', options: { withBlur?: boolean } = {}) => {
		if (this.theme === t) return;

		const withBlur = options.withBlur ?? true;

		if (withBlur && this.enableBlurEffect) {
			this.isThemeChanging = true;
			// Чекаємо повної тривалості блюру (0.3s) ДО зміни теми
			await new Promise((r) => setTimeout(r, 300));
		}

		this.theme = t;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', t);
			if (t === 'dark') {
				document.documentElement.classList.add('dark-theme');
			} else {
				document.documentElement.classList.remove('dark-theme');
			}
		}
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', t);
		}

		if (withBlur && this.enableBlurEffect) {
			// Даємо час на розчинення блюру
			setTimeout(() => {
				this.isThemeChanging = false;
			}, 300);
		}
	};

	setBackgroundType = (type: 0 | 1 | 2 | 3) => {
		const oldType = this.backgroundType;
		this.backgroundType = type;
		console.log("[UIState] Background type changed:", {
			from: oldType,
			to: type,
			isEnabled: this.enableDynamicBackground,
			timestamp: new Date().toISOString(),
		});
		if (typeof localStorage !== 'undefined' && type !== 0) {
			localStorage.setItem('backgroundType', type.toString());
		}
	};

	toggleDynamicBackground = () => {
		const oldState = this.enableDynamicBackground;
		this.enableDynamicBackground = !this.enableDynamicBackground;
		console.log("[UIState] Dynamic background toggled:", {
			from: oldState,
			to: this.enableDynamicBackground,
			currentType: this.backgroundType,
			timestamp: new Date().toISOString(),
		});
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('enableDynamicBackground', this.enableDynamicBackground.toString());
		}
	};

	toggleBlurEffect = () => {
		this.enableBlurEffect = !this.enableBlurEffect;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('enableBlurEffect', this.enableBlurEffect.toString());
		}
	};
}

export const ui = new UIState();
