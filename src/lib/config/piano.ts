/**
 * Розкладка віртуального піаніно: дані, а не логіка.
 *
 * Винесено з `components/ui/PianoModal.svelte` (PROJECT-STRUCTURE-v8 § 4.1,
 * § 7): у компоненті лишається розмітка й обробники, а сімнадцять клавіш і
 * таблиця файлів — константи, які не змінюються від стану.
 *
 * `keyCode` замість `key` — навмисно: розкладка прив'язана до ФІЗИЧНОЇ позиції
 * клавіші, тож користувач з українською розкладкою натискає ту саму клавішу, що
 * й з англійською, і чує ту саму ноту. `event.key` дав би «ф» замість «a».
 */
export interface PianoKey {
	keyCode: number;
	note: string;
	/** Підпис на клавіші — латинська літера, яку на ній надруковано. */
	hint: string;
	sharp: boolean;
}

export const PIANO_KEYS: readonly PianoKey[] = [
	{ keyCode: 65, note: 'C', hint: 'A', sharp: false },
	{ keyCode: 87, note: 'C#', hint: 'W', sharp: true },
	{ keyCode: 83, note: 'D', hint: 'S', sharp: false },
	{ keyCode: 69, note: 'D#', hint: 'E', sharp: true },
	{ keyCode: 68, note: 'E', hint: 'D', sharp: false },
	{ keyCode: 70, note: 'F', hint: 'F', sharp: false },
	{ keyCode: 84, note: 'F#', hint: 'T', sharp: true },
	{ keyCode: 71, note: 'G', hint: 'G', sharp: false },
	{ keyCode: 89, note: 'G#', hint: 'Y', sharp: true },
	{ keyCode: 72, note: 'A', hint: 'H', sharp: false },
	{ keyCode: 85, note: 'A#', hint: 'U', sharp: true },
	{ keyCode: 74, note: 'B', hint: 'J', sharp: false },
	{ keyCode: 75, note: 'C', hint: 'K', sharp: false },
	{ keyCode: 79, note: 'C#', hint: 'O', sharp: true },
	{ keyCode: 76, note: 'D', hint: 'L', sharp: false },
	{ keyCode: 80, note: 'D#', hint: 'P', sharp: true },
	{ keyCode: 186, note: 'E', hint: ';', sharp: false }
];

/**
 * Хост звуків — сторонній демо-сайт, і це відоме слабке місце: файли можуть
 * зникнути будь-коли, а CSP через них тримає окремий запис у `media-src`
 * (`svelte.config.js`). Правильне рішення — перенести `.wav` у `static/audio/`;
 * тоді і константа, і директива згорнуться до власного походження.
 */
const SOUNDS_ORIGIN = 'https://carolinegabriel.com/demo/js-keyboard/sounds';

/** Номер файлу для кожної клавіші: 040…056 у порядку розкладки вище. */
const SOUND_FILE: Record<number, string> = {
	65: '040', 87: '041', 83: '042', 69: '043', 68: '044', 70: '045',
	84: '046', 71: '047', 89: '048', 72: '049', 85: '050', 74: '051',
	75: '052', 79: '053', 76: '054', 80: '055', 186: '056'
};

export function pianoSoundUrl(keyCode: number): string {
	return `${SOUNDS_ORIGIN}/${SOUND_FILE[keyCode]}.wav`;
}
