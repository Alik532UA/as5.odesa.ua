<script lang="ts">
	import { ui } from '$lib/states/ui.svelte';
	import { t } from 'svelte-i18n';

	/**
	 * Випадайка діагностичних перемикачів (тип тла, блюр).
	 *
	 * ## Чому стилі тепер тут
	 *
	 * Розмітка жила в цьому файлі, а ВСІ її правила — у стилях шапки, під
	 * `:global(.header__settings-dropdown-debug …)`. Це рівно анти-патерн
	 * SVELTE-UI-v8 § 3.5: скоуп Svelte до дочірнього компонента не дістає, тож
	 * винесена розмітка лишилася без стилів, і замість того, щоб перенести
	 * правила разом із нею, їх продублювали через `:global`. Попередження про
	 * це не буває — виглядало як робочий код.
	 *
	 * Ціна була не лише в 65 рядках чужого CSS у шапці. `:global` знімає скоуп
	 * узагалі: правило `:global(.header__settings-dropdown-debug
	 * .header__settings-opt)` діяло б на будь-який елемент із цим класом де
	 * завгодно на сторінці. Тепер правила скоупні, і класи можуть мати короткі
	 * власні імена — вони більше нічому не мусять збігатися.
	 *
	 * ## Чому `isOpen` став робочим пропом
	 *
	 * Він передавався й не використовувався жодного разу: видимістю керувало
	 * правило `.header__settings.open :global(…-debug)`, тобто СТАН БАТЬКА
	 * через CSS. Проп при цьому обіцяв реактивність, якої не було, а компонент
	 * не можна було показати ніде, крім тієї конкретної шапки. Тепер відкриття
	 * виражає сам проп, і залежності від чужої розмітки не лишилося.
	 */
	let { isOpen = false }: { isOpen?: boolean } = $props();

	type BackgroundOption = {
		id: 0 | 1 | 2 | 3;
		label: () => string;
	};

	const selectDynamicBackground = (type: 0 | 1 | 2 | 3) => {
		ui.setBackgroundType(type);

		// «Немає тла» — це не четвертий тип, а вимкнений перемикач: тип і
		// прапорець живуть окремо, тому їх доводиться зводити тут.
		if (type === 0 && ui.enableDynamicBackground) ui.toggleDynamicBackground();
		if (type !== 0 && !ui.enableDynamicBackground) ui.toggleDynamicBackground();
	};

	const backgrounds: BackgroundOption[] = [
		{ id: 0, label: () => $t('settings.bgNone') },
		{ id: 1, label: () => $t('settings.bgParticles') },
		{ id: 2, label: () => $t('settings.bgWaves') },
		{ id: 3, label: () => $t('settings.bgShapes') }
	];
</script>

<div class="debug-dropdown" class:open={isOpen} data-testid="debug-settings-panel">
	<div class="debug-dropdown__group">
		<span class="debug-dropdown__label">{$t('settings.dynamicBg')}</span>
		<div class="debug-dropdown__options debug-dropdown__options--stacked">
			{#each backgrounds as bg (bg.id)}
				<button
					type="button"
					class="debug-dropdown__opt debug-dropdown__opt--wide"
					class:active={(bg.id === 0 && !ui.enableDynamicBackground) ||
						(bg.id !== 0 && ui.enableDynamicBackground && ui.backgroundType === bg.id)}
					aria-pressed={(bg.id === 0 && !ui.enableDynamicBackground) ||
						(bg.id !== 0 && ui.enableDynamicBackground && ui.backgroundType === bg.id)}
					onclick={() => selectDynamicBackground(bg.id)}
					data-testid="debug-background-{bg.id}-btn"
				>
					{bg.label()}
				</button>
			{/each}
		</div>
	</div>

	<div class="debug-dropdown__group">
		<span class="debug-dropdown__label">{$t('settings.blur')}</span>
		<div class="debug-dropdown__options">
			<button
				type="button"
				class="debug-dropdown__opt"
				class:active={!ui.enableBlurEffect}
				aria-pressed={!ui.enableBlurEffect}
				onclick={() => ui.toggleBlurEffect()}
				data-testid="debug-blur-off-btn"
			>
				{$t('settings.off')}
			</button>
			<button
				type="button"
				class="debug-dropdown__opt"
				class:active={ui.enableBlurEffect}
				aria-pressed={ui.enableBlurEffect}
				onclick={() => ui.toggleBlurEffect()}
				data-testid="debug-blur-on-btn"
			>
				{$t('settings.on')}
			</button>
		</div>
	</div>
</div>

<style>
	.debug-dropdown {
		position: absolute;
		top: calc(100% + 170px);
		right: 0;
		width: 220px;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: var(--space-md);
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		transition: all var(--transition-base);
		z-index: 329;
	}

	.debug-dropdown.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(5px);
	}

	.debug-dropdown__group {
		margin-bottom: var(--space-md);
	}

	.debug-dropdown__group:last-child {
		margin-bottom: 0;
	}

	.debug-dropdown__label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted-text);
		text-transform: uppercase;
		margin-bottom: var(--space-xs);
		letter-spacing: 0.05em;
	}

	.debug-dropdown__options {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-ice-blue);
		padding: 4px;
		border-radius: var(--radius-md);
	}

	.debug-dropdown__options--stacked {
		flex-direction: column;
	}

	.debug-dropdown__opt {
		flex: 1;
		padding: 6px;
		font-size: 0.8rem;
		font-weight: 700;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		color: var(--color-deep-ocean);
	}

	.debug-dropdown__opt--wide {
		text-align: left;
	}

	.debug-dropdown__opt:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.debug-dropdown__opt.active {
		background: var(--color-white);
		box-shadow: var(--shadow-sm);
		color: var(--color-golden);
	}
</style>
