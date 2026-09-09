/**
 * Перелік адрес для Lighthouse — ГЕНЕРУЄТЬСЯ з маршрутів
 * (OBSERVABILITY-v9 § 2.2.1, `OBS-LHCI-REAL-PAGES`).
 *
 * Доти в `lighthouserc.cjs` стояла одна вписана рядком адреса — `index.html`.
 * Тобто шість сторінок із семи не міряв ніхто, і нова сторінка не потрапляла
 * в замір ніколи: перелік, який тримають руками, застаріває мовчки й саме
 * тоді, коли зʼявляється те, чого ще ніхто не дивився.
 *
 * ## Чому службові сторінки виключені, і чому це не підгонка
 *
 * `/test` і `/beta-test-checklists` несуть `noindex` СВІДОМО (SEO-v9 § 4.3,
 * BETA-CHECKLIST-v9 § 4.1) — і категорія SEO у Lighthouse за це штрафує:
 * заміряно 2026-09-10, обидві дають 66 при порозі 90 на рівні `error`.
 * Тобто ввімкнути їх у замір означало б зробити гейт червоним ВІД НАРОДЖЕННЯ
 * і заблокувати деплой за те, що зроблено навмисно й записано в
 * `PROJECT-CONTEXT.md`. Клас відомий: AI-AGENT-PITFALLS-v9 § 1.4 — крок, який
 * жодного разу не був зеленим, у звіті не відрізняється від справного.
 *
 * Перелік службових читається з `src/lib/config/site.ts`, а не дублюється
 * тут: два списки, які тримають узгодженими руками, розходяться на першій же
 * новій сторінці. Той самий `HIDDEN_ROUTES` уже читає `check-build.mjs`.
 *
 * Отже Lighthouse міряє рівно те, за що відповідає: сторінки, які МАЮТЬ
 * індексуватися. Це той самий набір, що йде в `sitemap.xml`.
 *
 * Узгодженість цього переліку з файловою системою стереже
 * `src/lighthouse-urls.test.ts` — інакше «згенеровано» означало б лише
 * «згенеровано колись».
 */
const { readFileSync, readdirSync } = require("node:fs");

const ROUTES_DIR = "src/routes";
const SITE_CONFIG = "src/lib/config/site.ts";

/**
 * Службові маршрути з єдиного джерела істини.
 *
 * Регулярка навмисно строга: не знайшлося — кидаємо, а не беремо порожній
 * список. Порожній означав би «службових немає», тобто мовчки повернув би
 * `/test` у замір і зробив гейт червоним без жодного пояснення.
 */
function hiddenRoutes() {
  const source = readFileSync(SITE_CONFIG, "utf8");
  const match = /export const HIDDEN_ROUTES[^=]*=\s*\[([^\]]*)\]/.exec(source);
  if (!match) {
    throw new Error(
      `lhci-urls: у ${SITE_CONFIG} не знайдено HIDDEN_ROUTES — перелік адрес зупинено, ` +
        "бо без нього Lighthouse міряв би службові сторінки й падав на їхньому noindex",
    );
  }
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** `/`, `/about`, … Ендпоїнти (`sitemap.xml`) відкидаються за крапкою в імені. */
function htmlRoutes() {
  const dirs = readdirSync(ROUTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.includes(".") && !name.includes("["));
  return ["/", ...dirs.map((name) => `/${name}`)];
}

/** Маршрути, які Lighthouse має міряти: усі, крім службових. */
function indexedRoutes() {
  const hidden = new Set(hiddenRoutes());
  return htmlRoutes().filter((route) => !hidden.has(route));
}

/**
 * Адреси для `collect.url`.
 *
 * Хост фіктивний: LHCI піднімає власний сервер на випадковому порті й
 * підставляє його origin, беручи звідси лише шлях. `.html`, а не голий шлях:
 * `staticDistDir` віддає файли з диска, і директорних індексів у нього немає.
 */
function lighthouseUrls(origin = "http://localhost") {
  return indexedRoutes().map(
    (route) => `${origin}/${route === "/" ? "index" : route.slice(1)}.html`,
  );
}

module.exports = { hiddenRoutes, htmlRoutes, indexedRoutes, lighthouseUrls };
