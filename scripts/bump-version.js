/**
 * Підняти patch-версію проєкту (VERSIONING-v8 § 3).
 *
 * Єдине місце, де змінюється номер: `package.json`. Далі його підставляє Vite
 * у `__APP_VERSION__` (vite.config.ts), а звідти він потрапляє в кожен запис
 * `errorLogger`. Тому ручне редагування номера в package.json чи, тим паче,
 * другий номер у коді — привід для code review, а не робочий процес.
 *
 * `buildTime` тут свідомо НЕ пишеться у файл під версійним контролем: інакше
 * робоче дерево стає брудним після кожної локальної збірки, і в історії
 * з'являються коміти, які нічого не змінюють, крім хвилини.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const [major, minor, patch] = pkg.version.split('.');
if (patch === undefined) {
	console.error(`Версія «${pkg.version}» не схожа на major.minor.patch — правити вручну.`);
	process.exit(1);
}

const next = `${major}.${minor}.${Number(patch) + 1}`;
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');

console.log(`Версія: ${major}.${minor}.${patch} -> ${next}`);
