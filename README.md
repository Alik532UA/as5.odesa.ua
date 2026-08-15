# as5.odesa.ua

Офіційний вебсайт **Мистецької школи №5 м. Одеси**.

🌐 [as5.odesa.ua](https://as5.odesa.ua/)

Дві мови (`uk` типова, `en`), шість маршрутів, повністю prerendered — серверного рантайму немає.

## Швидкий старт

```bash
npm ci
```

```bash
npm run dev
```

Порт dev-сервера — **5193** (конфігурація `as5-dev` у `.claude/launch.json` кореневої теки `GitHub`). Порт свій у кожного проєкту навмисно: на типовому `5173` сидить будь-який інший сусід, і тести почали б перевіряти чужий сайт.

## Команди

| Команда | Що робить |
|---|---|
| `npm run dev` | dev-сервер |
| `npm run check` | `svelte-check` — має бути 0 помилок |
| `npm run lint` | ESLint — має бути 0 помилок |
| `npm test` | юніт-інваріанти (Vitest) |
| `npm run build` | збірка в `build/` |
| `npm run check:build` | гейт над `build/`: canonical, `og:image`, подвоєна база, sitemap |
| `npm run preview` | перегляд зібраного сайту |
| `npm run bump` | підняття версії |

**Playwright тут не стоїть.** Не створюй файлів під нього — вони не запустяться й ніхто про це не повідомить.

## Як усе влаштоване

- **Стек:** SvelteKit 2 + Svelte 5 (виключно руни), `@sveltejs/adapter-static`.
- **Стан:** класи-контролери в `.svelte.ts`. Панівна форма — module-level синглтон; `$effect` у його конструкторі кидає `effect_orphan`.
- **Сховище:** фасад `src/lib/services/storage.ts`, префікс `as5.odesa.ua_`. Прямий доступ до `localStorage` заборонений скрізь, окрім інлайн-скрипта першого кадру в `app.html`.
- **i18n:** `svelte-i18n`, словники — JSON у `src/lib/i18n/locales/`. Паритет ключів тримає інваріант `translations.test.ts`, бо тип їх не звіряє.
- **Публічна адреса:** єдине джерело — `src/lib/config/site.ts`. Ніде більше origin не збирається вручну.

## Перевірки

Частину дефектів цього проєкту видно **лише** у зібраному виводі — саме тому `check:build` існує окремо від `check`. Канонічне посилання, `og:image` і подвоєна база не виявляються ні типами, ні лінтером.

Результат треба **побачити**, а не припустити: твердження «правило виконано» робиться після прогону, а не замість нього.

## Деплой і адреси

GitHub Pages з гілки `main` через `.github/workflows/deploy.yml` (офіційний конвеєр `configure-pages` → `upload-pages-artifact` → `deploy-pages`).

| Адреса | Роль |
|---|---|
| **`https://as5.odesa.ua/`** | **основна** — куплений домен, налаштований у Pages репозиторію |
| `https://alik532ua.github.io/as5.odesa.ua/` | запасна, лишається робочою |

Canonical, `og:url`, `sitemap.xml` і `robots.txt` ведуть на основну; запасна в індексі не згадується, щоб пошуковик не тримав два дублі.

Через власний домен `paths.base` тут **порожня**, а не `/as5.odesa.ua`. Файл `static/CNAME` не потрібен: `actions/deploy-pages` зберігає прив'язку домену з налаштувань Pages.

## Стандарти

Загальні правила — у пакеті [`sveltekit-canon/selection_criteria/v8`](../sveltekit-canon/selection_criteria/v8/README.md).
Специфіка цього проєкту — в [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md).
Інструкції для AI-асистентів — в [AGENTS.md](AGENTS.md).
