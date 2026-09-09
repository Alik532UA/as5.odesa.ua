/**
 * Кожен файл перевірки СПРАВДІ зібраний своїм раннером
 * (AI-AGENT-PITFALLS-v9 § 1.3.1, `PIT-TEST-DISCOVERY-PROCESS`).
 *
 * ## Чому окремим процесом, а не тестом
 *
 * Інваріант `src/test-runners.test.ts` лежить під тією самою маскою
 * `include`, чию роботу перевіряє: `src/**` + `.test.ts` у `vitest.config.ts`.
 * Звужена маска вимикає **і його самого** — і звіт про якість втрачає одразу
 * дві речі: тести, що випали, і перевірку, яка мала це побачити. Гейт, що не
 * може впасти, від зеленого не відрізняється.
 *
 * Друга, тихіша половина того самого класу: той інваріант розбирає джерела
 * СТАТИЧНО — «файл імпортує vitest, vitest у залежностях є, конфіг у корені
 * є». Про маску `include` він не знає нічого. Файл `tests/foo.test.ts`
 * пройшов би його повністю і не запускався б ніде: `testDir` Playwright — це
 * `tests/`, але файл не імпортує Playwright, а `include` vitest — це `src/`.
 *
 * Тому тут ПИТАЄМО раннера, що він зібрав, замість того щоб виводити це з
 * конфігу: `vitest list --json` і `playwright test --list --reporter=json`.
 * Розбіжність переліку на диску з переліком раннера — червона.
 *
 * ## Канарка
 *
 * Нуль зібраних тестів — це «розбір зламався», а не «порушень немає»
 * (§ 1.3.1). Тому крім переліків звіряються ще й числа: менше за записаний
 * мінімум — червоне. Мінімум лише зростає, і зростає руками — так само, як
 * решта ратчетів проєкту (`SIZE_DEBT` у `src/structure.test.ts`).
 *
 * ## Зворотний експеримент (§ 1.1)
 *
 * Прогнано перед комітом:
 *  - звузити `include` у `vitest.config.ts` до `src/lib/**` — скрипт
 *    перелічує файли `src/*.test.ts`, яких раннер більше не бере, і падає на
 *    канарці числа; сам скрипт при цьому працює, бо він не тест;
 *  - створити `tests/probe.test.ts` з одним тестом vitest — червоне: на диску
 *    є, жоден раннер не зібрав (Playwright його не бачить, бо файл не імпортує
 *    Playwright; vitest — бо `tests/` поза `include`).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Каталоги, у яких взагалі можуть лежати файли перевірок. */
const SEARCH_DIRS = ["src", "tests", "e2e"];

/**
 * Мінімум зібраних тестів на раннера — канарка проти мовчазного нуля.
 *
 * Числа заміряні 2026-09-10 цим самим скриптом і записані з запасом на
 * видалення одного файлу: перевірка стоїть проти обвалу покриття, а не проти
 * рефакторингу. Скрипт друкує обидва числа щоразу, тож підняти межу після
 * додавання тестів можна не вгадуючи.
 */
const MIN_TESTS = { vitest: 250, playwright: 60 };

const problems = [];
const fail = (msg) => problems.push(msg);

/** Шлях у формі, порівнюваній на будь-якій ОС: відносний, зі скісними рисками. */
const ROOT = process.cwd().split("\\").join("/");
function rel(absolute) {
  const posix = absolute.split("\\").join("/");
  return posix.startsWith(`${ROOT}/`) ? posix.slice(ROOT.length + 1) : posix;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    // `.setup.ts` — теж файл, який виконує раннер: сетап-проєкт Playwright
    // (`identity.setup.ts`) блокує весь прогін, тож випасти з нього він може
    // так само тихо, як звичайна специфікація, і наслідок буде більшим.
    else if (/\.(test|spec|setup)\.(ts|js|mjs)$/.test(entry)) out.push(rel(full));
  }
  return out;
}

/**
 * Запуск раннера в режимі переліку.
 *
 * CLI раннера викликається як звичайний модуль через `process.execPath`, а не
 * через `npx` під оболонкою. Причини дві: `shell: true` з масивом аргументів
 * лише склеює їх без екранування (Node 25 попереджає про це `DEP0190`), а
 * `npx` на Windows — це `.cmd`, тобто ще один рівень розбору рядка між
 * скриптом і раннером. Тут між ними немає нічого.
 *
 * Провал самої команди — теж червоне, і саме тому виняток не глушиться: раннер,
 * який упав на розборі конфігу, не збирає нічого, і без цієї гілки скрипт
 * прочитав би порожній перелік як «файлів немає».
 */
function listJson(label, cli, args) {
  if (!existsSync(cli)) {
    fail(`${label}: CLI не знайдено за шляхом ${cli} — раннера в проєкті немає`);
    return null;
  }
  let raw;
  let crashed = false;
  try {
    raw = execFileSync(process.execPath, [cli, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    // Ненульовий код — ще не «нічого немає»: Playwright друкує звіт навіть
    // тоді, коли частину файлів не зміг завантажити, і причина лежить у
    // полі `errors` того самого JSON. Тому вивід розбирається далі, а не
    // відкидається — інакше найчастіший випадок (файл у `testDir`, який
    // раннер не вміє прочитати) читався б як «конфіг зламався».
    crashed = true;
    raw = `${e.stdout ?? ""}` || `${e.stderr ?? ""}`;
    if (!raw.trim()) {
      fail(`${label}: команда переліку впала мовчки — ${String(e.message).split("\n")[0]}`);
      return null;
    }
  }
  // Раннери іноді друкують попередження перед JSON: беремо від першої дужки.
  const start = raw.search(/[[{]/);
  if (start < 0) {
    fail(`${label}: у виводі переліку немає JSON — перевіряти нічим`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start));
  } catch (e) {
    fail(`${label}: вивід переліку не розбирається як JSON — ${e.message}`);
    return null;
  }
  if (crashed) {
    const reported = (Array.isArray(parsed?.errors) ? parsed.errors : [])
      .map((err) => String(err?.message ?? err).split("\n")[0].trim())
      .filter(Boolean);
    fail(
      `${label}: перелік зібрано з помилками — ${reported.join(" | ") || "код виходу ≠ 0, причини у звіті немає"}`,
    );
  }
  return parsed;
}

// --- vitest ---------------------------------------------------------------
// `[{ name, file }]` — по рядку на тест, тобто файли повторюються.
const vitestFiles = new Set();
let vitestTests = 0;
const vitestList = listJson("vitest", "node_modules/vitest/vitest.mjs", ["list", "--json"]);
if (Array.isArray(vitestList)) {
  vitestTests = vitestList.length;
  for (const entry of vitestList) if (entry?.file) vitestFiles.add(rel(entry.file));
} else if (vitestList) {
  fail("vitest: перелік не масив — формат `vitest list --json` змінився");
}

// --- playwright -----------------------------------------------------------
// `{ suites: [{ file, specs, suites }] }` — вкладеність від `test.describe`;
// `file` у кожному вузлі відносний до `rootDir`, тобто до `testDir` конфігу.
const playwrightFiles = new Set();
let playwrightTests = 0;
const playwrightList = listJson("playwright", "node_modules/@playwright/test/cli.js", [
  "test",
  "--list",
  "--reporter=json",
]);
if (playwrightList) {
  const testDir = String(playwrightList.config?.rootDir ?? "tests");
  const visit = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        playwrightTests += spec.tests?.length || 1;
        if (suite.file) playwrightFiles.add(rel(join(testDir, suite.file)));
      }
      visit(suite.suites);
    }
  };
  visit(playwrightList.suites);
  if (playwrightFiles.size === 0)
    fail("playwright: перелік порожній — або конфіг не знайдено, або розбір зламався");
}

// --- звірка ---------------------------------------------------------------
const onDisk = SEARCH_DIRS.flatMap((dir) => walk(dir));

if (onDisk.length === 0) {
  console.error(
    "check-test-discovery: на диску не знайдено жодного файлу перевірки — сканер шукає не там",
  );
  process.exit(1);
}

for (const file of onDisk) {
  const inVitest = vitestFiles.has(file);
  const inPlaywright = playwrightFiles.has(file);
  if (!inVitest && !inPlaywright) {
    fail(`${file}: на диску є, ЖОДЕН раннер його не зібрав — перевірка не виконується ніде`);
  } else if (inVitest && inPlaywright) {
    fail(`${file}: зібрали обидва раннери — файл виконується двічі й у різних середовищах`);
  }
}

/** Зібране, чого на диску немає: перелік раннера застарів або шлях розійшовся. */
for (const [label, collected] of [
  ["vitest", vitestFiles],
  ["playwright", playwrightFiles],
]) {
  for (const file of collected) {
    if (!onDisk.includes(file))
      fail(
        `${label} зібрав «${file}», якого немає в переліку з диска — ` +
          "шляхи розійшлися, звірка неповна",
      );
  }
}

for (const [label, count] of [
  ["vitest", vitestTests],
  ["playwright", playwrightTests],
]) {
  const min = MIN_TESTS[label];
  if (count < min)
    fail(
      `${label}: зібрано ${count} тестів, записаний мінімум ${min} — ` +
        "покриття обвалилося або раннер перестав знаходити файли",
    );
}

console.log(
  `Виявлення перевірок: ${onDisk.length} файлів на диску; ` +
    `vitest ${vitestFiles.size} файлів / ${vitestTests} тестів (мін. ${MIN_TESTS.vitest}), ` +
    `playwright ${playwrightFiles.size} / ${playwrightTests} (мін. ${MIN_TESTS.playwright}).`,
);

if (problems.length > 0) {
  console.error(`\nВиявлення перевірок не пройдено — ${problems.length} проблем:\n`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
