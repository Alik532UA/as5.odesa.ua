import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Локатори так, як їх бачить БРАУЗЕР, а не так, як вони написані в джерелі.
 *
 * Різниця істотна: у розмітці лежить `data-testid="nav-{item.key}-link"`, а в
 * DOM опиняється `nav-about-link`. Пункт чеклиста називає друге. Тому шаблон із
 * динамічною частиною тут перетворюється на зірочку (`nav-*-link`), і збіг
 * шукається за нею — інакше перевірка § 5.3 бракувала б правильні назви й
 * змушувала б автора вигадувати неіснуючі.
 *
 * Зірочка НЕ означає «будь-що»: `*` замінює рівно одну динамічну вставку, і
 * `nav-*-link` не збігається з `beta-tab-common-btn`. Без цього обмеження
 * перевірка приймала б вигадані локатори.
 */
export function collectTestIds(dir = 'src'): string[] {
	const ids = new Set<string>();
	for (const file of svelteFiles(dir)) {
		const markup = readFileSync(file, 'utf8')
			// `<style>` містить testid у селекторах `:global([data-testid=…])`,
			// коментарі — старі назви. Ні те, ні те в DOM не потрапляє.
			.replace(/<style[\s\S]*?<\/style>/g, '')
			.replace(/<!--[\s\S]*?-->/g, '');
		for (const m of markup.matchAll(/data-testid=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) {
			ids.add((m[1] ?? m[2] ?? m[3]).replace(/\$?\{[^}]*\}/g, '*'));
		}
	}
	return [...ids];
}

/** Чи є в розмітці локатор, який дає таку назву в DOM. */
export function testIdExists(wanted: string, known: string[]): boolean {
	return known.some((id) => {
		if (id === wanted) return true;
		if (!id.includes('*')) return false;
		// Зірочка — рівно одна вставка: без дефісів і без порожнього значення.
		const re = new RegExp(`^${id.split('*').map(escapeRe).join('[^-]+')}$`);
		return re.test(wanted);
	});
}

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function svelteFiles(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (['node_modules', '.svelte-kit', 'build'].includes(entry)) continue;
			svelteFiles(full, out);
		} else if (entry.endsWith('.svelte')) out.push(full);
	}
	return out;
}
