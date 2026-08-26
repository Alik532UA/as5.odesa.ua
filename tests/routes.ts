import { readdirSync } from 'node:fs';

/**
 * Маршрути, які віддають HTML — виведені з файлової системи, а не вписані.
 *
 * Спільні для всіх E2E-гейтів: axe і дублікати `data-testid` мусять дивитися на
 * ОДИН перелік сторінок. Два власні переліки розходяться на першій же новій
 * сторінці, і розходження виглядає як «там перевірено» рівно доти, доки хтось
 * не звірить обидва руками.
 *
 * Вписаний рядком перелік застаріває мовчки й саме тоді, коли зʼявляється
 * сторінка, якої ще ніхто не дивився. Звідси вивід із `src/routes` і окрема
 * перевірка на динамічний сегмент: перебір його не розгортає, тож поява
 * першого мусить БУТИ помітною, а не тихо звузити покриття.
 */

const ROUTES_DIR = 'src/routes';

function routeDirs(): string[] {
	return readdirSync(ROUTES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

/** `/`, `/about`, … Ендпоїнти (`sitemap.xml`) відкидаються за крапкою в імені. */
export function htmlRoutes(): string[] {
	return ['/', ...routeDirs().filter((name) => !name.includes('.')).map((name) => `/${name}`)];
}

/** Маршрути з параметром: перебір їх не розгортає. */
export function dynamicRoutes(): string[] {
	return routeDirs().filter((name) => name.includes('['));
}

/**
 * Скільки сторінок у проєкті на 2026-08-27.
 *
 * Число, а не `toBeGreaterThan(0)`: зникнення маршруту з перебору мусить бути
 * видно так само, як поява. Гейт, який мовчки почав міряти менше, читається як
 * гейт, що міряє все.
 */
export const EXPECTED_ROUTE_COUNT = 7;
