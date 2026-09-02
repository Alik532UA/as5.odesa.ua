/**
 * Оверлеї сайту — стани, яких у prerendered HTML немає, — спільні для всіх
 * E2E-гейтів, що їх відкривають: axe (`a11y.spec.ts`) і сенсорні цілі
 * (`touch-targets.spec.ts`).
 *
 * Той самий принцип, що й у `routes.ts`: два власні переліки станів розходяться
 * на першому ж новому оверлеї, а виглядає це як «там перевірено». До 2026-09-02
 * перелік із тими самими трьома парами `open`/`root` лежав у
 * `touch-targets.spec.ts` окремо, а гейт axe про оверлеї не знав узагалі — тобто
 * межа § 10.2 з ACCESSIBILITY-v8 («аудит бачить лише те, що є після `goto()`»)
 * була записана в докблоку і нічим не закрита.
 *
 * `viewport` — вікно, у якому тригер видимий і в якому стан справді
 * використовують: бургер існує лише на вузькому екрані, панель налаштувань і
 * піаніно відкривають із широкого. `open` і `root` — `data-testid` тригера й
 * кореня оверлея; корінь мусить стати видимим після кліку, інакше гейт падає, а
 * не пропускає стан мовчки.
 */
export const OVERLAYS = [
	{
		name: 'мобільне меню',
		open: 'header-burger-btn',
		root: 'mobile-menu-modal',
		viewport: { width: 390, height: 844 }
	},
	{
		name: 'налаштування',
		open: 'header-settings-btn',
		root: 'header-settings-panel',
		viewport: { width: 1280, height: 900 }
	},
	{
		name: 'піаніно',
		open: 'footer-piano-btn',
		root: 'piano-modal',
		viewport: { width: 1280, height: 900 }
	}
] as const;

export type Overlay = (typeof OVERLAYS)[number];
