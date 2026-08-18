import { SvelteSet } from 'svelte/reactivity';
import { PIANO_KEYS } from '$lib/config/piano';

/**
 * Стан віртуального піаніно (SVELTE-CORE-v8 § 2: логіка — у класі-контролері,
 * а не в `.svelte`).
 *
 * Раніше все це жило в `PianoModal.svelte`: і поточна нота, і набір
 * натиснутих клавіш, і пошук `<audio>`. Компонент від того був за межею
 * розміру § 7, а перевірити поведінку не було як — `.svelte` у тестах не
 * компілюється.
 *
 * Клас створюється компонентом (`new PianoState()`), а не живе синглтоном:
 * піаніно існує лише поки відкрита модалка, і два одночасні екземпляри
 * ділили б `nowPlaying`.
 */
export class PianoState {
	/** Символ ноти, яку щойно взяли. Порожній рядок — тиша. */
	nowPlaying = $state('');

	/**
	 * `SvelteSet`, а не `$state(new Set())`: `$state` проксює лише звичайні
	 * обʼєкти й масиви, `Set` повертається як був (перевірено — `$state(new
	 * Set())` строго дорівнює вихідному, `$state({})` ні). Тобто `add`/`delete`
	 * не сповіщали нікого, і клас `playing` не зʼявлявся ЖОДНОГО разу: ноти
	 * грали, підсвітка — ні (SVELTE-CORE-v8 § 1.5).
	 */
	readonly activeKeys = new SvelteSet<number>();

	/** Скільки клавіша лишається підсвіченою після натискання, мс. */
	private static readonly HIGHLIGHT_MS = 100;

	/**
	 * Бере ноту за кодом фізичної клавіші. Повертає `false`, якщо такої
	 * клавіші на розкладці немає — тоді натискання просто ігнорується.
	 */
	press(keyCode: number): boolean {
		const keyInfo = PIANO_KEYS.find((k) => k.keyCode === keyCode);
		if (!keyInfo) return false;

		const audio = document.querySelector<HTMLAudioElement>(`audio[data-key="${keyCode}"]`);
		if (!audio) return false;

		this.nowPlaying = keyInfo.note;
		this.activeKeys.add(keyCode);

		audio.currentTime = 0;
		// `play()` віддає проміс, і він ВІДХИЛЯЄТЬСЯ буденно: політика
		// автовідтворення, зниклий файл на чужому хості, звук, вимкнений
		// системою. Без обробки це неперехоплене відхилення в консолі
		// відвідувача (ERROR-HANDLING-v8 § 1.4). Рівень `warn`, а не `error`:
		// беззвучна клавіша — очікуваний стан, а не порушений інваріант.
		audio.play().catch((e) => console.warn('[piano] звук не відтворився', e));

		setTimeout(() => this.activeKeys.delete(keyCode), PianoState.HIGHLIGHT_MS);
		return true;
	}
}
