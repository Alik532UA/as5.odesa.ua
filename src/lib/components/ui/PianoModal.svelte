<script lang="ts">
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { SvelteSet } from "svelte/reactivity";
	import { t } from "svelte-i18n";
	import { PIANO_KEYS, pianoSoundUrl } from "$lib/config/piano";

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let nowPlaying = $state("");
	// SvelteSet, а не `$state(new Set())`: `$state` проксює лише звичайні
	// обʼєкти й масиви, Set повертається як був (перевірено — `$state(new Set())`
	// строго дорівнює вихідному, `$state({})` ні). Тобто `add`/`delete` нижче
	// не сповіщали нікого, і клас `playing` не зʼявлявся ЖОДНОГО разу: ноти
	// грали, підсвітка — ні (SVELTE-CORE-v8 § 1.5).
	const activeKeys = new SvelteSet<number>();

	function playNote(keyCode: number) {
		const keyInfo = PIANO_KEYS.find((k) => k.keyCode === keyCode);
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
		// Escape: без нього виходом лишався лише клік по тлу, тобто з
		// клавіатури модалку не закрити взагалі (ACCESSIBILITY-v8).
		if (e.key === "Escape") {
			onClose();
			return;
		}
		playNote(e.keyCode);
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});
</script>

{#if isOpen}
	<!-- Ігнорування з причиною (ACCESSIBILITY-v8): це тло модалки, і клік по
	     ньому лише ДУБЛЮЄ закриття. З клавіатури є Escape і кнопка нижче;
	     робити тло фокусованим означало б додати в таб-порядок елемент, який
	     нічого не озвучує. -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="piano-modal" role="dialog" aria-modal="true" tabindex="-1" aria-label={$t("piano.title")} transition:fade={{ duration: 300 }} onclick={(e) => e.target === e.currentTarget && onClose()}>
		<button class="close-btn" type="button" aria-label={$t("piano.close")} onclick={onClose}>&times;</button>
		
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
					{#each PIANO_KEYS as key (key.keyCode)}
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

				{#each PIANO_KEYS as key (key.keyCode)}
					<audio data-key={key.keyCode} src={pianoSoundUrl(key.keyCode)}></audio>
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
		animation: modalSlideIn 0.3s ease-out;
	}

	@keyframes modalSlideIn {
		from {
			transform: scale(0.95) translateY(-20px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
	}

	.note-name {
		min-width: 300px;
		text-align: right;
	}

	.note-symbol {
		min-width: 150px;
		text-align: left;
	}

	.note-divider {
		color: rgba(255, 255, 255, 0.3);
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
				width: 90vh; /* Increased slightly */
				height: 95vw; /* Increased slightly */
				transform: rotate(90deg);
				position: absolute;
				top: 50%;
				left: 50%;
				translate: -50% -50%;
				padding: 0;
			}
			.keys {
				height: 60vw; /* More space for keys */
				margin-top: 10px;
			}
			.nowplaying {
				min-height: 40px;
				font-size: 40px;
				gap: 10px;
			}
			.note-name { min-width: 120px; }
			.note-symbol { min-width: 60px; }
		}

		/* Standard mobile landscape */
		@media (orientation: landscape) {
			#wrap {
				max-width: 100%;
				padding: 5px;
			}
			.keys {
				height: 200px; /* Slightly taller keys */
			}
			.nowplaying {
				min-height: 40px;
				font-size: 30px;
				gap: 10px;
			}
			.note-name { min-width: 100px; }
			.note-symbol { min-width: 50px; }
		}

		.key.sharp {
			height: 55%;
		}
	}
</style>
