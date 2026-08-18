import { storage } from '$lib/services/storage';

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
			// Тема: збережений вибір, інакше налаштування системи.
			//
			// `persist: false` тут — не оптимізація, а суть. Доти цей блок ішов
			// через звичайний `setTheme`, який ЗАВЖДИ пише у сховище, і в гілці
			// «збереженого вибору немає, система темна» одразу створював запис
			// `theme=dark`. Далі слухач нижче питає рівно `storage.get('theme')`,
			// щоб відрізнити «користувач обрав» від «беремо з системи» — і після
			// такого запису відповідь назавжди «обрав».
			//
			// Наслідок був асиметричний і тому непомітний: у світлій системі
			// `setTheme('light')` виходив по `this.theme === t` ще до запису, тож
			// стеження за системою працювало; у темній — не працювало ЖОДНОГО
			// разу. Відвідувач із темною системою, перемкнувши її на світлу,
			// лишався в темній темі без пояснення, бо сам він нічого не обирав.
			// `matchMedia` береться ОДИН раз і перевіряється один раз. Доти
			// перше звернення було під `window.matchMedia && …`, а друге (слухач
			// нижче) — голе. Тобто перевірка була, і не захищала: у середовищі
			// без `matchMedia` конструктор кидав саме на другому рядку. А цей
			// клас — module-level синглтон, який імпортує `+layout.svelte`, тож
			// виняток тут падає під час завантаження модуля й забирає сайт
			// цілком, а не лише перемикач теми.
			const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
			const savedTheme = storage.get('theme') as 'light' | 'dark' | null;
			const initialTheme = savedTheme ?? (darkQuery?.matches ? 'dark' : 'light');

			// Напряму, а не через `setTheme`: той виходить достроково, коли тема
			// збігається з полем, і DOM лишався б синхронізованим лише завдяки
			// анти-FOUC скрипту в `app.html`. Той скрипт має власний `try/catch`,
			// тобто його відмова мовчазна — покладатися на неї як на єдине
			// джерело атрибута означало б тримати стан, який ніхто не виставив.
			this.theme = initialTheme;
			this.applyThemeToDocument(initialTheme);

			// Тип тла зі сховища
			const savedBg = storage.get('backgroundType') as '0' | '1' | '2' | '3' | null;
			if (savedBg) {
				this.backgroundType = parseInt(savedBg) as 0 | 1 | 2 | 3;
			}

			// Діагностичні перемикачі зі сховища
			const enableDynBg = storage.get('enableDynamicBackground');
			if (enableDynBg !== null) {
				this.enableDynamicBackground = enableDynBg === 'true';
			}
			const enableBlur = storage.get('enableBlurEffect');
			if (enableBlur !== null) {
				this.enableBlurEffect = enableBlur === 'true';
			}
			
			// Стеження за системною темою. `persist: false` — з тієї ж причини,
			// що й вище: системна зміна не є вибором користувача, і записати її
			// означало б вимкнути це стеження після першого ж спрацювання.
			darkQuery?.addEventListener('change', (e) => {
				if (!storage.get('theme')) {
					this.setTheme(e.matches ? 'dark' : 'light', { persist: false });
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

	/**
	 * Синхронізує DOM із темою. Нічого не зберігає й не читає стану — саме тому
	 * її можна викликати і з конструктора, і зі зміни теми.
	 */
	private applyThemeToDocument(t: 'light' | 'dark') {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', t);
		// Tell browser we handle color schemes — prevents auto-dark-mode
		const csMeta = document.querySelector('meta[name="color-scheme"]');
		if (csMeta) csMeta.setAttribute('content', t === 'dark' ? 'dark' : 'light dark');
		document.documentElement.classList.toggle('dark-theme', t === 'dark');
	}

	/**
	 * @param options.persist `true` (типово) — це ВИБІР користувача, і його
	 * треба запам'ятати. `false` — тему нав'язала система або перше
	 * завантаження; запис зробив би її «вибором» і назавжди відрізав стеження
	 * за системною темою (див. конструктор).
	 */
	setTheme = async (
		t: 'light' | 'dark',
		options: { withBlur?: boolean; persist?: boolean } = {}
	) => {
		if (this.theme === t) return;

		const withBlur = options.withBlur ?? true;
		const persist = options.persist ?? true;

		if (withBlur && this.enableBlurEffect) {
			this.isThemeChanging = true;
			// Чекаємо повної тривалості блюру (0.3s) ДО зміни теми
			await new Promise((r) => setTimeout(r, 300));
		}

		this.theme = t;
		this.applyThemeToDocument(t);
		if (persist) storage.set('theme', t);

		if (withBlur && this.enableBlurEffect) {
			// Даємо час на розчинення блюру
			setTimeout(() => {
				this.isThemeChanging = false;
			}, 300);
		}
	};

	setBackgroundType = (type: 0 | 1 | 2 | 3) => {
		this.backgroundType = type;
		// Нуль не зберігається навмисно: «немає тла» виражає прапорець
		// `enableDynamicBackground`, і збережений нуль перекрив би тип, до
		// якого користувач повернеться, увімкнувши тло знову.
		if (type !== 0) {
			storage.set('backgroundType', type.toString());
		}
	};

	toggleDynamicBackground = () => {
		this.enableDynamicBackground = !this.enableDynamicBackground;
		storage.set('enableDynamicBackground', this.enableDynamicBackground.toString());
	};

	toggleBlurEffect = () => {
		this.enableBlurEffect = !this.enableBlurEffect;
		storage.set('enableBlurEffect', this.enableBlurEffect.toString());
	};
}

export const ui = new UIState();
