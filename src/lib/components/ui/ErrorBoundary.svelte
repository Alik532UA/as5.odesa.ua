<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from 'svelte-i18n';
	import { safeT } from '$lib/i18n/translate';
	import { errorLogger } from '$lib/services/errorLogger.svelte';

	/**
	 * Межа помилок рендеру (ERROR-HANDLING-v8 § 2.3).
	 *
	 * ## Чому сніпет `failed` тут обов'язковий, а не оформлення
	 *
	 * Попередня редакція цього файлу мала `onerror`, який писав помилку у
	 * власний `$state`, і показувала запасну розмітку через `{#if error}`
	 * **усередині тіла межі**. Це не працює, і мовчки: `Boundary.#handle_error`
	 * у Svelte (`internal/client/dom/blocks/boundary.js`) першою дією робить
	 * `destroy_effect(this.#main_effect)` — тобто знищує тіло межі цілком, — і
	 * рендерить на його місце `failed`, якщо той є. Сніпета не було, тож на
	 * місці вмісту не з'являлося НІЧОГО.
	 *
	 * Ціна була не косметична: цією межею `+layout.svelte` обгортає
	 * `{@render children()}`, тобто весь вміст сторінки. Будь-яка помилка
	 * рендеру давала відвідувачу порожню сторінку між шапкою й підвалом — без
	 * повідомлення, без кнопки, без сліду в консолі. Рівно та «біла сторінка»,
	 * заради якої розділ про межі й існує.
	 *
	 * ## Друга половина: помилка тепер лишає слід
	 *
	 * Обидві попередні реалізації писали `console.error` і на цьому
	 * зупинялися. `errorLogger` у проєкті є, `hooks.client.ts` уже через нього
	 * ходить — але межа його не знала, тож помилка рендеру не потрапляла ні в
	 * кеш, ні в `errorId`. Тепер потрапляє, і `name` каже, яка саме ділянка
	 * сторінки впала.
	 */
	interface Props {
		/**
		 * Діагностична назва ділянки — іде в лог, а не на екран.
		 * Відвідувачу «Помилка Hero секції» не пояснює нічого й показує нутрощі
		 * застосунку (ERROR-HANDLING-v8 § 4.1).
		 */
		name?: string;
		children: Snippet;
	}

	let { name = 'page', children }: Props = $props();

	const title = $derived(safeT($t, 'error.generic.title', 'Щось пішло не так'));
	const message = $derived(
		safeT(
			$t,
			'error.boundary.message',
			'Сталася помилка під час завантаження цієї частини сторінки.'
		)
	);
	const retryLabel = $derived(safeT($t, 'error.boundary.retry', 'Спробувати знову'));

	function report(error: unknown): void {
		errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
			component: `boundary:${name}`
		});
	}
</script>

<svelte:boundary onerror={report}>
	{@render children()}

	{#snippet failed(_error, reset)}
		<div class="error-boundary" role="alert" aria-live="assertive" data-testid="boundary-error-panel">
			<h2 class="error-boundary__title" data-testid="boundary-error-title">{title}</h2>
			<p class="error-boundary__text" data-testid="boundary-error-message">{message}</p>
			<button type="button" class="error-boundary__btn" onclick={reset} data-testid="boundary-retry-btn">
				{retryLabel}
			</button>
		</div>
	{/snippet}
</svelte:boundary>

<style>
	.error-boundary {
		margin: 1rem auto;
		padding: clamp(1rem, 4vw, 2rem);
		max-width: 40rem;
		text-align: center;
		background: var(--theme-dynamic-card-bg);
		color: var(--color-body-text);
		border: 1px solid var(--color-border);
		border-radius: 12px;
	}

	.error-boundary__title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.1rem, 2.5vw, 1.5rem);
	}

	.error-boundary__text {
		margin: 0 0 1rem;
		color: var(--color-muted-text);
	}

	.error-boundary__btn {
		/* 44×44 — мінімальна сенсорна зона (ACCESSIBILITY-v8, UI-ELEMENTS-v8 § 1). */
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem 1.25rem;
		background: var(--color-sea-blue);
		color: var(--color-white);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.error-boundary__btn:hover {
		opacity: 0.85;
	}
</style>
