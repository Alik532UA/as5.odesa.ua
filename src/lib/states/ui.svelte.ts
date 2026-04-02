class UIState {
	isMenuOpen = $state(false);
	theme = $state<'light' | 'dark'>('light');

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

	setTheme = (t: 'light' | 'dark') => {
		this.theme = t;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', t);
		}
	};
}

export const ui = new UIState();
