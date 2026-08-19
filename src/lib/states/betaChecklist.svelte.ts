import { SvelteMap } from 'svelte/reactivity';
import { storage } from '$lib/services/storage';
import { BETA_CHECKS, BETA_TABS, type BetaCheck, type BetaTabId, type Mark, type Vote } from '$lib/config/beta';

/** Один ключ на весь чеклист: позначок десятки, а фасад додає префікс проєкту. */
const STORAGE_KEY = 'betaChecklist';

/** Версія збірки. Її підставляє Vite з `package.json` — не хардкод. */
const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';

/**
 * Стан чеклиста бета-тестування (BETA-CHECKLIST-v8 § 3, § 6).
 *
 * ## Чому в сховищі браузера, а не на сервері
 *
 * Збирати відповіді на сервер означає таблицю, правила доступу до неї й чужі
 * імена в ній — заради даних, яких поки ніхто не читає. До того ж профіль тут
 * `static`: серверного рантайму немає взагалі. Рішення дешево скасувати:
 * агрегація доклеюється пізніше, не переписуючи сторінку.
 *
 * ## Чому позначка несе версію
 *
 * Галочка «працює», поставлена сорок комітів тому, виглядає точно так само, як
 * сьогоднішня. Без версії список поступово стає звітом про минуле, який читають
 * як звіт про теперішнє. Стара позначка не зникає — вона все ще щось означає, —
 * але підписується й НЕ рахується в поступі.
 */
class BetaChecklistState {
	/** `SvelteMap`, а не `$state(new Map())`: `$state` проксює лише звичайні обʼєкти й масиви. */
	private readonly marks = new SvelteMap<string, Mark>();

	activeTab = $state<BetaTabId>(BETA_TABS[0].id);

	/** Текст звіту, показаний у полі, коли буфер обміну відмовив. */
	reportFallback = $state('');

	constructor() {
		for (const [id, mark] of Object.entries(this.read())) {
			if (BETA_CHECKS.some((c) => c.id === id)) this.marks.set(id, mark);
		}
	}

	/**
	 * Читає збережене, не кидаючи. Пошкоджений JSON у сховищі — не привід
	 * покласти сторінку: гірше за втрачені позначки лише втрачена сторінка.
	 */
	private read(): Record<string, Mark> {
		const raw = storage.get(STORAGE_KEY);
		if (!raw) return {};
		try {
			const parsed: unknown = JSON.parse(raw);
			return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Mark>) : {};
		} catch (e) {
			console.warn('[beta] збережені позначки не читаються — починаємо з чистого', e);
			return {};
		}
	}

	private persist() {
		storage.set(STORAGE_KEY, JSON.stringify(Object.fromEntries(this.marks)));
	}

	markOf(id: string): Mark | undefined {
		return this.marks.get(id);
	}

	/** Позначка з іншої версії збірки: показується, але не рахується. */
	isStale(id: string): boolean {
		const mark = this.marks.get(id);
		return mark !== undefined && mark.version !== VERSION;
	}

	/** Повторне натискання того самого стану знімає позначку. */
	vote(id: string, vote: Vote) {
		const current = this.marks.get(id);
		if (current?.vote === vote && current.version === VERSION) this.marks.delete(id);
		else this.marks.set(id, { vote, version: VERSION });
		this.persist();
	}

	clear() {
		this.marks.clear();
		this.persist();
		this.reportFallback = '';
	}

	/** Скільки пунктів позначено САМЕ на цій версії збірки. */
	readonly progress = $derived.by(() => {
		const done = BETA_CHECKS.filter((c) => this.marks.get(c.id)?.version === VERSION).length;
		return { done, total: BETA_CHECKS.length };
	});

	private line(check: BetaCheck): string {
		const mark = this.marks.get(check.id);
		const label = { fail: 'НЕ ПРАЦЮЄ', weird: 'ПРАЦЮЄ, АЛЕ ДИВНО', ok: 'ПРАЦЮЄ' }[mark!.vote];
		const tab = BETA_TABS.find((t) => t.id === check.tab)?.title.uk ?? check.tab;
		const stale = mark!.version === VERSION ? '' : `  (позначено на версії ${mark!.version})`;

		let line = `[${label}] ${check.id} (${tab})${stale}\n    ${check.text.uk}`;
		// Помилка в покритому місці — звіт про дефект ТЕСТА, а не сайту, і вона
		// знецінює всі зелені прогони. У звіті вона мусить бути видна окремо.
		if (mark!.vote === 'fail' && check.coverage === 'covered') {
			line += `\n    !!! ПУНКТ ПОКРИТО АВТОТЕСТОМ ${check.test} —\n        тест не побачив цієї помилки`;
		}
		return line;
	}

	/**
	 * Звіт: лише позначені пункти, поламане вгорі. Перелік недивленого зробив би
	 * звіт нечитним рівно тоді, коли його читають.
	 */
	buildReport(): string {
		const order: Record<Vote, number> = { fail: 0, weird: 1, ok: 2 };
		const marked = BETA_CHECKS.filter((c) => this.marks.has(c.id)).sort(
			(a, b) => order[this.marks.get(a.id)!.vote] - order[this.marks.get(b.id)!.vote]
		);

		const head = [
			`ВЕРСІЯ: ${VERSION}`,
			`ЧАС: ${new Date().toISOString()}`,
			`БРАУЗЕР: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'невідомо'}`,
			`МОВА: ${typeof document !== 'undefined' ? document.documentElement.lang : 'невідомо'}`,
			`ТЕМА: ${typeof document !== 'undefined' ? (document.documentElement.dataset.theme ?? 'невідомо') : 'невідомо'}`,
			`ПОЗНАЧЕНО: ${marked.length} із ${BETA_CHECKS.length}`
		].join('\n');

		if (marked.length === 0) return `${head}\n\nЖодного пункта не позначено.`;
		return `${head}\n\n${marked.map((c) => this.line(c)).join('\n\n')}`;
	}

	/**
	 * Копіює звіт, і ОБОВʼЯЗКОВО має запасний шлях.
	 *
	 * `navigator.clipboard.writeText` відмовляє буденно: вкладка не у фокусі,
	 * сторінка не через https, немає дозволу. Перша версія в каноні лише писала
	 * в лог — кнопка виглядала натиснутою, а звіту не було НІДЕ, тобто вся
	 * робота тестувальника зникала на останньому кроці. Тому при відмові звіт
	 * зʼявляється текстом у полі поруч.
	 */
	async copyReport(): Promise<'copied' | 'fallback'> {
		const report = this.buildReport();
		try {
			if (!navigator.clipboard?.writeText) throw new Error('clipboard API недоступний');
			await navigator.clipboard.writeText(report);
			this.reportFallback = '';
			return 'copied';
		} catch (e) {
			console.warn('[beta] буфер обміну відмовив — показуємо звіт текстом', e);
			this.reportFallback = report;
			return 'fallback';
		}
	}
}

export const betaChecklist = new BetaChecklistState();
