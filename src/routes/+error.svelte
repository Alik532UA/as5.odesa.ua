<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { t } from 'svelte-i18n';

	/**
	 * ERROR-HANDLING-v8: `+error.svelte` — мінімум, який має бути завжди.
	 *
	 * Без цього файлу будь-яка адреса поза шістьма маршрутами показувала
	 * вбудовану сторінку SvelteKit: чорний текст на білому, англійською, без
	 * шапки й без способу повернутися. На GitHub Pages це ще й найчастіша
	 * сторінка з усіх непрямих — `fallback: '404.html'` віддає саме її на будь-яке
	 * биту посилання ззовні.
	 *
	 * Файл лежить у корені маршрутів, тому працює і для 404, і для помилки
	 * `load` на будь-якій сторінці.
	 */

	/**
	 * Словники svelte-i18n вантажаться асинхронно, і на 404 сторінці локаль може
	 * бути ще не готова — тоді `$t` повертає сам ключ. Показувати відвідувачу
	 * `error.notFound.title` не можна, тому кожен рядок має запасний текст.
	 */
	function safeT(key: string, fallback: string): string {
		try {
			const result = $t(key);
			return result && result !== key ? result : fallback;
		} catch {
			return fallback;
		}
	}

	const isNotFound = $derived(page.status === 404);

	const title = $derived(
		isNotFound
			? safeT('error.notFound.title', 'Сторінку не знайдено')
			: safeT('error.generic.title', 'Щось пішло не так')
	);

	const message = $derived(
		isNotFound
			? safeT('error.notFound.message', 'Такої сторінки немає. Можливо, посилання застаріло.')
			: safeT('error.generic.message', 'Сталася помилка під час завантаження сторінки.')
	);

	/**
	 * Технічний текст помилки показується лише коли він є і коли це не 404:
	 * для 404 SvelteKit кладе туди слово «Not Found», яке нічого не додає до
	 * заголовка вище.
	 */
	const detail = $derived(!isNotFound ? (page.error?.message ?? '') : '');
</script>

<svelte:head>
	<title>{page.status} — {title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="error-page">
	<div class="error-card">
		<p class="error-status">{page.status}</p>
		<h1 class="error-title">{title}</h1>
		<p class="error-message">{message}</p>
		{#if detail}
			<p class="error-detail">{detail}</p>
		{/if}

		<a class="error-home" href="{base}/">
			{safeT('nav.home', 'Головна')}
		</a>
	</div>
</main>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: var(--space-xl) var(--space-md);
	}

	.error-card {
		max-width: 34rem;
		width: 100%;
		text-align: center;
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		background: var(--theme-dynamic-card-bg);
		border: 1px solid var(--color-border);
	}

	.error-status {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 4rem;
		line-height: 1;
		color: var(--color-sea-blue);
	}

	.error-title {
		margin: var(--space-sm) 0 0;
		font-family: var(--font-heading);
		font-size: 1.5rem;
		color: var(--color-dark-text);
	}

	.error-message {
		margin: var(--space-sm) 0 0;
		color: var(--color-body-text);
	}

	.error-detail {
		margin: var(--space-sm) 0 0;
		color: var(--color-muted-text);
		font-size: 0.9rem;
		word-break: break-word;
	}

	.error-home {
		display: inline-block;
		margin-top: var(--space-lg);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
		background: var(--color-golden);
		color: var(--color-black);
		font-weight: 700;
		text-decoration: none;
		transition: background var(--transition-fast);
	}

	.error-home:hover {
		background: var(--color-golden-hover);
	}

	/* Клавіатурна навігація: єдина інтерактивна ціль сторінки мусить бути
	   помітною (ACCESSIBILITY-v8 § фокус). */
	.error-home:focus-visible {
		outline: 3px solid var(--color-sea-blue);
		outline-offset: 3px;
	}
</style>
