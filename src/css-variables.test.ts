// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * A reference to a CSS variable that does not exist is the quietest class of
 * defect in the project (UI-UX-v8 § 4). It produces no build error, no
 * `svelte-check` warning and no failing test; the page renders, just
 * differently:
 *
 *  - `var(--x, #fff)` substitutes `#fff` — which looks right in the light theme
 *    and glows white in the dark one. The fallback is not insurance here, it is
 *    the way the mistake stays hidden from whoever made it;
 *  - `var(--x)` with no fallback makes the property INVALID at computed-value
 *    time. Not "a grey border instead of a blue one" but `border: 1px solid`
 *    with no colour, meaning no border at all.
 *
 * Ported from teatralo4ka, where the same check found 13 undeclared variables
 * across 120 references. Here it found NONE — which is why it is worth having.
 *
 * A check added to a clean project does not fix anything today; it fixes the
 * day a component is copied in from a project whose tokens are named
 * differently. That is not hypothetical: the same port into VetCrewGames found
 * five references to CV's token names (`--bg-surface`, `--text-primary`,
 * `--border-color`), each with a fallback, each therefore invisible — a fixed
 * dark grey button in all four themes. This file is what keeps that from
 * arriving here.
 *
 * Reverse experiment (AI-AGENT-PITFALLS-v8 § 1.1): delete `--color-border` from the theme
 * files — the check must go red listing every place that reads it. Done, it
 * fails with 20 files.
 */

const ROOT = resolve(__dirname, "..");

/** Files that carry the GLOBAL declarations: themes and base styles. */
const GLOBAL_STYLE_FILES = [
	"src/lib/styles/global.css",
	"src/lib/styles/themes/light.css",
	"src/lib/styles/themes/dark.css"
];

/**
 * Variables one file declares and another reads, through ordinary CSS
 * inheritance. That is a valid pattern, but it is also what could hide a real
 * slip, so each case is named rather than allowed as a class. A stale entry is
 * caught too: if the declaration disappears, the check fails on the list
 * itself.
 */
const CROSS_COMPONENT: Record<string, { declaredIn: string; why: string }> = {};

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, keep, out);
		else if (keep(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const read = (p: string) => readFileSync(p, "utf8");

/** Declarations of the form `--name:` — in CSS, in a component `<style>`, in an inline `style`. */
function declarations(source: string): Set<string> {
	return new Set([...source.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

/**
 * Variables a script sets: `style.setProperty('--x', …)`. There is no CSS
 * declaration for those and cannot be — the value appears at runtime, and until
 * then the fallback in `var()` is what applies.
 */
function runtimeDeclarations(source: string): Set<string> {
	return new Set([...source.matchAll(/setProperty\(\s*[`'"](--[\w-]+)/g)].map((m) => m[1]));
}

describe("CSS variables", () => {
	const srcDir = join(ROOT, "src");
	const sources = walk(srcDir, (n) => n.endsWith(".svelte") || n.endsWith(".ts") || n.endsWith(".html"));
	const globalCss = GLOBAL_STYLE_FILES.map((f) => read(join(ROOT, f)));

	const declaredGlobally = new Set<string>();
	for (const css of globalCss) for (const name of declarations(css)) declaredGlobally.add(name);

	const declaredAtRuntime = new Set<string>();
	for (const file of sources) {
		for (const name of runtimeDeclarations(read(file))) declaredAtRuntime.add(name);
	}

	const references = sources.flatMap((file) =>
		[...read(file).matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => ({ file, name: m[1] }))
	);

	it("finds sources, declarations and references — the check is alive", () => {
		expect(sources.length).toBeGreaterThan(50);
		expect(globalCss.length).toBe(GLOBAL_STYLE_FILES.length);
		expect(declaredGlobally.size).toBeGreaterThan(50);
		expect(references.length).toBeGreaterThan(200);
	});

	it("every cross-component variable is in fact declared somewhere", () => {
		const stale: string[] = [];
		for (const [name, { declaredIn }] of Object.entries(CROSS_COMPONENT)) {
			if (!declarations(read(join(ROOT, declaredIn))).has(name)) {
				stale.push(`${name}: no declaration in ${declaredIn} — the exemption is out of date`);
			}
		}
		expect(stale, stale.join("\n")).toEqual([]);
	});

	it("no references to undeclared CSS variables", () => {
		const own = new Map(sources.map((f) => [f, declarations(read(f))] as const));

		const problems = new Map<string, Set<string>>();
		for (const { file, name } of references) {
			if (declaredGlobally.has(name)) continue;
			if (declaredAtRuntime.has(name)) continue;
			if (own.get(file)!.has(name)) continue;
			if (name in CROSS_COMPONENT) continue;

			if (!problems.has(name)) problems.set(name, new Set());
			problems.get(name)!.add(file.replace(`${ROOT.replace(/\\/g, "/")}/`, ""));
		}

		const report = [...problems.entries()]
			.map(([name, files]) => `${name} — ${[...files].join(", ")}`)
			.join("\n");

		expect(
			[...problems.keys()],
			`undeclared variables (the fallback applies, or the property becomes invalid):\n${report}`
		).toEqual([]);
	});
});

/**
 * `light-dark()` with a NON-COLOUR argument (UI-UX-v8 § 1.5.1.3,
 * `UIUX-LIGHT-DARK-COLOR-ONLY`).
 *
 * Same consequence as the check above — the property disappears entirely — but
 * a different cause, which is why that check could not see it: the variable IS
 * declared, its value is simply invalid where it gets used.
 *
 * `light-dark()` is a COLOUR function: `light-dark(<color>, <color>)`. A length,
 * a `url()` or a whole shadow with offsets is not a colour, so the value is
 * invalid at computed-value time and the property falls back to its initial
 * value. Measured in Chrome 148:
 *
 *     box-shadow: light-dark(0 1px 3px #0002, 0 1px 3px #0006)  → none
 *     background-image: light-dark(url(a.webp), url(b.webp))    → none
 *     box-shadow: 0 1px 3px light-dark(#0002, #0006)            → works
 *
 * THE PRICE HERE HAS ALREADY BEEN PAID. Commit 621dc3b moved all 32 paired
 * tokens onto `light-dark()`, and seven of them were not colours: the five
 * `--shadow-*` and the two `--shadow-btn-primary*`, plus
 * `--theme-image-shadow`. Measured on as5.odesa.ua on 26.08 — 0 of the 6 rules
 * that ask for a shadow had one, so the header, both dropdowns, the debug panel
 * and the hero were flat in BOTH themes. Before the migration those tokens
 * carried literal shadows in two theme blocks, and both worked.
 *
 * Nothing said a word: a custom-property declaration accepts any token stream,
 * so the build, `svelte-check` and the browser console are all silent.
 *
 * AND THE CONTRAST GATE CONFIRMED IT. `vitest/support/tokens.ts` unwrapped
 * `light-dark()` with any content and then asked `parseColor()`; on a shadow
 * that returns `null`, and the token was skipped as "not a colour, not our
 * business". So the resolver treated the call as valid exactly where the
 * browser throws the property away — 7 dead tokens with 207 tests green. That
 * resolver now throws on a non-colour argument instead of skipping it.
 *
 * Vite 8 would have hidden this: it hands CSS to Lightning CSS, which lowers
 * `light-dark()` into a pair of `--lightningcss-light` / `--lightningcss-dark`
 * substitutions, for any value type. This project is on Vite 7 (esbuild), which
 * lowers nothing. That difference is why the check belongs in the source and not
 * only in a `grep` over `build/`: on Vite 8 the code works because of the
 * bundler, not because of the decision. Those two names are written WITHOUT the
 * `var(` prefix on purpose — the check above scans `.ts` files too and does not
 * strip comments, so spelling them out as a reference would make this
 * documentation fail that gate.
 *
 * Reverse experiment (AI-AGENT-PITFALLS-v8 § 1.1): put
 * `--shadow-sm: light-dark(4px, 8px)` into `themes/light.css` — the check must
 * name that call and that file. Done, it fails.
 */

/** Functions that yield a COLOUR. `url()` is absent, and that is the whole point. */
const COLOUR_FUNCTIONS = new Set([
	"rgb",
	"rgba",
	"hsl",
	"hsla",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
	"color",
	"color-mix",
	"light-dark",
	// `var()` passes straight through: what is inside it is the check above's job.
	"var"
]);

/**
 * Text with comments removed.
 *
 * Required: the theme files describe the `light-dark()` mechanism in prose, and
 * now also record why the shadow tokens keep the function in the colour slot.
 * Without this step the gate would catch its own documentation.
 */
function stripComments(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/** The arguments of every `light-dark(...)`, respecting nested parentheses. */
function lightDarkCalls(text: string): { args: string[]; raw: string }[] {
	const calls: { args: string[]; raw: string }[] = [];
	const needle = "light-dark(";

	for (let start = text.indexOf(needle); start !== -1; start = text.indexOf(needle, start + 1)) {
		let depth = 0;
		let end = -1;
		for (let i = start + needle.length - 1; i < text.length; i++) {
			if (text[i] === "(") depth++;
			else if (text[i] === ")" && --depth === 0) {
				end = i;
				break;
			}
		}
		// Unbalanced parentheses are not this check's business — the build says so.
		if (end === -1) continue;

		const args: string[] = [];
		let level = 0;
		let current = "";
		for (const ch of text.slice(start + needle.length, end)) {
			if (ch === "(") level++;
			else if (ch === ")") level--;
			if (ch === "," && level === 0) {
				args.push(current.trim());
				current = "";
				continue;
			}
			current += ch;
		}
		args.push(current.trim());
		calls.push({ args, raw: text.slice(start, end + 1) });
	}
	return calls;
}

function isColour(arg: string): boolean {
	if (arg === "") return false;
	if (/^#[0-9a-fA-F]{3,8}$/.test(arg)) return true;
	// A named colour, `transparent`, `currentColor` — letters only, no units.
	if (/^[a-zA-Z]+$/.test(arg)) return true;

	const open = arg.indexOf("(");
	if (open === -1) return false;
	const name = arg.slice(0, open).trim();
	if (!/^[a-zA-Z-]+$/.test(name) || !COLOUR_FUNCTIONS.has(name.toLowerCase())) return false;

	/*
	 * The function's parenthesis must close at the very END of the argument.
	 *
	 * Without that condition `0 1px 3px rgba(0, 0, 0, 0.2)` would be rejected
	 * correctly, but `rgba(0, 0, 0, 0.2) 0 1px 3px` would PASS: a greedy parse
	 * takes the first function name and decides the argument is a colour. The
	 * check would then be silent on the very defect it stands against, depending
	 * on the word order inside the value.
	 */
	let depth = 0;
	for (let i = open; i < arg.length; i++) {
		if (arg[i] === "(") depth++;
		else if (arg[i] === ")" && --depth === 0) return i === arg.length - 1;
	}
	return false;
}

describe("light-dark() takes colours only (UI-UX-v8 § 1.5.1.3)", () => {
	const styleFiles = walk(
		resolve(ROOT, "src"),
		(n) => n.endsWith(".css") || n.endsWith(".svelte") || n.endsWith(".html")
	);
	const calls = styleFiles.flatMap((file) =>
		lightDarkCalls(stripComments(readFileSync(file, "utf8"))).map((call) => ({
			file: file.replace(`${ROOT.replace(/\\/g, "/")}/`, ""),
			...call
		}))
	);

	it("the check is alive: light-dark() calls were found", () => {
		expect(
			calls.length,
			"no light-dark() in the styles at all — either the scanner is looking in " +
				"the wrong place, or the palette was rewritten, in which case this gate " +
				"should be removed rather than repaired"
		).toBeGreaterThan(25);
	});

	it("the argument parser is alive: a colour is told apart from a length and a url()", () => {
		// Without this the check below would be green on an always-true isColour.
		expect(isColour("#36c7f3")).toBe(true);
		expect(isColour("rgba(27, 94, 123, 0.08)")).toBe(true);
		// A real token on purpose: the check above scans `.ts` too, so an invented
		// name here would (correctly) fail it. It already did once.
		expect(isColour("var(--theme-seagull-color)")).toBe(true);
		expect(isColour("transparent")).toBe(true);
		expect(isColour("12px"), "a length is not a colour").toBe(false);
		expect(isColour('url("/images/a.webp")'), "url() is not a colour").toBe(false);
		expect(isColour("0 1px 3px rgba(27, 94, 123, 0.08)"), "a whole shadow is not a colour").toBe(
			false
		);
		expect(
			isColour("rgba(27, 94, 123, 0.08) 0 1px 3px"),
			"colour plus offsets is not a colour"
		).toBe(false);
	});

	it("both arguments of every call are colours", () => {
		const broken = calls
			.filter((call) => call.args.length !== 2 || !call.args.every(isColour))
			.map((call) => `${call.file}: ${call.raw}`)
			.sort();

		expect(
			broken,
			"a non-colour argument makes the value invalid and the property vanishes " +
				`ENTIRELY — silently, with no warning anywhere:\n  ${broken.join("\n  ")}`
		).toEqual([]);
	});
});
