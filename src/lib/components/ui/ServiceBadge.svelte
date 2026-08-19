<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { Check, Copy } from 'lucide-svelte';
	import { debugMode } from '$lib/services/debugMode.svelte';
	import { errorLogger } from '$lib/services/errorLogger.svelte';

	/**
	 * Службове табло: номер версії, лічильник помилок і збір звіту — ОДИН елемент.
	 *
	 * **Чого тут не було доти.** Логер існував і працював (`hooks.client.ts` кладе в
	 * нього кожну необроблену помилку), але забрати з нього звіт не було чим:
	 * кнопки не існувало, номера версії на екрані не існувало, і `getCache()` міг
	 * прочитати лише той, хто відкрив DevTools і знав назву сервісу. Тобто
	 * діагностика писалася для розробника, який і без неї бачить консоль.
	 *
	 * **Форма змінюється, місце — ні.** У спокої це капсула з номером версії; коли
	 * є помилки — червоний кружок із їхньою кількістю; після копіювання — галочка.
	 *
	 * **Видимість (DEBUGGING-v8 § 2.1, із відхиленням).** У dev табло видиме
	 * ЗАВЖДИ, а не лише за наявності помилок: воно несе номер версії, а його ховати
	 * нема сенсу — саме в dev він і потрібен. У проді табло приховане, доки не
	 * ввімкнено debug-режим.
	 *
	 * **Два входи, і вони навмисно різні за природою.** `?debug=1` в адресі працює
	 * на дотику й пересилається посиланням; серія натискань `V` — для того, хто вже
	 * за клавіатурою, і вона зберігається між сеансами. На телефоні серія
	 * недосяжна, і саме тому адресний параметр лишається.
	 *
	 * **Жести живуть у шапці, а не тут** — бо в проді цей компонент не
	 * відмальований, доки жест не спрацював, тож слухач усередині нього не міг би
	 * дочекатися жесту, який його ж і показує.
	 */
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	/*
	 * `browser &&` обовʼязковий: усі сторінки тут пререндеряться, а під час
	 * пререндеру звернення до `page.url.searchParams` кидає й валить збірку.
	 */
	const urlDebug = $derived(browser && page.url.searchParams.get('debug') === '1');
	/*
	 * `?debug=1` діє ПОВЕРХ збереженого стану: посилання з ним мусить показати
	 * табло навіть тому, хто раніше сховав його серією натискань. Інакше єдиний
	 * досяжний на дотику шлях можна було б заблокувати назавжди.
	 */
	const isVisible = $derived(urlDebug || debugMode.enabled);

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	async function copyReport() {
		try {
			await navigator.clipboard.writeText(errorLogger.getReport());
			copied = true;
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			/*
			 * `console.warn`, а не `errorLogger.logError`: рівень «помилка» тут крутив би
			 * рівно той лічильник, який малює ця сама кнопка — невдала спроба скопіювати
			 * звіт створювала б привід показати кнопку копіювання звіту. А відмова буфера
			 * обміну взагалі не збій застосунку: поза HTTPS і без дозволу вона очікувана
			 * (ERROR-HANDLING-v8 § 1.4).
			 */
			console.warn('[ServiceBadge] не вдалося скопіювати звіт', error);
		}
	}
</script>

{#if isVisible}
	<button
		type="button"
		class="badge"
		class:badge--has-errors={errorLogger.errorCount > 0}
		class:badge--copied={copied}
		onclick={copyReport}
		aria-label={`Копіювати звіт / Copy report — ${errorLogger.appVersion}`}
		data-testid="app-version-value"
	>
		<!-- Номер версії — поза гілками: лічильник ДОДАЄТЬСЯ до нього, а не заміняє
		     його. Інакше на dev, де помилка буває майже завжди, версії не видно. -->
		{#if copied}
			<Check size={14} class="badge__hint" />
		{:else if errorLogger.errorCount > 0}
			<span class="badge__count"
				>{errorLogger.errorCount > 99 ? '99+' : errorLogger.errorCount}</span
			>
		{:else}
			<Copy size={12} class="badge__hint" />
		{/if}
		<span class="badge__version">{errorLogger.appVersion}</span>
	</button>
{/if}

<style>
	.badge {
		position: fixed;
		bottom: 16px;
		left: 16px;
		z-index: 9999;

		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;

		/* Капсула: номер версії в коло 32px не влазить. */
		min-height: 32px;
		padding: 0 8px;
		border-radius: 16px;

		background: var(--theme-dynamic-surface-bg);
		color: var(--color-body-text);
		border: 2px solid var(--color-border);
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: transform 0.2s ease;
	}

	.badge:hover {
		transform: scale(1.05);
	}

	.badge__version {
		font-size: 10px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		line-height: 1;
		/* Номер читає той, хто дивиться на скріншот, тож він не має «розсипатися». */
		white-space: nowrap;
	}

	/*
	 * Іконка копіювання — підказка, що капсула клікабельна, а не окрема дія. Тому
	 * вона дрібніша за номер і тане: головне тут число версії.
	 */
	.badge :global(.badge__hint) {
		opacity: 0.6;
		flex: none;
	}

	/*
	 * Форма НЕ змінюється між станами: капсула лишається капсулою, бо номер версії
	 * лишається на місці. Доти помилки перетворювали табло на кружок 32px — зникала не
	 * лише версія, а й упізнаваність елемента.
	 */

	/*
	 * Кольори сигналу — літерали, а не токени теми, свідомо: «є помилки» мусить
	 * виглядати однаково і в світлій, і в темній темі. Червоний темніший за
	 * звичний #ef4444 за WCAG AA: білий текст на ньому дає 5.46:1 замість 3.76:1,
	 * а цю плашку читають саме тоді, коли щось пішло не так.
	 */
	.badge--has-errors {
		background: #c92a2a;
		color: #ffffff;
		border-color: #7f1d1d;
	}

	.badge--copied {
		background: #237a35;
		color: #ffffff;
		border-color: #1b5e20;
	}

	/*
	 * Лічильник — плашка ПЕРЕД номером, а не текст замість нього. Темніший червоний за
	 * тло капсули (#7f1d1d на #c92a2a): білий текст дає на ньому 10:1.
	 */
	.badge__count {
		font-weight: 700;
		font-size: 0.75rem;
		line-height: 1;
		padding: 2px 5px;
		border-radius: 8px;
		background: #7f1d1d;
		color: #ffffff;
	}

	/*
	 * Розмір залежить від СПОСОБУ ВВЕДЕННЯ, а не від ширини вікна: на десктопі
	 * 700px кнопка лишалася б маленькою для миші, а на планшеті 1024px — маленькою
	 * для дотику (ACCESSIBILITY-v8 § 8, DEBUGGING-v8 § 2.2).
	 */
	@media (hover: none) {
		.badge {
			min-height: 44px;
			padding: 0 12px;
			border-radius: 22px;
		}

		.badge__version {
			font-size: 12px;
		}
	}
</style>
