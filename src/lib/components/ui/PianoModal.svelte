<script lang="ts">
	import { onMount } from "svelte";
	import { t } from "svelte-i18n";

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let nowPlaying = $state("");
	let activeKeys = $state<Set<number>>(new Set());

	const keysData = [
		{ keyCode: 65, note: "C", hint: "A", sharp: false },
		{ keyCode: 87, note: "C#", hint: "W", sharp: true },
		{ keyCode: 83, note: "D", hint: "S", sharp: false },
		{ keyCode: 69, note: "D#", hint: "E", sharp: true },
		{ keyCode: 68, note: "E", hint: "D", sharp: false },
		{ keyCode: 70, note: "F", hint: "F", sharp: false },
		{ keyCode: 84, note: "F#", hint: "T", sharp: true },
		{ keyCode: 71, note: "G", hint: "G", sharp: false },
		{ keyCode: 89, note: "G#", hint: "Y", sharp: true },
		{ keyCode: 72, note: "A", hint: "H", sharp: false },
		{ keyCode: 85, note: "A#", hint: "U", sharp: true },
		{ keyCode: 74, note: "B", hint: "J", sharp: false },
		{ keyCode: 75, note: "C", hint: "K", sharp: false },
		{ keyCode: 79, note: "C#", hint: "O", sharp: true },
		{ keyCode: 76, note: "D", hint: "L", sharp: false },
		{ keyCode: 80, note: "D#", hint: "P", sharp: true },
		{ keyCode: 186, note: "E", hint: ";", sharp: false },
	];

	function getAudioSrc(keyCode: number) {
		const mapping: Record<number, string> = {
			65: "040", 87: "041", 83: "042", 69: "043", 68: "044", 70: "045",
			84: "046", 71: "047", 89: "048", 72: "049", 85: "050", 74: "051",
			75: "052", 79: "053", 76: "054", 80: "055", 186: "056"
		};
		return `https://carolinegabriel.com/demo/js-keyboard/sounds/${mapping[keyCode]}.wav`;
	}

	function playNote(keyCode: number) {
		const keyInfo = keysData.find(k => k.keyCode === keyCode);
		if (!keyInfo) return;

		const audio = document.querySelector(`audio[data-key="${keyCode}"]`) as HTMLAudioElement;
		if (!audio) return;

		nowPlaying = keyInfo.note;
		activeKeys.add(keyCode);
		
		audio.currentTime = 0;
		audio.play();

		setTimeout(() => {
			activeKeys.delete(keyCode);
		}, 100);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		playNote(e.keyCode);
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="piano-modal" onclick={(e) => e.target === e.currentTarget && onClose()}>
		<button class="close-btn" onclick={onClose}>&times;</button>
		
		<section id="wrap">
			<header>
				<h2 class="piano-hint">{$t("piano.hint")}</h2>
			</header>
			<section id="main">
				<div class="nowplaying">
					{#if nowPlaying}
						<span class="note-name">{$t(`piano.notes.${nowPlaying}`)}</span>
						<span class="note-divider">|</span>
						<span class="note-symbol">{nowPlaying}</span>
					{/if}
				</div>
				<div class="keys">
					{#each keysData as key}
						<div 
							class="key" 
							class:sharp={key.sharp} 
							class:playing={activeKeys.has(key.keyCode)}
							data-key={key.keyCode} 
							data-note={key.note}
							onclick={() => playNote(key.keyCode)}
						>
							<span class="hints">{key.hint}</span>
						</div>
					{/each}
				</div>

				{#each keysData as key}
					<audio data-key={key.keyCode} src={getAudioSrc(key.keyCode)}></audio>
				{/each}
			</section>
		</section>
	</div>
{/if}

<style>
	.piano-modal {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		font-family: var(--font-main);
		-webkit-font-smoothing: antialiased;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.close-btn {
		position: absolute;
		top: 20px;
		right: 30px;
		background: none;
		border: none;
		color: white;
		font-size: 3rem;
		cursor: pointer;
		z-index: 10001;
		line-height: 1;
		transition: transform 0.2s;
	}

	.close-btn:hover {
		transform: scale(1.1);
	}

	#wrap {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 1200px;
		padding: 20px;
		transition: all 0.3s ease;
	}

	header {
		position: relative;
		margin: 30px 0;
	}

	h2 {
		color: #fff;
		font-size: clamp(16px, 3vw, 24px);
		font-style: italic;
		font-weight: 400;
		margin: 0 0 30px;
		font-family: var(--font-main);
	}

	.nowplaying {
		font-size: clamp(60px, 10vw, 120px);
		line-height: 1;
		color: #eee;
		transition: all .07s ease;
		min-height: 120px;
	}

	.keys {
		display: block;
		width: 100%;
		height: 350px;
		max-width: 880px;
		position: relative;
		margin: 40px auto 0;
	}

	.key {
		position: relative;
		border: 4px solid black;
		border-radius: .5rem;
		transition: all .07s ease;
		display: block;
		box-sizing: border-box;
		z-index: 2;
		cursor: pointer;
	}

	.key:not(.sharp) {
		float: left;
		width: 10%;
		height: 100%;
		background: rgba(255, 255, 255, .8);    
	}

	.key.sharp {
		position: absolute;
		width: 6%;
		height: 60%;
		background: #000;
		color: #eee;
		top: 0;
		z-index: 3;
	}

	.key[data-key="87"] { left: 7%; }
	.key[data-key="69"] { left: 17%; }
	.key[data-key="84"] { left: 37%; }
	.key[data-key="89"] { left: 47%; }
	.key[data-key="85"] { left: 57%; }
	.key[data-key="79"] { left: 77%; }
	.key[data-key="80"] { left: 87%; }

	.playing {
		transform: scale(.95);
		border-color: #028ae9;
		box-shadow: 0 0 1rem #028ae9;
		background: #028ae9 !important;
	}

	.hints {
		display: block;
		width: 100%;
		opacity: 0;
		position: absolute;
		bottom: 7px;
		transition: opacity .3s ease-out;
		font-size: 20px;
		pointer-events: none;
		color: #000;
		font-weight: 700;
	}

	.key.sharp .hints {
		color: #fff;
	}

	.keys:hover .hints {
		opacity: 1;
	}

	/* --- MOBILE OPTIMIZATIONS --- */
	@media (max-width: 768px) {
		.piano-hint, .hints {
			display: none !important;
		}

		/* If in portrait mode, rotate to simulate landscape */
		@media (orientation: portrait) {
			#wrap {
				width: 85vh; /* Viewport height becomes the width */
				height: 90vw; /* Viewport width becomes the height */
				transform: rotate(90deg);
				position: absolute;
				top: 50%;
				left: 50%;
				translate: -50% -50%;
				padding: 0;
			}
			.keys {
				height: 50vw; /* Using vw because container is rotated */
				margin-top: 20px;
			}
			.nowplaying {
				min-height: 80px;
				font-size: 80px;
			}
		}

		/* Standard mobile landscape */
		@media (orientation: landscape) {
			#wrap {
				max-width: 100%;
				padding: 10px;
			}
			.keys {
				height: 180px;
			}
			.nowplaying {
				min-height: 60px;
				font-size: 60px;
			}
		}

		.key.sharp {
			height: 55%;
		}
	}
</style>
