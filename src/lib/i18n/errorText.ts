/**
 * Текст сторінки помилки — одна копія на два місця, де він потрібен.
 *
 * Заголовок помилки читають ДВА різні шари: `+error.svelte` показує його в
 * розмітці, а `+layout.svelte` ставить у `<title>`, бо власником усіх
 * head-тегів у цьому проєкті є рівно макет (SEO-v9 § 4.4,
 * `SEO-HEAD-SINGLE-OWNER`). Доти заголовок помилки жив лише в `+error.svelte`
 * разом із власним `<svelte:head>` — і на кожній сторінці помилки в DOM було
 * ДВА `<meta name="robots">` із протилежними значеннями: `index, follow…` від
 * макета й `noindex` від сторінки. Який із них візьме краулер — залежить від
 * краулера.
 *
 * Тому текст переїхав сюди: у `<title>` і в розмітці мусить бути один рядок, а
 * не дві копії ключів, які розійдуться на першому ж перекладі.
 *
 * `safeT`, а не `$t`: словники `svelte-i18n` вантажаться асинхронно, і сторінка
 * помилки — саме те місце, куди приходять до готовності словника (404 із
 * `404.html`). Без запасного тексту відвідувач побачив би `error.notFound.title`.
 */
import { safeT } from './translate';

/** 404 відрізняється від решти: «немає такої сторінки» ≠ «щось зламалося». */
const isNotFound = (status: number) => status === 404;

export function errorTitle(translate: (key: string) => string, status: number): string {
	return isNotFound(status)
		? safeT(translate, 'error.notFound.title', 'Сторінку не знайдено')
		: safeT(translate, 'error.generic.title', 'Щось пішло не так');
}

export function errorMessage(translate: (key: string) => string, status: number): string {
	return isNotFound(status)
		? safeT(
				translate,
				'error.notFound.message',
				'Такої сторінки немає. Можливо, посилання застаріло.'
			)
		: safeT(translate, 'error.generic.message', 'Сталася помилка під час завантаження сторінки.');
}
