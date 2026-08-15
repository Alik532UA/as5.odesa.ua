# Контекст проєкту: as5.odesa.ua

Персональний шар над пакетом v8 (`sveltekit-canon/selection_criteria/v8`).
Пакет описує, як має бути взагалі; цей файл — що обрано саме тут і чому.

Кожне число нижче отримано командою в сесії 2026-08-16, а не з пам'яті
(AI-AGENT-PITFALLS-v8 § 5.5). Команда вказана поруч, щоб наступний читач міг
перевірити, не вгадуючи.

## Базові параметри

| Параметр | Значення |
|---|---|
| Профіль | **static** |
| Adapter | `@sveltejs/adapter-static` (`fallback: '404.html'`, `precompress: true`, `strict: true`) |
| Хостинг | GitHub Pages, репозиторій `Alik532UA/as5.odesa.ua` |
| Origin | `https://as5.odesa.ua` — **власний домен** (`src/lib/config/site.ts`) |
| base path | `''` — сторінки лежать у корені домену |
| Запасна адреса | `https://alik532ua.github.io/as5.odesa.ua/` віддається, але **не** канонічна |
| Порт dev-сервера | 5193 (`as5-dev` у `.claude/launch.json` кореня GitHub) |
| Спільний origin з іншими застосунками? | **так** для запасної адреси (`alik532ua.github.io`); власний домен ексклюзивний |
| PROJECT_PREFIX | `as5.odesa.ua_` |
| Префікс dev-середовища | не застосовується (окремого dev-деплою немає) |
| Версії | Svelte 5.56.9, SvelteKit 2.70.2, svelte-i18n 4.0.1, zod 4.3.6, vitest 3.2.7, eslint 10.8.1 |

### Переїзд на власний домен (2026-08-15) — завершений

Доти `SITE_ORIGIN` дорівнював `https://alik532ua.github.io`, а `paths.base` —
`/as5.odesa.ua`: код вважав сайт project page акаунта, хоча домен був куплений і
налаштований у Pages. Ціна розходження була живою — зібраний CSS просив шрифт за
`/as5.odesa.ua/fonts/…`, що на власному домені розгортається в
`as5.odesa.ua/as5.odesa.ua/fonts/…`, тобто 404, і сайт показувався системними
шрифтами.

Переїзд змінює рівно дві речі, і разом: `SITE_ORIGIN` у
`src/lib/config/site.ts` та `paths.base` у `svelte.config.js`. Плюс два рядки
(`Host`, `Sitemap`) у `static/robots.txt`. Формули `canonicalUrl()` і
`assetUrl()` писалися так, щоб пережити переїзд, і правок не потребували.

`static/CNAME` **не потрібен**: деплой іде офіційним `actions/deploy-pages`,
який зберігає прив'язку домену з налаштувань Pages. Перевірено на сусідньому
`teatralo4ka.odesa.ua` — власний домен, база `''`, CNAME немає ніде.
Відсутність CNAME тут **не** ознака того, що домен не активний.

## Реєстр префіксів на спільному origin

| Застосунок | Префікс |
|---|---|
| as5.odesa.ua | `as5.odesa.ua_` |
| CV | `cv-svelte_` |
| DigitalWorkshop | `digitalworkshop_` |
| MindStep | `mindstep_` |
| Slovko | `slovko_` |
| teatralo4ka | див. його `PROJECT-CONTEXT.md` |

`storage.clear()` **ніколи** не викликає `localStorage.clear()`: за запасною
адресою origin спільний, і це стерло б дані сусідніх застосунків.

## Прийняті рішення

| Питання | Обрано | Причина | Дата |
|---|---|---|---|
| Бібліотека i18n | `svelte-i18n` | вже стояла; словники — JSON, паритет тримає інваріант `translations.test.ts`, бо тип їх не звіряє | до 2026-08 |
| Типова мова | `uk` | сайт школи в Одесі | до 2026-08 |
| Мови в індексі | **лише `uk`** | англійська версія існує тільки в браузері, окремих адрес не має — див. «Що не перевіряється» | 2026-08-16 |
| Аналітика | GA4, рантайм-інжект `gtag.js` із `analytics.ts` | prerendered сторінки, nonce генерувати нема кому | до 2026-08 |
| Згода на збір даних | без банера | звірити з юристом; поки що зафіксовано як свідоме рішення | 2026-08-16 |
| Модель версіонування | `scripts/bump-version.js` вручну | версія потрібна у звіті про помилку, не у UI | до 2026-08 |
| CSP | `mode: 'hash'`, доставка мета-тегом | GitHub Pages не дає ставити заголовки | до 2026-08 |
| `frame-ancestors` | **свідомо відсутня** | у `<meta>`-варіанті специфікація велить браузеру її ігнорувати; тримати її в конфізі означало б вважати захист від clickjacking наявним | до 2026-08 |
| Позиція інлайн-скрипта в `app.html` | **ПІСЛЯ** `%sveltekit.head%`, хеш із файлу під час збірки | мета-політика діє лише на те, що йде після неї; вище неї хеш декоративний (SECURITY-v8 § 6.3) | 2026-08-16 |
| Компонентні тести | не пишуться | у `vitest.config.ts` немає плагіна `svelte`, тож `.svelte` у тестах не компілюється. Підхід **B** за CODE-QUALITY-v8 § 4.1, коли з'являться: jsdom уже стоїть | 2026-08-16 |

## Обрані optional-файли пакету

`I18N`, `ANALYTICS`, `DEPENDENCIES`, `VERSIONING`, `DEPLOY-ENVIRONMENTS`,
`CUSTOM-DOMAIN`.
Не застосовуються: `AUTH-FORM` (немає входу), `SCROLLBAR` і `MINIMAP`
(нативної смуги вистачає), `HOLD-SCROLL` (є доповненням до власної смуги),
`AI-PROVIDERS` (немає LLM), `FORM-INPUTS` і `INPUT-TOOLS` (немає форм),
`DEBUGGING`, `OBSERVABILITY` (`errorLogger` покриває потребу).

## Що не перевіряється автоматично

| Правило | Чому перевірки немає | План |
|---|---|---|
| E2E-сценарії | Playwright у проєкті не стоїть | додати після того, як стабілізується розмітка |
| axe-аудит a11y | немає E2E-джоба | разом із Playwright |
| Контраст тем | статично не перевіряється | перенести `contrast.test.ts` із teatralo4ka |
| 44×44 px цілі дотику | статично не перевіряється | код-рев'ю |
| `$props.id()` замість `Math.random()` для `id` | правило є в ACCESSIBILITY § 2.4, звернень нуль у всіх сімох проєктах | окремий прохід |
| Консоль зібраного сайту без `Refused to…` | вимагає живого браузера (SECURITY-v8 § 6.2) | ручна перевірка перед релізом |

## Відомі відхилення від пакету

Кожне — свідоме й записане; мовчазне відхилення від записаного відрізняється
тим, що його ніхто не бачить.

| Відхилення | Правило | Чому поки так |
|---|---|---|
| **Мова живе лише у сховищі** | I18N-v8 § 3.1, SEO-v8 § 2.2–2.3 (обидва HIGH) | `/en/` як адрес не існує: `en.json` перемикається в браузері, `hreflang` немає, у sitemap лише `uk`-адреси. Тобто англійської версії для пошуковика не існує взагалі. Лікується хуком `reroute` і подвоєним prerender (SKD-REROUTE) — це окремий прохід із перевіркою `build/`, а не правка на ходу |
| **`@media` замість `@container` у 12 місцях компонентів** | FLUID-SIZING-v8 § 7A (FS-CONTAINER, HIGH) | `@container` у проєкті нуль звернень. Компоненти міряють вікно, а не наявне місце: у розкладці з двох колонок картка поводиться як на всю ширину |
| **`repeat(N, 1fr)` у 14 сітках без `minmax(0, 1fr)`** | FLUID-SIZING-v8, CRITICAL | довгий рядок без пробілів розпирає колонку: `1fr` означає «не менше вмісту», а не «рівна частка» |
| **Дві `svelte-ignore` без обґрунтування** | ACCESSIBILITY-v8, HIGH | `components/ui/PianoModal.svelte` — клік по тлу модалки |
| **Хардкод українських рядків поза словником** | I18N-v8, HIGH | `/test` (чернетка) і `DebugSettingsDropdown` («Вимк»/«Вкл») |
| **Немає Dependabot** | DEPENDENCIES-v8 (DEP-DEPENDABOT, HIGH) | `.github/dependabot.yml` відсутній; оновлення відстежуються вручну |

Команди, якими це виміряно:

```
grep -rn "@media" src/lib/components --include="*.svelte" | wc -l     # 12
grep -rn "repeat([0-9], *1fr)" src --include="*.svelte" | wc -l       # 14
grep -rn "svelte-ignore" src/ | wc -l                                 # 2
grep -rn "@container" src --include="*.svelte" --include="*.css" | wc -l  # 0
```

## Перевірки, які тут є

| Гейт | Де | Що ловить |
|---|---|---|
| `npm run lint` | CI | eslint, базовий набір за CODE-QUALITY-v8 § 6.4.1 |
| `npm run check` | CI | `svelte-check`, 0 помилок на 4151 файлі |
| `npm test` | CI | **11 файлів, 79 перевірок** (`npx vitest run \| grep "Tests "`) |
| `npm audit --omit=dev --audit-level=high` | CI | вразливості **прод**-залежностей |
| `git diff --exit-code` | CI, після `build` | збірка не бруднить робоче дерево |
| `npm run check:build` | CI, **після** `build` і **до** деплою | canonical, og:image, `<title>`, JSON-LD, robots/sitemap, подвоєна база, позиція й хеш інлайн-скриптів |

Файли інваріантів: `ci`, `css-variables`, `error-logger-reachable`,
`eslint-baseline`, `structure`, `test-runners`, `testid-conventions` у `src/`,
плюс `i18n/translations`, `schemas/news`, `services/errorLogger`,
`services/storage`.

## Борг із числами

Числа мають лише зменшуватися. `off` ховає борг і робить його невимірним;
`warn` із числом лишає його у звіті (CODE-QUALITY-v8 § 6.4.1).

| Правило ESLint | Місць | Стан на |
|---|---|---|
| `svelte/require-each-key` | 22 | 2026-08-16 |
| `@typescript-eslint/no-unused-vars` | 12 | 2026-08-16 |
| `svelte/no-navigation-without-resolve` | 11 | 2026-08-16 |
| `@typescript-eslint/no-explicit-any` | 2 | 2026-08-16 |

Разом 47 попереджень, 0 помилок (`npm run lint 2>&1 | grep "^✖"`).
Більшість припадає на `/test` — чернетку для ручних перевірок.

Перевищення межі розміру (PROJECT-STRUCTURE-v8 § 7) записані числами в
`src/structure.test.ts`: файл зі списку не може вирости, новий у список не
потрапляє.

| Файл | Рядків | Межа |
|---|---|---|
| `src/routes/test/+page.svelte` | 1436 | 400 |
| `src/lib/components/HeaderSection.svelte` | 665 | 300 |
| `src/lib/components/FooterSection.svelte` | 401 | 300 |
| `src/lib/components/ui/PianoModal.svelte` | 339 | 300 |

Два `eslint-disable` у проєкті, обидва з причиною поруч
(`grep -rn "eslint-disable" src/`): `prefer-rest-params` у `analytics.ts`
(gtag.js читає сирий `arguments`) і `svelte/no-at-html-tags` у `+layout.svelte`
(JSON-LD, виняток SECURITY-v8 § 5.3).

## Легасі-зони та списки винятків

| Список | Де живе | Причина |
|---|---|---|
| `handleHttpError: 'warn'` | `svelte.config.js` | чернетка `/test` посилається на `/news/1…6`, яких немає. Поки так, биті посилання на решті сайту теж не зупиняють збірку |
| `ALLOWED_ORPHANS` | `src/structure.test.ts` | один запис: `src/lib/index.ts`, порожня барел-заглушка з шаблону SvelteKit |
| `NOINDEX_ROUTES` | `src/routes/+layout.svelte` | один запис: `/test` |

## Розібрані борги (щоб не переоткривати)

| Що було | Коли | Комітів |
|---|---|---|
| Дві реалізації `ErrorBoundary`, і та, що в layout, показувала на помилці **порожню сторінку** | 2026-08-16 | 1 |
| 19 файлів, яких не імпортував ніхто, зокрема цілий `services/seo.svelte.ts` і `sanitizer.ts` | 2026-08-16 | 2 |
| Інлайн-скрипт вище `%sveltekit.head%` — CSP його не покривала; мертвий блок `page-home`, що кидав `TypeError` у кожному завантаженні | 2026-08-16 | 1 |
| `deploy.yml` без `concurrency`, `npm audit` з devDependencies, немає `git diff --exit-code` | 2026-08-16 | 1 |
| 10 `console.log` у продакшн-коді, зокрема `$effect`, що існував лише заради логу | 2026-08-16 | 1 |
| `/test` оголошував одночасно `index, follow` і `noindex`, а `Disallow` не давав краулеру це прочитати | 2026-08-16 | 1 |
