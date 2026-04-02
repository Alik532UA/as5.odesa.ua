class UIState {
	isMenuOpen = $state(false);
	theme = $state<'light' | 'dark'>('light');

	constructor() {
		if (typeof window !== 'undefined') {
			// Read theme from localStorage or OS settings
			const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
			if (savedTheme) {
				this.setTheme(savedTheme);
			} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
				this.setTheme('dark');
			} else {
				this.setTheme('light');
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

	setTheme = (t: 'light' | 'dark') => {
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
	};
}

export const ui = new UIState();
